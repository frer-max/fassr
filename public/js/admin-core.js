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
        // Just re-highlight sidebar based on new URL
        highlightSidebar();
        return;
    }
    
    // First Load (Full Refresh)
    window.adminApp.isSPA = true;
    checkLogin();
    setupAdminNavigation();
    
    // Load sidebar and start persistent badge updates
    await loadSidebar();
    highlightSidebar();
    
    // Hide Loader (Initial Load) - Wait until data is fetched
    const loader = document.getElementById('pageLoader');
    if (loader) {
        const hideLoader = () => {
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    loader.classList.remove('active');
                }, 400);
            }, 300); // Small breathe time
        };

        // If data is already loaded or we wait for it
        const timeout = setTimeout(hideLoader, 3000); // Safe limit
        document.addEventListener('data-ready', () => {
            clearTimeout(timeout);
            hideLoader();
        }, { once: true });
    }
    
    // Listen for browser back/forward buttons
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
 * Smart Navigation: Fetch content via AJAX and swap without reload
 */
/**
 * Smart Navigation: Refined Gradient Ring Transition
 * A beautiful, light ring spins around the brand name during transition.
 */
/**
 * Smart Navigation: Refined Gradient Ring Transition
 * Shows animation then performs a HARD navigation to ensure fresh scripts/state.
 */
async function spaNavigate(url, pushState = true) {
    if (window.location.pathname.endsWith(url)) return;

    // 1. Get/Create Overlay
    let overlay = document.querySelector('.transition-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'transition-overlay';
        
        // Get Brand Name
        const brand = document.querySelector('.sidebar-brand h2') || { innerText: 'مطعمي' };
        const name = brand.innerText;
        
        overlay.innerHTML = `
            <div class="transition-content">
                <div class="transition-ring"></div>
                <div class="transition-text">${name}</div>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        const brand = document.querySelector('.sidebar-brand h2') || { innerText: 'مطعمي' };
        const textEl = overlay.querySelector('.transition-text');
        if (textEl) textEl.innerText = brand.innerText;
    }

    // 2. Fade In (Fast & Light)
    overlay.classList.add('active');

    // Wait for fade in (300ms) - Feels snappy
    await new Promise(r => setTimeout(r, 300));

    // 3. HARD NAVIGATION (Fixes stale script issues)
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
 * Detects and injects new CSS files from the fetched page
 */
function injectMissingStyles(doc) {
    return new Promise((resolve) => {
        const newLinks = doc.querySelectorAll('link[rel="stylesheet"]');
        const currentLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.getAttribute('href'));
        
        const loadPromises = [];

        newLinks.forEach(link => {
            const href = link.getAttribute('href');
            // If stylesheet is not present, add it
            if (href && !currentLinks.some(current => current.includes(href))) {
                const newLink = document.createElement('link');
                newLink.rel = 'stylesheet';
                newLink.href = href;
                
                // Add promise to wait for loading (optional but smoother)
                const p = new Promise(r => {
                    newLink.onload = r;
                    newLink.onerror = r; // Proceed anyway on error
                });
                loadPromises.push(p);
                
                document.head.appendChild(newLink);
            }
        });

        // Resolve when new critical CSS is loaded (timeout 500ms to avoid hanging)
        if (loadPromises.length > 0) {
            Promise.all(loadPromises).finally(resolve);
            setTimeout(resolve, 500);
        } else {
            resolve();
        }
    });
}

/**
 * Re-injects a script to ensure it executes in the new DOM context.
 * Fetches the script content and wraps it in a block scope to prevent
 * "Identifier has already been declared" errors for let/const variables
 * when re-loading the same script (e.g. Dashboard -> Orders -> Dashboard).
 */
function reInjectScript(src) {
    return new Promise(async (resolve) => {
        // Remove existing script if it exists to avoid duplicate tags (optional)
        const oldScript = document.querySelector(`script[src="${src}"]`);
        if (oldScript) oldScript.remove();

        try {
            const response = await fetch(src);
            const text = await response.text();
            
            const script = document.createElement('script');
            // Wrap in block scope to protect user's variables
            script.textContent = `
                {
                    // Block Scope Sandbox for ${src}
                    ${text}
                }
                //# sourceURL=${src}
            `;
            
            document.body.appendChild(script);
            // resolve immediately after append
            resolve();
            
        } catch (e) {
            console.error('Failed to reload script:', src, e);
            resolve();
        }
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

    // Persistent interval (stored in badgeInterval, NOT intervals array)
    window.adminApp.badgeInterval = setInterval(async () => {
        // Only refresh if we are NOT on a high-traffic page that does its own polling
        const isHighTrafficPage = window.location.pathname.includes('admin-orders.html') || 
                                 window.location.pathname.includes('admin-dashboard.html');
        if (!isHighTrafficPage && typeof refreshOrders === 'function') {
            await refreshOrders();
        }
    }, 30000);
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

