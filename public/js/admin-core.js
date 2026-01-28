// =====================================================
// Admin Core Logic (Shared across all admin pages)
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    checkLogin();
    await loadSidebar();
    highlightSidebar();
});

async function loadSidebar() {
    const container = document.getElementById('sidebar-container');
    if (!container) return;
    
    try {
        const response = await fetch('admin-sidebar.html');
        const html = await response.text();
        container.innerHTML = html;
        
        // Start badge updates
        startBadgeUpdates();
    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

function startBadgeUpdates() {
    const updateBadges = () => {
        if (typeof getOrders !== 'function') return;
        
        const orders = getOrders();
        
        // 1. Orders Badge (New/Active Orders)
        // Usually "new" is what we want to highlight most, 
        // but user might want all active (new, preparing, ready).
        // Let's stick to 'new' for the sidebar badge to be less noisy, or follow dashboard logic.
        // Dashboard uses !['delivered', 'cancelled']. Let's use that for "Active Tasks".
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

        // 2. Ratings Badge
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

    // Initial update
    updateBadges();

    // Listen for data updates from data.js
    document.addEventListener('orders-updated', updateBadges);
    document.addEventListener('data-ready', updateBadges);
    
    // Ensure we have data initially if other scripts didn't load it
    // Small delay to let page-specific initializeData run first
    setTimeout(async () => {
        if (typeof getOrders === 'function' && getOrders().length === 0) {
            if (typeof refreshOrders === 'function') {
                await refreshOrders();
            }
        }
    }, 500);

    // Background refresh every 30 seconds if not already polling faster (dashboard/orders)
    const isHighTrafficPage = window.location.pathname.includes('admin-orders.html') || 
                             window.location.pathname.includes('admin-dashboard.html');
    
    if (!isHighTrafficPage) {
        setInterval(async () => {
            if (typeof refreshOrders === 'function') {
                await refreshOrders();
            }
        }, 30000);
    }
}

function checkLogin() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    const isLoginPage = window.location.href.includes('admin-login.html');
    
    if (!isLoggedIn && !isLoginPage) {
        // Use replace to prevent back button history
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
    
    // Default to dashboard check if we are on 'admin.html' acting as dashboard
    if (path.endsWith('admin.html')) {
        const el = document.getElementById('nav-dashboard');
        if (el) el.classList.add('active');
        return;
    }

    // Find key that matches current path
    const currentPage = Object.keys(navItems).find(key => path.includes(key));
    if (currentPage) {
        const id = navItems[currentPage];
        const el = document.getElementById(id);
        if (el) {
            // Remove active from all first
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');
        }
    }
}

// Global error handler for fetch calls to redirect to login on 401
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.status === 401) {
        sessionStorage.removeItem('adminLoggedIn');
        window.location.href = 'admin-login.html';
    }
});
