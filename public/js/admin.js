// =====================================================
// لوحة التحكم - Admin Dashboard
// =====================================================

// State
let currentSection = 'dashboard';
let currentOrderFilter = 'new';

// Cropper Instance
let cropperInstance = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    
    // Setup file input - Open Cropper Modal
    const mealImageInput = document.getElementById('mealImageInput');
    if (mealImageInput) {
        mealImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    openCropperModal(e.target.result);
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // Setup Order Filter Tabs
    const tabs = document.querySelectorAll('.orders-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active state
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Filter
            const status = tab.dataset.status;
            currentOrderFilter = status;
            renderOrders();
        });
    });
});

// =====================================================
// AUTHENTICATION
// =====================================================

function checkLogin() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        showDashboard();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
    }
}

function handleLogin(event) {
    event.preventDefault();
    const passwordInput = document.getElementById('loginPassword');
    const password = passwordInput.value;
    
    const settings = getSettings();
    if (password === settings.adminPassword) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        showDashboard();
        showToast('تم تسجيل الدخول بنجاح', 'success');
        passwordInput.value = '';
    } else {
        showToast('كلمة المرور غير صحيحة', 'error');
        passwordInput.classList.add('shake');
        setTimeout(() => passwordInput.classList.remove('shake'), 500);
    }
}

function handleLogout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        sessionStorage.removeItem('adminLoggedIn');
        window.location.reload();
    }
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block'; // Was 'flex' in some designs, but block usually safer for main containers
    
    // Init views
    initDashboard();
}

// =====================================================
// NAVIGATION & UI
// =====================================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

function showSection(sectionId) {
    // Prevent navigation if already on the section (optional, but good practice)
    if (currentSection === sectionId) return;

    // Show Loader
    const loader = document.getElementById('pageLoader');
    if (loader) loader.style.display = 'flex';

    // Artificial Delay for Smoothness (Wait a little...)
    setTimeout(() => {
        // Hide all sections
        const sections = ['dashboard', 'orders', 'meals', 'categories', 'settings', 'ratings'];
        sections.forEach(s => {
            const el = document.getElementById(`section-${s}`);
            if (el) el.style.display = 'none';
            
            // Update Nav
            const navItem = document.getElementById(`nav-${s}`);
            if (navItem) navItem.classList.remove('active');
        });
        
        // Show target
        const target = document.getElementById(`section-${sectionId}`);
        if (target) {
            target.style.display = 'block';
            // Trigger optimized entry animation
            target.classList.remove('section-animate');
            void target.offsetWidth; // Force reflow
            target.classList.add('section-animate');
        }
        
        // Update Nav
        const activeNav = document.getElementById(`nav-${sectionId}`);
        if (activeNav) activeNav.classList.add('active');
        
        // Update Title
        const titles = {
            'dashboard': 'الرئيسية',
            'orders': 'الطلبات',
            'meals': 'إدارة الوجبات',
            'categories': 'الأقسام',
            'settings': 'الإعدادات',
            'ratings': 'تقييمات العملاء'
        };
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = titles[sectionId] || 'لوحة التحكم';
        
        // Refresh Data (Heavy lifting happens here hidden behind the loader)
        try {
            if (sectionId === 'dashboard') initDashboard();
            if (sectionId === 'orders') renderOrders();
            if (sectionId === 'meals') initMealsPage();
            if (sectionId === 'categories') renderCategories(); // Assuming this function exists or will be added if missing
            if (sectionId === 'settings') {
                 if (typeof loadSettings === 'function') loadSettings();
            }
            if (sectionId === 'ratings') {
                renderRatedOrders();
                markRatingsAsSeen(); 
            }
        } catch (e) {
            console.error('Error rendering section:', e);
        }

        currentSection = sectionId;
        
        // Mobile: Close sidebar after selection
        if (window.innerWidth <= 1024) {
            const sidebar = document.getElementById('sidebar');
            if(sidebar) sidebar.classList.remove('open');
        }

        // Hide Loader
        if (loader) {
            // Optional: fade out
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
                loader.style.opacity = '1';
            }, 300); // Matches CSS transition
        }

    }, 600); // 600ms delay to ensure the user feels the "wait" and the heaviness is masked
}

// =====================================================
// DASHBOARD
// =====================================================

// Dashboard Init
// Dashboard Init
async function initDashboard() {
    loadDashboardStats();
    loadMonthlyChart();
    loadTopSellingMealsList();
    
    // Immediate refresh
    if (typeof refreshOrders === 'function') {
        await refreshOrders();
        loadDashboardStats();
        loadMonthlyChart();
        loadTopSellingMealsList();
    }
    
    // Auto-refresh orders every 2 seconds (Near Real-time)
    if (!window.ordersPollInterval) {
        window.ordersPollInterval = setInterval(async () => {
            if (typeof refreshOrders === 'function') {
                const oldOrders = JSON.stringify(getOrders());
                await refreshOrders();
                const newOrders = getOrders();
                
                // Only update DOM if data changed to avoid flickering
                // Only update DOM if data changed to avoid flickering
                if (JSON.stringify(newOrders) !== oldOrders) {
                    loadDashboardStats();
                    loadMonthlyChart();
                    loadTopSellingMealsList();
                    
                    // If on orders page, refresh list too
                    if (currentSection === 'orders') {
                        renderOrders();
                    }
                    if (currentSection === 'ratings') {
                        renderRatedOrders();
                    }
                }
            }
        }, 3000); // 3 seconds refresh
    }
}

function loadDashboardStats() {
    const orders = getOrders();
    const stats = getOrderStats(); // From orders.js
    
    // Calculate specific statuses
    const preparingCount = orders.filter(o => o.status === 'preparing').length;
    const readyCount = orders.filter(o => o.status === 'ready').length;
    
    const container = document.getElementById('statsGridEnhanced');
    if (container) {
        container.innerHTML = `
            <!-- 1. Total Orders -->
            <div class="stat-card-soft">
                <div class="stat-icon-soft total-icon">📦</div>
                <div class="stat-content">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">إجمالي الطلبات</div>
                </div>
            </div>

            <!-- 2. Preparing -->
            <div class="stat-card-soft">
                <div class="stat-icon-soft preparing-icon">👨‍🍳</div>
                <div class="stat-content">
                    <div class="stat-value">${preparingCount}</div>
                    <div class="stat-label">قيد التحضير</div>
                </div>
            </div>

            <!-- 3. Ready -->
            <div class="stat-card-soft">
                <div class="stat-icon-soft ready-icon">🔔</div>
                <div class="stat-content">
                    <div class="stat-value">${readyCount}</div>
                    <div class="stat-label">جاهز للاستلام</div>
                </div>
            </div>

            <!-- 4. Today Revenue -->
            <div class="stat-card-soft">
                <div class="stat-icon-soft revenue-icon">💰</div>
                <div class="stat-content">
                    <div class="stat-value">${formatPrice(stats.todayRevenue)}</div>
                    <div class="stat-label">دخل اليوم</div>
                </div>
            </div>

            <!-- 5. Month Revenue -->
            <div class="stat-card-soft">
                <div class="stat-icon-soft month-icon">📅</div>
                <div class="stat-content">
                    <div class="stat-value">${formatPrice(stats.monthRevenue)}</div>
                    <div class="stat-label">دخل الشهر</div>
                </div>
            </div>
        `;
    }
    
    // Update sidebar badge
    const activeOrdersCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
    const badge = document.getElementById('newOrdersBadge');
    if (badge) {
        if (activeOrdersCount > 0) {
            badge.textContent = activeOrdersCount;
            badge.style.display = 'inline-block';
            badge.classList.add('pulse-animation');
        } else {
            badge.style.display = 'none';
            badge.classList.remove('pulse-animation');
        }
    }
    
    // Check for new ratings
    checkNewRatings(orders);
}

