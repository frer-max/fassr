// Global state for navigation
window.adminApp = window.adminApp || {
    isSPA: false,
    intervals: [],      // Page-specific intervals (cleared on nav)
    badgeInterval: null // Persistent interval for sidebar
};

document.addEventListener('DOMContentLoaded', async () => {
    // If we are in SPA mode (re-triggered manually), skip core init
    if (window.adminApp.isSPA) {
        checkLogin();
        highlightSidebar();
        // Reveal immediately if SPA re-init
        requestAnimationFrame(() => document.body.classList.add('loaded'));
        return;
    }
    
    // First Load (Full Refresh)
    window.adminApp.isSPA = true;
    checkLogin();
    setupAdminNavigation();
    
    await loadSidebar();
    highlightSidebar();
    
    // Reveal Page Logic
    const revealPage = () => {
         // Tiny delay to ensure paint
         setTimeout(() => document.body.classList.add('loaded'), 100);
    };

    window.revealPage = revealPage;

    // Check Data State
    if (typeof getOrders === 'function' && getOrders().length > 0) {
         revealPage();
    } else {
        const timeout = setTimeout(revealPage, 2500); 
        document.addEventListener('data-ready', () => {
             clearTimeout(timeout);
             revealPage();
        }, { once: true });
    }
    
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.url) {
            spaNavigate(event.state.url, false);
        }
    });
});

/**
 * Navigation interceptors
 */
function setupAdminNavigation() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-spa-link]');
        if (target) {
            e.preventDefault();
            const url = target.getAttribute('data-spa-link');
            spaNavigate(url);
        }
    });
}

/**
 * Smart Navigation: CSS Curtain Strategy
 * Removes 'loaded' class -> CSS shows curtain -> Wait -> Navigate
 */
async function spaNavigate(url, pushState = true) {
    if (window.location.pathname.endsWith(url) && !url.includes('#')) return;

    // 1. Trigger Exit (Show Curtain)
    document.body.classList.remove('loaded');

    // 2. Wait for fade in of curtain (300ms)
    await new Promise(r => setTimeout(r, 300));

    // 3. Navigate
    window.location.href = url;
}

/**
 * Loads an external script dynamically
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = resolve; // Continue even if fails to avoid blocking
        document.body.appendChild(script);
    });
}

/**
 * Cleanup timers and events from previous page
 */
function cleanupPage() {
    // Clear page-specific intervals
    if (window.adminApp && window.adminApp.intervals) {
        window.adminApp.intervals.forEach(clearInterval);
        window.adminApp.intervals = [];
    }
    
    // Clear known intervals like dashboard polling
    if (window.ordersPollInterval) {
        clearInterval(window.ordersPollInterval);
        window.ordersPollInterval = null;
    }

    // Clean up ChartJS instances if they exist
    if (typeof Chart !== 'undefined') {
        Object.values(Chart.instances).forEach(chart => chart.destroy());
    }
}

/**
 * Enhanced Sidebar Loading with Caching
 * This runs ONLY ONCE on full page load.
 */
