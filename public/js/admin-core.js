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
async function spaNavigate(url, pushState = true) {
    if (window.location.pathname.endsWith(url)) return;
    
    const loader = document.getElementById('pageLoader');
    if (loader) {
        loader.classList.add('active');
        loader.style.display = 'flex';
        loader.style.opacity = '1';
    }

    try {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 1. Cleanup old page (intervals, charts)
        cleanupPage();

        // 2. Update Title
        document.title = doc.title;

        // 3. Update URL
        if (pushState) {
            history.pushState({ url }, doc.title, url);
        }

        // 4. Swap Content
        const newMainContent = doc.querySelector('.main-content');
        const currentMainContent = document.querySelector('.main-content');
        
        if (newMainContent && currentMainContent) {
            currentMainContent.innerHTML = newMainContent.innerHTML;
            window.scrollTo(0, 0);
        } else {
            // Fallback: If structure doesn't match (e.g. login page, error), force full reload
            window.location.href = url;
            return;
        }

        // 5. Swap Modals
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        doc.querySelectorAll('.modal-overlay').forEach(m => {
            document.body.appendChild(m);
        });

        // 6. Highlight active sidebar item
        highlightSidebar();

        // 7. Load and Execute Page-Specific Scripts
        const scripts = doc.querySelectorAll('script');
        for (const script of scripts) {
            if (script.src && script.src.includes('admin-') && !script.src.includes('admin-core.js')) {
                await reInjectScript(script.src);
            } else if (!script.src && script.innerText.trim().length > 0) {
                const newScript = document.createElement('script');
                newScript.innerText = script.innerText;
                document.body.appendChild(newScript);
            }
        }
        
        // Trigger init for new scripts
        document.dispatchEvent(new Event('DOMContentLoaded'));

        // 8. Update timestamps or other core UI elements
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle && doc.getElementById('pageTitle')) {
            pageTitle.innerText = doc.getElementById('pageTitle').innerText;
        }

        // 9. Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');

    } catch (error) {
        console.error('Navigation error:', error);
        window.location.href = url;
    } finally {
        setTimeout(() => {
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    loader.classList.remove('active');
                }, 400);
            }
        }, 300);
    }
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
            
            // Dispatch event for this specific script execution
            // (In addition to the main one later, but immediate dispatch is safer for inline timing)
            // Actually, we dispatch DOMContentLoaded once after ALL scripts are processed in spaNavigate.
            // But some scripts might rely on immediate execution. 
            // The textContent injection executes IMMEDIATELY upon appendChild.
            
        } catch (e) {
            console.error('Failed to reload script:', src, e);
        }
        resolve();
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
            const seenIds = (() => {
                try { return JSON.parse(localStorage.getItem('seenRatingIds') || '[]'); } catch(e) { return []; }
            })();
            const newRatings = ratedOrders.filter(o => !seenIds.includes(o.id.toString()));
            
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