// --------------------------------------------------------
// RATINGS BADGE LOGIC
// --------------------------------------------------------

function checkNewRatings(orders) {
    const ratedOrders = orders.filter(o => o.rating > 0);
    if (ratedOrders.length === 0) return;

    const seenIds = getSeenRatingIds();
    const newRatings = ratedOrders.filter(o => !seenIds.includes(o.id.toString())); // Ensure string comparison

    const badge = document.getElementById('newRatingsBadge');
    if (badge) {
        if (newRatings.length > 0) {
            badge.textContent = newRatings.length;
            badge.style.display = 'inline-block';
            badge.classList.add('pulse-animation');
        } else {
            badge.style.display = 'none';
            badge.classList.remove('pulse-animation');
        }
    }
}

function markRatingsAsSeen() {
    const orders = getOrders();
    const ratedOrders = orders.filter(o => o.rating > 0);
    const ids = ratedOrders.map(o => o.id.toString());
    
    localStorage.setItem('seenRatingIds', JSON.stringify(ids));
    
    // Hide badge immediately
    const badge = document.getElementById('newRatingsBadge');
    if (badge) {
        badge.style.display = 'none';
        badge.classList.remove('pulse-animation');
    }
}

function getSeenRatingIds() {
    const stored = localStorage.getItem('seenRatingIds');
    try {
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

// =====================================================
// CHART & ACTION ORDERS
// =====================================================

let revenueChartInstance = null;

function loadMonthlyChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // Prepare Data: Daily Revenue for current month
    const orders = getOrders().filter(o => o.status === 'delivered'); // Only counted revenue
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const labels = [];
    const data = [];
    
    // Init array with 0
    const dailyRevenue = new Array(daysInMonth + 1).fill(0);
    
    orders.forEach(order => {
        const d = new Date(order.createdAt);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            dailyRevenue[d.getDate()] += order.total;
        }
    });

    // Fill Chart Data (up to today to avoid empty future days looking weird, or show all?)
    // User requested "From 1 to today".
    const currentDay = today.getDate();
    for (let i = 1; i <= currentDay; i++) {
        labels.push(i);
        data.push(dailyRevenue[i]);
    }

    if (revenueChartInstance) {
        revenueChartInstance.data.labels = labels;
        revenueChartInstance.data.datasets[0].data = data;
        revenueChartInstance.update();
    } else {
        revenueChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'الدخل (دج)',
                    data: data,
                    borderColor: '#F97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#F97316',
                    tension: 0.4, // Smooth curves
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#333',
                        bodyColor: '#F97316',
                        borderColor: '#eee',
                        borderWidth: 1,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' دج';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Tajawal' } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f3f4f6' },
                        ticks: { font: { family: 'Tajawal' } }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
            }
        });
    }
}