async function loadSidebar() {
    const container = document.getElementById('sidebar-container');
    if (!container) return;
    
    // Check if already loaded by sidebar-loader.js
    if (container.getAttribute('data-loaded') === 'true') {
        startPersistentBadgeUpdates();
        // Still fetch to check for updates (silent re-validation)
        try {
             // 1. Try Cache First (Instant) - already done by loader, but good for consistent state access
            const cachedHtml = sessionStorage.getItem('adminSidebarCache');
            
            const response = await fetch('admin-sidebar.html');
            const html = await response.text();
            
            // 2. Only update if changed
            if (html !== cachedHtml) {
                container.innerHTML = html;
                sessionStorage.setItem('adminSidebarCache', html);
                startPersistentBadgeUpdates();
                
                 // Re-highlight since we replaced content
                highlightSidebar();
            }
        } catch (e) { console.error('Silent sidebar validation failed', e); }
        
        window.dispatchEvent(new Event('sidebar-loaded'));
        return;
    }

    // --- Fallback for first load (if loader script didn't run or cache was empty) ---
    
    // 1. Try Cache First (Instant)
    const cachedHtml = sessionStorage.getItem('adminSidebarCache');
    if (cachedHtml) {
        container.innerHTML = cachedHtml;
        startPersistentBadgeUpdates();
    }
    
    try {
        const response = await fetch('admin-sidebar.html');
        const html = await response.text();
        
        // 2. Only update if changed or no cache
        if (html !== cachedHtml) {
            container.innerHTML = html;
            sessionStorage.setItem('adminSidebarCache', html);
            // Ensure badge updates logic is running (it handles duplication internally)
            startPersistentBadgeUpdates();
        }
        
        // Dispatch event so other scripts know sidebar is ready (layout stable)
        window.dispatchEvent(new Event('sidebar-loaded'));
    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

/**
 * Starts badge updates using a global interval that survives SPA navigation
 */
function startPersistentBadgeUpdates() {
    // If already running, do nothing
    if (window.adminApp.badgeInterval) return;

    const updateBadges = () => {
        if (typeof getOrders !== 'function') return;
        
        const orders = getOrders();
        // Active Tasks
        const activeOrdersCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
        
        const oBadge = document.getElementById('newOrdersBadge');
        if (oBadge) {
            if (activeOrdersCount > 0) {
                oBadge.textContent = activeOrdersCount;
                oBadge.style.display = 'inline-block';
                oBadge.classList.add('pulse-animation');
            } else {
                oBadge.style.display = 'none';
            }
        }

        // Ratings Badge
        const ratedOrders = orders.filter(o => o.rating > 0);
        if (ratedOrders.length > 0) {
            // Check for unread ratings using backend status
            const newRatings = ratedOrders.filter(o => o.ratingSeen === false);
            
            const rBadge = document.getElementById('newRatingsBadge');
            if (rBadge) {
                if (newRatings.length > 0) {
                    rBadge.textContent = newRatings.length;
                    rBadge.style.display = 'inline-block';
                    rBadge.classList.add('pulse-animation');
                } else {
                    rBadge.style.display = 'none';
                }
            }
        }
    };

    updateBadges();
    
    // Listen for data updates
    document.addEventListener('orders-updated', updateBadges);
    document.addEventListener('data-ready', updateBadges);
    
    // Initial data fetch check
    setTimeout(async () => {
        if (typeof getOrders === 'function' && getOrders().length === 0) {
            if (typeof refreshOrders === 'function') {
                await refreshOrders();
            }
        }
    }, 500);

    // Persistent interval
    window.adminApp.badgeInterval = 1; // Mark as running to avoid duplicates, actual updates are event-driven
}

function checkLogin() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    const isLoginPage = window.location.href.includes('admin-login.html');
    
    if (!isLoggedIn && !isLoginPage) {
        window.location.replace('admin-login.html');
    } else if (isLoggedIn && isLoginPage) {
        window.location.replace('admin-dashboard.html');
    }
}

function handleLogout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        sessionStorage.removeItem('adminLoggedIn');
        window.location.href = 'admin-login.html';
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function highlightSidebar() {
    const path = window.location.pathname;
    const navItems = {
        'admin-dashboard.html': 'nav-dashboard',
        'admin-orders.html': 'nav-orders',
        'admin-meals.html': 'nav-meals',
        'admin-categories.html': 'nav-categories',
        'admin-ratings.html': 'nav-ratings',
        'admin-settings.html': 'nav-settings'
    };
    
    if (path.endsWith('admin.html')) {
        const el = document.getElementById('nav-dashboard');
        if (el) {
             document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
             el.classList.add('active');
        }
        return;
    }

    const currentPage = Object.keys(navItems).find(key => path.includes(key));
    if (currentPage) {
        const id = navItems[currentPage];
        const el = document.getElementById(id);
        if (el) {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');
        }
    }
}

window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.status === 401) {
        sessionStorage.removeItem('adminLoggedIn');
        window.location.href = 'admin-login.html';
    }
});