function loadTopSellingMealsList() {
    const container = document.getElementById('topSellingMealsList');
    if (!container) return;
    
    // getPopularMeals is already defined in orders.js and sorted by count
    const topMeals = getPopularMeals('today');
    
    if (topMeals.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #9ca3af; background: white; border-radius: 12px; border: 1px dashed #e5e7eb;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
                <p>لا توجد بيانات كافية بعد</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = topMeals.map((meal, index) => {
        let rankDisplay = `<span style="font-weight: 800; color: #9ca3af;">#${index + 1}</span>`;
        if(index === 0) rankDisplay = '<span style="font-size: 1.5rem;">🥇</span>';
        if(index === 1) rankDisplay = '<span style="font-size: 1.5rem;">🥈</span>';
        if(index === 2) rankDisplay = '<span style="font-size: 1.5rem;">🥉</span>';
        
        return `
            <div class="action-order-card">
                <div class="action-card-info" style="min-width: 50px; align-items: center; justify-content: center;">
                    ${rankDisplay}
                </div>
                
                <div class="action-details">
                    <div style="font-weight: 700; color: var(--text-main); font-size: 1rem;">${meal.name}</div>
                    ${meal.sizeName ? `<div style="font-size: 0.85rem; color: var(--text-muted);">${meal.sizeName}</div>` : ''}
                </div>
                
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                     <span class="action-status status-ready-soft" style="background: #E0F2FE; color: #0284C7; border: 1px solid #BAE6FD;">
                        ${meal.count} طلب
                    </span>
                    <span style="font-size: 0.8rem; color: #9ca3af; margin-top: 4px;">
                        ${formatPrice(meal.revenue)}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function loadTopMeals() {
    const topMeals = getPopularMeals(); // From orders.js
    const container = document.getElementById('topMealsList');
    if (!container) return;
    
    if (topMeals.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">لا توجد بيانات كافية بعد</p>';
        return;
    }
    
    container.innerHTML = topMeals.map((meal, index) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #f3f4f6;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-weight: 800; color: #9ca3af; width: 20px;">#${index + 1}</span>
                <div>
                    <div style="font-weight: 700;">${meal.name}</div>
                    <div style="font-size: 0.85rem; color: #6b7280;">${meal.sizeName || 'عادي'}</div>
                </div>
            </div>
            <div style="text-align: left;">
                <div style="font-weight: 700; color: var(--primary);">${meal.count} طلب</div>
                <div style="font-size: 0.85rem; color: #6b7280;">${formatPrice(meal.revenue)}</div>
            </div>
        </div>
    `).join('');
}

function searchCustomerByPhone() {
    const phoneInput = document.getElementById('customerPhoneSearch');
    const phone = phoneInput.value;
    const resultDiv = document.getElementById('customerResult');
    
    if (!phone) return;
    
    const orders = getCustomerOrders(phone); // From orders.js
    
    if (orders.length === 0) {
        resultDiv.innerHTML = '<p style="color: red; margin-top: 10px;">لا يوجد عميل بهذا الرقم</p>';
        return;
    }
    
    const lastOrder = orders[0]; // Recent
    const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
    
    resultDiv.innerHTML = `
        <div style="margin-top: 15px; padding: 15px; background: #f9fafb; border-radius: 8px;">
            <h4 style="margin: 0 0 10px;">${lastOrder.customerName}</h4>
            <p><strong>عدد الطلبات:</strong> ${orders.length}</p>
            <p><strong>إجمالي المصروفات:</strong> ${formatPrice(totalSpent)}</p>
            <p><strong>آخر طلب:</strong> ${new Date(lastOrder.createdAt).toLocaleDateString('ar-DZ')}</p>
            <button class="btn btn-secondary btn-sm" onclick="showCustomerOrders('${phone}')" style="margin-top: 10px; width: 100%;">عرض كل الطلبات</button>
        </div>
    `;
}

function showCustomerOrders(phone) {
    // Switch to orders tab and search there (simplified for now: just log or filter)
    showSection('orders');
    // Ideally implementing a search filter in orders page
    alert('فلترة الطلبات برقم الهاتف ستتوفر قريباً');
}

// --------------------------------------------------------
// RATINGS MANAGEMENT
// --------------------------------------------------------

function renderRatedOrders() {
    const container = document.getElementById('ratingsList');
    if (!container) return;
    
    // Get all orders that have a rating
    const orders = getOrders().filter(o => o.rating > 0);
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #9ca3af;">
                <div style="font-size: 3rem; margin-bottom: 10px;">⭐</div>
                <p>لا توجد تقييمات حتى الآن</p>
            </div>
        `;
        return;
    }
    
    // Sort by most recent
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    container.innerHTML = orders.map(order => `
        <div style="background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                        <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-family: monospace;">#${order.orderNumber}</span>
                        <h3 style="margin: 0; font-size: 1.1rem;">${order.customerName}</h3>
                    </div>
                    <div style="color: #6b7280; font-size: 0.9rem;">${new Date(order.createdAt).toLocaleDateString('ar-DZ')} • ${new Date(order.createdAt).toLocaleTimeString('ar-DZ')}</div>
                </div>
                <div style="text-align: left;">
                    <div style="font-size: 1.25rem; color: #FFC107; letter-spacing: 2px;">
                        ${'★'.repeat(order.rating)}${'<span style="color: #e5e7eb;">' + '★'.repeat(5 - order.rating) + '</span>'}
                    </div>
                </div>
            </div>
            
            ${order.review ? `
            <div style="background: #f9fafb; padding: 1rem; border-radius: 8px; border-right: 3px solid var(--primary); font-style: italic; color: #374151;">
                "${order.review}"
            </div>
            ` : '<div style="color: #9ca3af; font-size: 0.9rem; font-style: italic;">(بدون تعليق كتابي)</div>'}
            
            <div style="border-top: 1px solid #f3f4f6; padding-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 0.9rem;">
                    <span style="color: #6b7280;">عدد المنتجات:</span> 
                    <strong>${order.items.reduce((sum, i) => sum + i.quantity, 0)} منتجات</strong>
                </div>
                <button onclick="viewOrderDetails('${order.id}')" class="btn btn-secondary btn-sm">تفاصل الطلب</button>
            </div>
        </div>
    `).join('');
}

// =====================================================
// ORDERS MANAGEMENT
// =====================================================

function renderOrders() {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    let orders = getOrders();
    
    // Update tabs UI to match current filter
    const tabs = document.querySelectorAll('.orders-tab');
    if (tabs.length > 0) {
        tabs.forEach(tab => {
            if (tab.dataset.status === currentOrderFilter) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }
    
    if (currentOrderFilter !== 'all') {
        orders = orders.filter(o => o.status === currentOrderFilter);
    }
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #9ca3af;">
                <div style="font-size: 3rem; margin-bottom: 10px;">📦</div>
                <p>لا توجد طلبات في هذه القائمة</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = orders.map(order => {
        const statusText = getStatusText(order.status);
        const statusColor = getStatusColor(order.status);
        
        let actionButtons = '';
        if (order.status === 'new') {
            actionButtons = `
                <button class="btn-status-action next" onclick="updateStatus('${order.id}', 'preparing')">بدء التحضير</button>
                <button class="btn-status-action prev" onclick="cancelOrderBtn('${order.id}')">إلغاء</button>
            `;
        } else if (order.status === 'preparing') {
            actionButtons = `
                <button class="btn-status-action prev" onclick="updateStatus('${order.id}', 'new')" title="رجوع للحالة السابقة">↩️</button>
                <button class="btn-status-action next" onclick="updateStatus('${order.id}', 'ready')">جاهز</button>
            `;
        } else if (order.status === 'ready') {
            actionButtons = `
                <button class="btn-status-action prev" onclick="updateStatus('${order.id}', 'preparing')" title="رجوع للحالة السابقة">↩️</button>
                <button class="btn-status-action next" onclick="updateStatus('${order.id}', 'delivered')">تم التسليم</button>
            `;
        } else if (order.status === 'delivered') {
            actionButtons = `
                <button class="btn-status-action prev" onclick="safeUpdateStatus('${order.id}', 'ready', 'delivered')" title="رجوع للحالة السابقة">↩️ تراجع</button>
            `;
        }
        
        // Count items
        const itemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
        const itemsSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
        
        return `
            <div class="order-card-row">
                <div class="order-row-start">
                    <div class="order-number">${order.orderNumber}</div>
                    <div class="order-status-badge" style="background: ${statusColor}20; color: ${statusColor};">
                        <span class="status-dot" style="background: ${statusColor};"></span>
                        ${statusText}
                    </div>
                </div>
                
                <div class="order-row-middle">
                    <div class="customer-info">
                        <h4>
                            ${order.customerName}
                            <span class="order-type-badge ${order.orderType === 'delivery' ? 'type-delivery' : 'type-dinein'}">
                                ${order.orderType === 'delivery' ? '🛵 توصيل' : '🍽️ طاولة'}
                            </span>
                        </h4>
                        <p>
                            <span>📞 ${order.customerPhone}</span>
                            <span>⏰ ${new Date(order.createdAt).toLocaleTimeString('ar-DZ', {hour:'2-digit', minute:'2-digit'})}</span>
                        </p>
                    </div>
                    <div style="flex: 1; color: #6b7280; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                        <span>📦</span> ${itemsCount} منتجات
                    </div>
                </div>
                
                <div class="order-row-end">
                    <div class="order-total">${formatPrice(order.total)}</div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-order-view" onclick="viewOrderDetails('${order.id}')">👁️</button>
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function safeUpdateStatus(orderId, newStatus, currentStatus) {
    if (currentStatus === 'delivered') {
        if (!confirm('⚠️ تنبيه: هل أنت متأكد من التراجع عن حالة "تم التسليم"؟\n\nسيتم إعادة الطلب إلى قائمة "جاهز للاستلام".')) {
            return;
        }
    }
    updateStatus(orderId, newStatus);
}

function updateStatus(orderId, status) {
    if (updateOrderStatus(orderId, status)) {
        showToast(`تم تغيير حالة الطلب إلى ${getStatusText(status)}`, 'success');
        renderOrders();
        loadDashboardStats(); // Refresh badges
    }
}

async function cancelOrderBtn(orderId) {
    const success = await cancelOrder(orderId);
    if (success) {
        showToast('تم إلغاء الطلب', 'success');
        renderOrders();
    }
}

function viewOrderDetails(orderId) {
    const order = getOrderById(orderId);
    if (!order) return;
    
    const modalBody = document.getElementById('orderModalBody');
    const itemsHtml = order.items.map(item => `
        <div class="modal-item-row">
            <div class="item-info">
                <span class="item-qty">${item.quantity}x</span>
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    ${item.sizeName ? `<div class="item-size">${item.sizeName}</div>` : ''}
                </div>
            </div>
            <div class="item-price">${formatPrice(item.price * item.quantity)}</div>
        </div>
    `).join('');
    
    // زر الموقع الجغرافي
    let locationButtons = '';
    if (order.location && order.location.lat && order.location.lng) {
        locationButtons = `
            <div class="location-actions">
                <button onclick="openLocationInMaps(${order.location.lat}, ${order.location.lng})" 
                        class="btn-location map">
                    <span>📍</span> فتح الخريطة
                </button>
                <button onclick="copyLocation(${order.location.lat}, ${order.location.lng})" 
                        class="btn-location copy">
                    <span>📋</span> نسخ
                </button>
            </div>
        `;
    } else if (order.orderType === 'delivery' && order.address) {
        // Fallback for text address
        locationButtons = `
            <div class="location-actions">
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}" target="_blank" class="btn-location map" style="text-decoration:none;">
                    <span>📍</span> بحث في الخريطة
                </a>
                <button onclick="navigator.clipboard.writeText('${order.address}').then(() => showToast('تم النسخ', 'success'))" 
                        class="btn-location copy">
                    <span>📋</span> نسخ العنوان
                </button>
            </div>
        `;
    }
    
    const statusColor = getStatusColor(order.status);
    const statusText = getStatusText(order.status);

    modalBody.innerHTML = `
        <div class="order-details-container">
            <!-- Header Info -->
            <div class="order-details-header">
                <div class="order-id-badge">
                    <span class="label">رقم الطلب</span>
                    <span class="value">#${order.orderNumber}</span>
                </div>
                <div class="order-status-pill" style="background: ${statusColor}15; color: ${statusColor}; border: 1px solid ${statusColor}30;">
                    <span class="dot" style="background: ${statusColor};"></span>
                    ${statusText}
                </div>
            </div>

            <!-- Customer Card -->
            <div class="details-card customer-card">
                <h4 class="card-title">👤 بيانات العميل</h4>
                <div class="info-row">
                    <span class="icon">👤</span>
                    <span class="text">${order.customerName}</span>
                </div>
                <div class="info-row">
                    <a href="tel:${order.customerPhone}" class="phone-link">
                        <span class="icon">📞</span>
                        <span class="text">${order.customerPhone}</span>
                    </a>
                </div>
                
                <div class="info-row">
                    <span class="icon">${order.orderType === 'delivery' ? '🛵' : '🍽️'}</span>
                    <span class="text" style="font-weight: bold; color: var(--primary);">
                        ${order.orderType === 'delivery' ? 'طلب توصيل' : 'تناول في المطعم'}
                    </span>
                </div>

                ${order.orderType === 'delivery' ? `
                <div class="info-row">
                    <span class="icon">📍</span>
                    <span class="text">${order.address || 'موقع محدد على الخريطة'}</span>
                </div>
                ` : ''}

                ${locationButtons}
            </div>

            <!-- Notes -->
            ${order.notes ? `
            <div class="details-card notes-card">
                <h4 class="card-title">📝 ملاحظات</h4>
                <p class="notes-text">${order.notes}</p>
            </div>
            ` : ''}
            
            <!-- Items -->
            <div class="details-card items-card">
                <h4 class="card-title">🛍️ الطلب</h4>
                <div class="items-list">
                    ${itemsHtml}
                </div>
            </div>
            
            <!-- Summary -->
            <div class="details-card summary-card">
                <div class="summary-row">
                    <span>المجموع الفرعي</span>
                    <span>${formatPrice(order.subtotal)}</span>
                </div>
                <div class="summary-row">
                    <span>التوصيل</span>
                    <span>${formatPrice(order.deliveryCost)}</span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-row total">
                    <span>الإجمالي</span>
                    <span>${formatPrice(order.total)}</span>
                </div>
            </div>

            <!-- Actions -->
            <div class="modal-actions-footer">
                <button onclick="printOrder('${order.id}')" class="btn-print-order">
                    <span>🖨️</span> طباعة الفاتورة
                </button>
            </div>
        </div>
        
        <style>
            .order-details-container { font-family: 'Tajawal', sans-serif; }
            .order-details-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .order-id-badge { display: flex; flex-direction: column; }
            .order-id-badge .label { font-size: 0.8rem; color: #6b7280; }
            .order-id-badge .value { font-size: 1.5rem; font-weight: 800; color: #1f2937; }
            .order-status-pill { padding: 6px 14px; border-radius: 99px; font-weight: 600; display: flex; align-items: center; gap: 6px; font-size: 0.9rem; }
            .order-status-pill .dot { width: 8px; height: 8px; border-radius: 50%; }
            
            .details-card { background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #f3f4f6; }
            .card-title { margin: 0 0 12px 0; font-size: 1rem; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
            
            .info-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: #4b5563; }
            .info-row .icon { font-size: 1.1rem; width: 24px; text-align: center; }
            .phone-link { text-decoration: none; color: inherit; display: flex; align-items: center; gap: 10px; }
            .phone-link:hover { color: var(--primary); }
            
            .location-actions { display: flex; gap: 10px; margin-top: 12px; }
            .btn-location { flex: 1; border: none; padding: 8px; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s; }
            .btn-location.map { background: #e0f2fe; color: #0284c7; }
            .btn-location.map:hover { background: #bae6fd; }
            .btn-location.copy { background: #f3f4f6; color: #4b5563; }
            .btn-location.copy:hover { background: #e5e7eb; }
            
            .notes-text { background: #fffbeb; color: #b45309; padding: 10px; border-radius: 6px; border: 1px dashed #fcd34d; margin: 0; line-height: 1.5; }
            
            .modal-item-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .modal-item-row:last-child { border-bottom: none; }
            .item-info { display: flex; align-items: center; gap: 10px; }
            .item-qty { background: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.9rem; }
            .item-details { display: flex; flex-direction: column; }
            .item-name { font-weight: 600; color: #1f2937; }
            .item-size { font-size: 0.8rem; color: #6b7280; }
            .item-price { font-weight: 700; color: #374151; }
            
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; color: #6b7280; }
            .summary-row.total { color: #1f2937; font-weight: 800; font-size: 1.2rem; margin-top: 8px; }
            .summary-divider { height: 1px; background: #e5e7eb; margin: 10px 0; }
            
            .modal-actions-footer { margin-top: 20px; }
            .btn-print-order { width: 100%; padding: 12px; background: #374151; color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; }
            .btn-print-order:hover { background: #1f2937; transform: translateY(-1px); }
        </style>
    `;
    
    document.getElementById('orderModal').classList.add('active');
}

// طباعة الفاتورة
function printOrder(orderId) {
    const order = getOrderById(orderId);
    if (!order) return;
    
    const settings = getSettings();
    // 80mm is approx 300px-320px depending on PPI, but usually handled by printer driver.
    // We set a small width for the popup to simulate it.
    const printWindow = window.open('', '', 'width=400,height=600');
    
    const itemsHtml = order.items.map(item => `
        <tr class="item-row">
            <td style="vertical-align: top;">${item.quantity}x</td>
            <td class="item-name">
                <div>${item.name}</div>
                ${item.sizeName ? `<div class="item-variant">${item.sizeName}</div>` : ''}
            </td>
            <td class="item-price">${formatPrice(item.price * item.quantity)}</td>
        </tr>
    `).join('');
    
    const html = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة #${order.orderNumber}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
                
                body {
                    margin: 0;
                    padding: 10px;
                    font-family: 'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: #fff;
                    color: #000;
                    font-size: 14px; /* حجم خط مقروء */
                    max-width: 300px; /* عرض تقريبي للفاتورة 80mm */
                    margin: 0 auto;
                }
                
                .receipt-container {
                    width: 100%;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 15px;
                }
                
                .logo {
                    font-size: 30px;
                    margin-bottom: 5px;
                }
                
                .store-name {
                    font-size: 18px;
                    font-weight: 800;
                    margin: 5px 0;
                }
                
                .store-info {
                    font-size: 12px;
                    margin-bottom: 5px;
                }

                .separator {
                    border-bottom: 1px dashed #000;
                    margin: 10px 0;
                    width: 100%;
                }
                
                .order-info {
                    font-size: 13px;
                    margin-bottom: 5px;
                }
                
                .customer-block {
                    margin: 10px 0;
                    padding: 5px 0;
                    font-size: 13px;
                }
                
                .customer-label {
                    font-weight: bold;
                    display: inline-block;
                    width: 50px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10px 0;
                }
                
                th {
                    text-align: right;
                    border-bottom: 1px solid #000;
                    padding: 5px 0;
                    font-size: 12px;
                }
                
                td {
                    padding: 6px 0;
                    vertical-align: top;
                }
                
                .item-name {
                    padding-right: 5px;
                }
                
                .item-variant {
                    font-size: 11px;
                    color: #444;
                }
                
                .item-price {
                    text-align: left;
                    white-space: nowrap;
                }
                
                .totals {
                    margin-top: 5px;
                }
                
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                    font-size: 13px;
                }
                
                .grand-total {
                    font-weight: 800;
                    font-size: 16px;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                    margin-top: 5px;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 12px;
                }
                
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto; /* محاولة لضبط الحجم للطابعات */
                    }
                    body {
                        padding: 5px;
                        max-width: 100%;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="header">
                    <div class="logo">🍔</div>
                    <div class="store-name">${settings.name || 'Fast Food'}</div>
                    <div class="store-info">${settings.phone || ''}</div>
                    <div class="store-info">${new Date().toLocaleString('ar-DZ')}</div>
                </div>
                
                <div class="separator"></div>
                
                <div class="order-info">
                    <div style="font-weight: bold; font-size: 16px; text-align: center;">طلب #${order.orderNumber}</div>
                    <div style="text-align: center; margin-top: 5px;">
                        ${order.orderType === 'delivery' ? 'توصيل 🛵' : 'استلام 🍽️'}
                    </div>
                </div>
                
                <div class="separator"></div>
                
                <div class="customer-block">
                    <div><strong>${order.customerName}</strong></div>
                    <div>${order.customerPhone}</div>
                    ${order.address 
                        ? `<div style="margin-top:2px;">${order.address}</div>` 
                        : (order.orderType === 'delivery' && order.location 
                            ? `<div style="margin-top:2px;">📍 موقع محدد على الخريطة<br><span style="font-size: 10px; color: #555;">(${Number(order.location.lat).toFixed(5)}, ${Number(order.location.lng).toFixed(5)})</span></div>` 
                            : '')
                    }
                    
                    ${order.orderType === 'delivery' && order.location ? `
                    <div style="margin-top: 5px;" class="no-print-paper">
                         <a href="https://www.google.com/maps?q=${order.location.lat},${order.location.lng}" target="_blank" style="display: inline-block; background: #eee; padding: 3px 8px; border-radius: 4px; text-decoration: none; color: #000; font-size: 11px; border: 1px solid #ccc;">
                            📍 فتح الخريطة
                         </a>
                    </div>
                    ` : ''}
                </div>
                
                ${order.notes ? `
                <div style="border: 1px solid #000; padding: 5px; margin: 5px 0; font-size: 12px;">
                    <strong>ملاحظة:</strong> ${order.notes}
                </div>
                ` : ''}
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 25px;">#</th>
                            <th>الصنف</th>
                            <th style="text-align: left; width: 60px;">السعر</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div class="separator"></div>
                
                <div class="totals">
                    <div class="total-row">
                        <span>المجموع:</span>
                        <span>${formatPrice(order.subtotal)}</span>
                    </div>
                    ${order.deliveryCost > 0 ? `
                    <div class="total-row">
                        <span>التوصيل:</span>
                        <span>${formatPrice(order.deliveryCost)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row grand-total">
                        <span>الإجمالي:</span>
                        <span>${formatPrice(order.total)}</span>
                    </div>
                </div>
                
                <div class="footer">
                    <div>شكراً لطلبك!</div>
                    <div style="margin-top: 5px;">******</div>
                </div>
            </div>
            
            <script>
                // Auto print after a brief delay to ensure styles load
                window.onload = function() { 
                    setTimeout(function() {
                        window.print();
                        // Optional: close after print
                        // window.close();
                    }, 500);
                }
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
}

// فتح الموقع في خرائط Google
function openLocationInMaps(lat, lng) {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
}

// نسخ إحداثيات الموقع
function copyLocation(lat, lng) {
    const locationText = `${lat}, ${lng}`;
    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
    
    navigator.clipboard.writeText(mapsLink).then(() => {
        showToast('تم نسخ رابط الموقع بنجاح', 'success');
    }).catch(() => {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = mapsLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('تم نسخ رابط الموقع', 'success');
    });
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

// =====================================================
// MEALS MANAGEMENT
// =====================================================

function initMealsPage() {
    // Populate Category Select
    const categories = getCategories();
    const select = document.getElementById('mealsCategorySelect');
    
    select.innerHTML = '<option value="all">كل الأقسام</option>' + 
        categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
        
    renderMeals();
}

function renderMeals(categoryId = 'all') {
    const container = document.getElementById('mealsGrid');
    if (!container) return;
    
    let allMeals = getMeals();
    const categories = getCategories();
    
    let meals = allMeals;
    if (categoryId && categoryId !== 'all') {
        meals = allMeals.filter(m => m.categoryId == categoryId);
    }
    
    // Update stats
    updateMealsStats(meals);
    
    container.innerHTML = meals.map(meal => {
        const cat = categories.find(c => c.id === meal.categoryId);
        
        // Price display - show sizes or single price
        let priceDisplay = '';
        if (meal.hasSizes && meal.sizes && meal.sizes.length > 0) {
            const sizesChips = meal.sizes.map(s => 
                `<span class="size-chip"><span class="size-chip-name">${s.name}</span><span class="size-chip-price">${formatPrice(s.price)}</span></span>`
            ).join('');
            priceDisplay = `
                <div class="meal-sizes-display">
                    ${sizesChips}
                </div>
            `;
        } else {
            priceDisplay = `<div class="meal-price">${formatPrice(meal.price)}</div>`;
        }
        
        return `
            <div class="meal-card-admin ${!meal.active ? 'meal-inactive' : ''}" onclick="openMealModal(${meal.id})">
                <div class="meal-card-image">
                    ${meal.image ? `<img src="${meal.image}" alt="${meal.name}">` : '<div style="height:100%; display:flex; align-items:center; justify-content:center; font-size:3rem;">🍽️</div>'}
                </div>
                <div class="meal-card-content">
                    <div class="meal-header">
                        <span class="meal-category-tag">${cat ? cat.name : 'Unknown'}</span>
                        <label class="switch" onclick="event.stopPropagation()">
                            <input type="checkbox" id="meal-toggle-${meal.id}" onchange="toggleMealActive(${meal.id})" ${meal.active ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    <h3 class="meal-title">${meal.name}</h3>
                    <p class="meal-desc">${meal.description || ''}</p>
                    <div class="meal-footer">
                        ${priceDisplay}
                        <div class="meal-actions">
                            <button class="action-btn edit" onclick="event.stopPropagation(); openMealModal(${meal.id})">✏️</button>
                            <button class="action-btn danger" onclick="event.stopPropagation(); deleteMealFunc(${meal.id})">🗑️</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateMealsStats(meals) {
    const statsEl = document.getElementById('mealsStats');
    if (!statsEl) return;
    
    const total = meals.length;
    const active = meals.filter(m => m.active).length;
    const inactive = total - active;
    
    statsEl.innerHTML = `
        <span class="stat-pill stat-total">📦 ${total} وجبة</span>
        <span class="stat-pill stat-active">✅ ${active} متوفر</span>
        <span class="stat-pill stat-inactive">⏸️ ${inactive} غير متوفر</span>
    `;
}

function filterMeals(catId) {
    renderMeals(catId);
}

function openMealModal(mealId = null) {
    const form = document.getElementById('mealForm');
    form.reset();
    document.getElementById('mealImagePreview').style.display = 'none';
    
    // Reset sizes section
    document.getElementById('mealHasSizes').checked = false;
    document.getElementById('sizesSection').style.display = 'none';
    document.getElementById('singlePriceGroup').style.display = 'block';
    document.getElementById('sizesContainer').innerHTML = '';
    
    // Populate Categories in Modal
    const categories = getCategories();
    const catSelect = document.getElementById('mealCategory');
    catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    if (mealId) {
        // Edit Mode
        const meal = getMeals().find(m => m.id === mealId);
        if (meal) {
            document.getElementById('mealId').value = meal.id;
            document.getElementById('mealName').value = meal.name;
            document.getElementById('mealPrice').value = meal.price || '';
            document.getElementById('mealDescription').value = meal.description;
            document.getElementById('mealCategory').value = meal.categoryId;
            document.getElementById('mealModalTitle').textContent = 'تعديل وجبة';
            
            // Handle sizes
            if (meal.hasSizes && meal.sizes && meal.sizes.length > 0) {
                document.getElementById('mealHasSizes').checked = true;
                document.getElementById('sizesSection').style.display = 'block';
                document.getElementById('singlePriceGroup').style.display = 'none';
                
                // Populate sizes
                meal.sizes.forEach(size => {
                    addSizeRow(size.name, size.price);
                });
            }
            
                if (meal.image) {
                const preview = document.getElementById('mealImagePreview');
                preview.querySelector('img').src = meal.image;
                preview.style.display = 'flex';
                
                // Hide Upload Button (Label) - Force Delete First
                const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                if(uploadLabel) uploadLabel.style.display = 'none';
                
                // Add Delete Button if not exists
                if (!preview.querySelector('.btn-delete-image')) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-delete-image';
                    deleteBtn.innerHTML = '🗑️ حذف الصورة';
                    deleteBtn.type = 'button';
                    deleteBtn.onclick = function(e) {
                        e.stopPropagation(); // Prevent triggering edit
                        if(confirm('هل أنت متأكد من حذف الصورة؟ سيتم إزالتها نهائياً.')) {
                            preview.querySelector('img').src = '';
                            preview.style.display = 'none';
                            
                            // Show Upload Button Again
                            const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                            if(uploadLabel) uploadLabel.style.display = 'flex'; // Restore flex display
                            
                            document.getElementById('mealImageInput').value = '';
                            // Clear hidden input if exists
                            const hidden = document.getElementById('croppedImageData');
                            if(hidden) hidden.value = '';
                        }
                    };
                    // Styling handled in CSS, but let's append it
                    preview.appendChild(deleteBtn);
                    preview.style.position = 'relative'; // Ensure relative
                }
            } else {
                 // No image, ensure upload button is visible
                 const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                 if(uploadLabel) uploadLabel.style.display = 'flex';
            }
        }
    } else {
        // New Mode
        document.getElementById('mealId').value = '';
        document.getElementById('mealModalTitle').textContent = 'إضافة وجبة جديدة';
        
        // Ensure upload button is visible
        const uploadLabel = document.querySelector('label[for="mealImageInput"]');
        if(uploadLabel) uploadLabel.style.display = 'flex';
        // addSizeRow('', '');
    }
    
    document.getElementById('mealModal').classList.add('active');
}

function closeMealModal() {
    document.getElementById('mealModal').classList.remove('active');
}

async function saveMeal(event) {
    event.preventDefault();
    
    // Add Loading State
    const submitBtn = document.querySelector('#mealForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = '⏳ جاري الحفظ...';
        submitBtn.disabled = true;
    }
    
    try {
        const id = document.getElementById('mealId').value;
        const name = document.getElementById('mealName').value;
        const description = document.getElementById('mealDescription').value;
        const categoryId = parseInt(document.getElementById('mealCategory').value);
        const hasSizes = document.getElementById('mealHasSizes').checked;
        
        if (isNaN(categoryId)) {
             showToast('يرجى اختيار القسم', 'error');
             return;
        }

        // Get price or sizes
        let price = 0;
        let sizes = [];
        
        if (hasSizes) {
            sizes = getSizesFromForm();
            if (sizes.length === 0) {
                showToast('يرجى إضافة حجم واحد على الأقل', 'error');
                return;
            }
            price = Math.min(...sizes.map(s => s.price));
        } else {
            price = parseFloat(document.getElementById('mealPrice').value) || 0;
            if (price <= 0) {
                showToast('يرجى إدخال سعر صحيح', 'error');
                return;
            }
        }
        
        
        // Image handling from cropper
        let image = '';
        const preview = document.getElementById('mealImagePreview');
        if (preview.style.display !== 'none') {
            image = preview.querySelector('img').src;
        }
        
        // Check if we have cropped data from hidden input
        const croppedData = document.getElementById('croppedImageData');
        if (croppedData && croppedData.value) {
            image = croppedData.value;
        }
        
        // Use Helpers
        // Convert empty string to null for database cleanliness
        const mealData = {
            name, price, description, categoryId, 
            image: image || null, 
            hasSizes, sizes,
            active: true
        };
        
        if (id) {
            // Update
            // Keep existing non-form fields (like active, popular, order)
            const existing = getMeals().find(m => m.id == id);
            await updateMealData({ ...existing, ...mealData, id: parseInt(id) });
            showToast('تم تحديث الوجبة بنجاح', 'success');
        } else {
            // Create
            await createMealData({
                ...mealData,
                popular: false,
                order: getMeals().length + 1
            });
            showToast('تم إضافة الوجبة بنجاح', 'success');
        }
        
        closeMealModal();
        renderMeals();
    } catch (e) {
        console.error("Save Meal Error:", e);
        showToast('حدث خطأ أثناء حفظ الوجبة: ' + e.message, 'error');
    } finally {
        // Restore button state
        const submitBtn = document.querySelector('#mealForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'حفظ';
            submitBtn.disabled = false;
        }
    }
}

// =====================================================
// IMAGE CROPPER LOGIC
// =====================================================

let cropper = null;
const cropModal = document.getElementById('cropModal');
const cropImage = document.getElementById('cropImage');
const imageInput = document.getElementById('mealImageInput'); // Re-declare locally or ensure global

if (imageInput) {
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                // Direct Resize & process without cropping modal
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Resize logic (Max 1000px)
                    const MAX_SIZE = 1000;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Export
                    const dataUrl = canvas.toDataURL('image/webp', 0.85);
                    
                    // Update Preview
                    const preview = document.getElementById('mealImagePreview');
                    preview.querySelector('img').src = dataUrl;
                    preview.style.display = 'flex';
                    
                    // Store in hidden input
                    let hiddenInput = document.getElementById('croppedImageData');
                    if (!hiddenInput) {
                        hiddenInput = document.createElement('input');
                        hiddenInput.type = 'hidden';
                        hiddenInput.id = 'croppedImageData';
                        document.getElementById('mealForm').appendChild(hiddenInput);
                    }
                    hiddenInput.value = dataUrl;
                    
                    // Hide Upload Label
                    const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                    if(uploadLabel) uploadLabel.style.display = 'none';

                    // Add Delete Button Logic if not exists
                     if (!preview.querySelector('.btn-delete-image')) {
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'btn-delete-image';
                        deleteBtn.innerHTML = '🗑️ حذف الصورة';
                        deleteBtn.type = 'button';
                        deleteBtn.onclick = function(e) {
                            e.stopPropagation(); 
                            if(confirm('هل أنت متأكد من حذف الصورة؟')) {
                                preview.querySelector('img').src = '';
                                preview.style.display = 'none';
                                const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                                if(uploadLabel) uploadLabel.style.display = 'flex'; 
                                document.getElementById('mealImageInput').value = '';
                                const hidden = document.getElementById('croppedImageData');
                                if(hidden) hidden.value = '';
                            }
                        };
                        preview.appendChild(deleteBtn);
                        preview.style.position = 'relative';
                    }
                }
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// Deprecated Cropper Functions (Kept empty to avoid changing too much code structure or reference errors)
function initCropperInstance() {}


function closeCropModal() {
    document.getElementById('cropModal').classList.remove('active');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    document.getElementById('mealImageInput').value = '';
}

function cropAndSave() {
    if (!cropper) return;
    
    // Get cropped canvas - Forced to 800x800
    // Get cropped canvas - Natural size (avoid stretching)
    // Get cropped canvas - Limit to 1000x1000 for performance/quality balance
    const canvas = cropper.getCroppedCanvas({
        maxWidth: 1000,
        maxHeight: 1000,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    
    // Export as WebP for performance
    const croppedDataUrl = canvas.toDataURL('image/webp', 0.85);
    
    // Show preview
    const preview = document.getElementById('mealImagePreview');
    preview.querySelector('img').src = croppedDataUrl;
    preview.style.display = 'flex';
    
    // Hide Upload Button (Label) - Force Delete First
    const uploadLabel = document.querySelector('label[for="mealImageInput"]');
    if(uploadLabel) uploadLabel.style.display = 'none';
    
    // Ensure Delete Button logic is re-attached or persistent
    // Since we just showed the preview, we might need to add the delete button if not present
    if (!preview.querySelector('.btn-delete-image')) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete-image';
        deleteBtn.innerHTML = '🗑️ حذف الصورة';
        deleteBtn.type = 'button';
        deleteBtn.onclick = function(e) {
            e.stopPropagation(); 
            if(confirm('هل أنت متأكد من حذف الصورة؟')) {
                preview.querySelector('img').src = '';
                preview.style.display = 'none';
                
                // Show Upload Button Again
                const uploadLabel = document.querySelector('label[for="mealImageInput"]');
                if(uploadLabel) uploadLabel.style.display = 'flex'; 
                
                document.getElementById('mealImageInput').value = '';
                const hidden = document.getElementById('croppedImageData');
                if(hidden) hidden.value = '';
            }
        };
        preview.appendChild(deleteBtn);
        preview.style.position = 'relative';
    }
    
    // Store in hidden input or just rely on preview src in saveMeal (I used preview src in saveMeal, but better store it)
    let hiddenInput = document.getElementById('croppedImageData');
    if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'croppedImageData';
        document.getElementById('mealForm').appendChild(hiddenInput);
    }
    hiddenInput.value = croppedDataUrl;
    
    closeCropModal();
}

// =====================================================
// SIZES MANAGEMENT
// =====================================================

function toggleSizesSection() {
    const hasSizes = document.getElementById('mealHasSizes').checked;
    const sizesSection = document.getElementById('sizesSection');
    const singlePriceGroup = document.getElementById('singlePriceGroup');
    
    if (hasSizes) {
        sizesSection.style.display = 'block';
        singlePriceGroup.style.display = 'none';
        
        // Add default sizes if empty
        if (document.getElementById('sizesContainer').children.length === 0) {
            addSizeRow('صغير', '');
            addSizeRow('وسط', '');
            addSizeRow('كبير', '');
        }
    } else {
        sizesSection.style.display = 'none';
        singlePriceGroup.style.display = 'block';
    }
}

function addSizeRow(sizeName = '', sizePrice = '') {
    const container = document.getElementById('sizesContainer');
    const rowId = Date.now();
    
    const row = document.createElement('div');
    row.className = 'size-row';
    row.id = `size-row-${rowId}`;
    row.innerHTML = `
        <input type="text" class="form-input size-name" placeholder="اسم الحجم (مثال: كبير)" value="${sizeName}">
        <input type="number" class="form-input size-price" placeholder="السعر (دج)" value="${sizePrice}">
        <button type="button" class="btn-remove-size" onclick="removeSizeRow('size-row-${rowId}')">🗑️</button>
    `;
    
    container.appendChild(row);
}

function removeSizeRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
    }
    
    // Ensure at least one size row exists
    if (document.getElementById('sizesContainer').children.length === 0) {
        addSizeRow('', '');
    }
}

function getSizesFromForm() {
    const sizes = [];
    const rows = document.querySelectorAll('#sizesContainer .size-row');
    
    rows.forEach(row => {
        const name = row.querySelector('.size-name').value.trim();
        const price = parseFloat(row.querySelector('.size-price').value) || 0;
        
        if (name && price > 0) {
            sizes.push({ name, price });
        }
    });
    
    return sizes;
}

async function toggleMealActive(id) {
    const meal = getMeals().find(m => m.id === id);
    if (meal) {
        const updated = { ...meal, active: !meal.active };
        await updateMealData(updated);
        renderMeals();
        showToast(`${updated.name} ${updated.active ? 'متاح الآن' : 'غير متاح'}`, updated.active ? 'success' : 'warning');
    }
}

// Bulk Toggle All Meals
function bulkToggleMeals(activate) {
    const currentCategory = document.getElementById('mealsCategorySelect').value;
    let meals = getMeals();
    
    // Filter by current category if not 'all'
    let targetMeals = meals;
    if (currentCategory && currentCategory !== 'all') {
        targetMeals = meals.filter(m => m.categoryId == currentCategory);
    }
    
    const action = activate ? 'تفعيل' : 'إيقاف';
    const count = targetMeals.length;
    const categoryText = currentCategory === 'all' ? 'جميع الوجبات' : 'وجبات هذا القسم';
    
    if (!confirm(`هل تريد ${action} ${categoryText}؟ (${count} وجبة)`)) {
        return;
    }
    
    // Update all target meals
    meals = meals.map(meal => {
        if (currentCategory === 'all' || meal.categoryId == currentCategory) {
            return { ...meal, active: activate };
        }
        return meal;
    });
    
    saveMeals(meals);
    renderMeals(currentCategory);
    
    showToast(`تم ${action} ${count} وجبة بنجاح`, activate ? 'success' : 'warning');
}

async function deleteMealFunc(id) {
    if (confirm('هل أنت متأكد من حذف هذه الوجبة؟ سيتم حذف جميع البيانات والصور المرتبطة بها نهائياً.')) {
        await deleteMealData(id);
        renderMeals();
        showToast('تم حذف الوجبة', 'warning');
    }
}
// Alias because deleteMeal name conflict? No.
function editMeal(id) {
    openMealModal(id);
}

// =====================================================
// CATEGORIES MANAGEMENT
// =====================================================

function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    const categories = getCategories();
    
    container.innerHTML = `
        <div class="categories-grid">
            ${categories.map(cat => `
                <div class="category-card-new ${!cat.active ? 'inactive' : ''}">
                    <!-- Toggle Switch Only -->
                    <div class="category-card-header">
                        <div class="status-light ${cat.active ? 'on' : 'off'}"></div>
                        <label class="switch">
                            <input type="checkbox" onchange="toggleCategoryActive(${cat.id})" ${cat.active ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <!-- Icon & Name -->
                    <div class="category-card-body">
                        <div class="category-icon-wrapper ${!cat.active ? 'dimmed' : ''}">
                            <span class="category-icon">${cat.icon}</span>
                        </div>
                        <h3 class="category-name">${cat.name}</h3>
                    </div>
                    
                    <!-- Action Buttons - More Elegant -->
                    <div class="category-card-actions">
                        <button class="cat-btn cat-btn-edit" onclick="editCategory(${cat.id})">
                            ✏️ تعديل
                        </button>
                        <button class="cat-btn cat-btn-delete" onclick="deleteCategory(${cat.id})">
                            🗑️ حذف
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function openCategoryModal(id = null) {
    const form = document.getElementById('categoryForm');
    form.reset();
    document.getElementById('categoryId').value = '';
    
    if (id) {
        const cat = getCategories().find(c => c.id === id);
        if (cat) {
            document.getElementById('categoryId').value = cat.id;
            document.getElementById('categoryName').value = cat.name;
            document.getElementById('categoryIcon').value = cat.icon;
            document.getElementById('categoryModalTitle').textContent = 'تعديل قسم';
        }
    } else {
        document.getElementById('categoryModalTitle').textContent = 'إضافة قسم جديد';
    }
    
    document.getElementById('categoryModal').classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

async function saveCategory(event) {
    event.preventDefault();
    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value;
    const icon = document.getElementById('categoryIcon').value || '📁';
    
    if (id) {
        // Update
        await updateCategoryData({ id: parseInt(id), name, icon, active: true });
        showToast('تم تحديث القسم', 'success');
    } else {
        // Create
        await createCategoryData({
            name,
            icon,
            order: getCategories().length + 1,
            active: true
        });
        showToast('تم إضافة القسم', 'success');
    }
    
    closeCategoryModal();
    renderCategories();
}

function editCategory(id) {
    openCategoryModal(id);
}

async function deleteCategory(id) {
    if (confirm('حذف هذا القسم سيحذف جميع الوجبات التابعة له! هل أنت متأكد؟')) {
        await deleteCategoryData(id);
        renderCategories();
        showToast('تم حذف القسم', 'warning');
    }
}

async function toggleCategoryActive(id) {
    const categories = getCategories();
    const category = categories.find(c => c.id === id);
    if (category) {
        const updated = { ...category, active: !category.active };
        await updateCategoryData(updated);
        renderCategories();
        showToast(`${updated.name} ${updated.active ? 'مفعّل الآن' : 'تم إيقافه'}`, updated.active ? 'success' : 'info');
    }
}


// =====================================================
// SETTINGS
// =====================================================

function loadSettings() {
    const settings = getSettings();
    document.getElementById('settingName').value = settings.restaurantName || '';
    document.getElementById('settingPhone').value = settings.phone || '';
    document.getElementById('settingAddress').value = settings.address || '';
    document.getElementById('settingIsOpen').checked = settings.isOpen;
    
    if (settings.delivery) {
        document.getElementById('settingDeliveryType').value = settings.delivery.type || 'fixed';
        document.getElementById('settingFixedCost').value = settings.delivery.fixedCost || 0;
        
        // Distance settings
        document.getElementById('settingCostPerKm').value = settings.delivery.costPerKm || 50;
        document.getElementById('settingMaxDistance').value = settings.delivery.maxDistance || 20;
        
        if (settings.location) {
            document.getElementById('settingRestLat').value = settings.location.lat || '';
            document.getElementById('settingRestLng').value = settings.location.lng || '';
        }
        
        toggleDeliveryType();
    }
}

function toggleDeliveryType() {
    const type = document.getElementById('settingDeliveryType').value;
    const fixedGroup = document.getElementById('fixedCostGroup');
    const distanceGroup = document.getElementById('distanceCostGroup');
    
    if (type === 'fixed') {
        fixedGroup.style.display = 'block';
        distanceGroup.style.display = 'none';
    } else {
        // Free OR Not Specified
        fixedGroup.style.display = 'none';
        distanceGroup.style.display = 'none';
    }
}

function handleSaveSettings() {
    let settings = getSettings();
    
    settings.restaurantName = document.getElementById('settingName').value;
    settings.phone = document.getElementById('settingPhone').value;
    settings.address = document.getElementById('settingAddress').value;
    settings.isOpen = document.getElementById('settingIsOpen').checked;
    
    if (!settings.delivery) settings.delivery = {};
    settings.delivery.enabled = true;
    settings.delivery.type = document.getElementById('settingDeliveryType').value;
    settings.delivery.fixedCost = parseFloat(document.getElementById('settingFixedCost').value);
    
    // Save distance settings
    settings.delivery.costPerKm = parseFloat(document.getElementById('settingCostPerKm').value);
    settings.delivery.maxDistance = parseFloat(document.getElementById('settingMaxDistance').value);
    
    // Save restaurant location (Force read from inputs)
    const latInput = document.getElementById('settingRestLat').value;
    const lngInput = document.getElementById('settingRestLng').value;

    if (latInput && lngInput) {
        settings.location = { 
            lat: parseFloat(latInput), 
            lng: parseFloat(lngInput) 
        };
    }

    // Use global saveSettings from data.js
    if (typeof saveSettings === 'function') {
        saveSettings(settings);
    } else {
        localStorage.setItem('settings', JSON.stringify(settings));
    }
    
    showToast('تم حفظ الإعدادات بنجاح', 'success');
}

async function detectRestaurantLocation() {
    try {
        const btn = document.querySelector('button[onclick="detectRestaurantLocation()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ جاري التحديد...';
        btn.disabled = true;
        
        const position = await getCurrentLocation();
        document.getElementById('settingRestLat').value = position.lat;
        document.getElementById('settingRestLng').value = position.lng;
        showToast('تم تحديد الموقع بنجاح', 'success');
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    } catch (e) {
        showToast('فشل تحديد الموقع: ' + e.message, 'error');
        const btn = document.querySelector('button[onclick="detectRestaurantLocation()"]');
        if(btn) btn.disabled = false;
    }
}

function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // التحقق من إدخال جميع الحقول
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    // التحقق من كلمة السر الحالية
    const settings = getSettings();
    const storedPassword = settings.adminPassword || 'admin123'; // كلمة السر الافتراضية
    
    if (currentPassword !== storedPassword) {
        showToast('كلمة السر الحالية غير صحيحة', 'error');
        document.getElementById('currentPassword').focus();
        return;
    }
    
    // التحقق من تطابق كلمة السر الجديدة
    if (newPassword !== confirmPassword) {
        showToast('كلمة السر الجديدة غير متطابقة', 'error');
        document.getElementById('confirmPassword').focus();
        return;
    }
    
    // التحقق من طول كلمة السر الجديدة
    if (newPassword.length < 6) {
        showToast('كلمة السر يجب أن تكون 6 أحرف على الأقل', 'error');
        document.getElementById('newPassword').focus();
        return;
    }
    
    // حفظ كلمة السر الجديدة
    settings.adminPassword = newPassword;
    
    if (typeof saveSettings === 'function') {
        saveSettings(settings);
    } else {
        localStorage.setItem('settings', JSON.stringify(settings));
    }
    
    // مسح الحقول
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    showToast('تم تغيير كلمة السر بنجاح ✅', 'success');
}

// =====================================================
// IMAGE CROPPER
// =====================================================

function openCropperModal(imageSrc) {
    initCropperInstance(imageSrc);
}

// closeCropperModal is handled by closeCropModal (line 1525)
// cropAndSave handles applyCrop logic
// editExistingImage uses openCropperModal

