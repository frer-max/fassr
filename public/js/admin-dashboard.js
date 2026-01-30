// ===================================
// Admin Dashboard Logic
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Instant Render (Cached Data or Skeletons)
    // This ensures "Card and Curve" appear immediately even if data is stale or empty
    initDashboard();

    // 2. Refresh with Fresh Data
    // We need Orders (for stats), Settings (for formatting), Meals (maybe for names if missing in orders)
    initializeData({ orders: true, settings: true, meals: true }).then(() => {
        // Re-render to show latest numbers
        initDashboard();
    });
});

let revenueChartInstance = null;

async function initDashboard() {
    loadDashboardStats();
    loadMonthlyChart();
    loadTopSellingMealsList();
    
    // Auto-refresh every 5 seconds
    if (!window.ordersPollInterval) {
        window.ordersPollInterval = setInterval(async () => {
            if (typeof refreshOrders === 'function') {
                const oldOrders = JSON.stringify(getOrders());
                // refreshOrders is in data.js
                await refreshOrders();
                const newOrders = getOrders();
                
                if (JSON.stringify(newOrders) !== oldOrders) {
                    loadDashboardStats();
                    loadMonthlyChart();
                    loadTopSellingMealsList();
                }
            }
        }, 5000);
    }
}

function loadDashboardStats() {
    const orders = getOrders();
    // getOrderStats is in orders.js
    const stats = getOrderStats(); 
    
    const preparingCount = orders.filter(o => o.status === 'preparing').length;
    const readyCount = orders.filter(o => o.status === 'ready').length;
    
    const container = document.getElementById('statsGridEnhanced');
    if (container) {
        container.innerHTML = `
            <!-- 1. Total Orders -->
            <div class="stat-card-soft">
                <div class="stat-icon-soft total-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
                <div class="stat-content">
                    <div class="stat-value" data-fit="true">${stats.total}</div>
                    <div class="stat-label">إجمالي الطلبات</div>
                </div>
            </div>

            <!-- 2. Preparing -->
            <div class="stat-card-soft">
                <div class="stat-icon-soft preparing-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></div>
                <div class="stat-content">
                    <div class="stat-value" data-fit="true">${preparingCount}</div>
                    <div class="stat-label">قيد التحضير</div>
                </div>
            </div>

            <!-- 3. Ready -->
            <div class="stat-card-soft">
                <div class="stat-icon-soft ready-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div>
                <div class="stat-content">
                    <div class="stat-value" data-fit="true">${readyCount}</div>
                    <div class="stat-label">جاهز للاستلام</div>
                </div>
            </div>

            <!-- 4. Today Revenue -->
            <div class="stat-card-soft">
                <div class="stat-icon-soft revenue-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
                <div class="stat-content">
                    <div class="stat-value" data-fit="true">${formatPrice(stats.todayRevenue)}</div>
                    <div class="stat-label">دخل اليوم</div>
                </div>
            </div>

            <!-- 5. Month Revenue -->
            <div class="stat-card-soft">
                <div class="stat-icon-soft month-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                <div class="stat-content">
                    <div class="stat-value" data-fit="true">${formatPrice(stats.monthRevenue)}</div>
                    <div class="stat-label">دخل الشهر</div>
                </div>
            </div>
        `;
        
        // Auto-scale fonts to fit single line
        setTimeout(adjustStatFontSizes, 0);
    }
    
    // sidebar badges are now handled globally in admin-core.js
}

function adjustStatFontSizes() {
    document.querySelectorAll('.stat-value[data-fit="true"]').forEach(el => {
        el.style.fontSize = ''; // Reset
        let size = 1.8; // Max size (rem)
        const minSize = 0.8;
        
        // Loop to shrink until it fits
        while (el.scrollWidth > el.clientWidth && size > minSize) {
            size -= 0.1;
            el.style.fontSize = `${size}rem`;
        }
    });
}

function loadMonthlyChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    const orders = getOrders().filter(o => o.status === 'delivered');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const labels = [];
    const data = [];
    
    const dailyRevenue = new Array(daysInMonth + 1).fill(0);
    
    orders.forEach(order => {
        const d = new Date(order.createdAt);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            dailyRevenue[d.getDate()] += order.total;
        }
    });

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
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // Instant Render
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' دج';
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { family: 'Tajawal' } } },
                    y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { family: 'Tajawal' } } }
                }
            }
        });
    }
}

function loadTopSellingMealsList() {
    const container = document.getElementById('topSellingMealsList');
    if (!container) return;
    
    // getPopularMeals in orders.js
    const topMeals = getPopularMeals('today');
    
    if (topMeals.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #9ca3af; background: white; border-radius: 12px; border: 1px dashed #e5e7eb;">
                <div style="font-size: 2rem; margin-bottom: 10px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </div>
                <p>لا توجد بيانات كافية بعد</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = topMeals.map((meal, index) => {
        let rankDisplay = `<span style="font-weight: 800; color: #9ca3af;">#${index + 1}</span>`;
        if(index === 0) rankDisplay = '<span style="color: #FFD700; display:flex; justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>';
        if(index === 1) rankDisplay = '<span style="color: #C0C0C0; display:flex; justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>';
        if(index === 2) rankDisplay = '<span style="color: #CD7F32; display:flex; justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></span>';
        
        // Find full meal data to get image/category
        const fullMeal = getMeals().find(m => m.id == meal.id.split('-')[0]) || {}; // meal.id in stats might be complex
        const mergedMeal = { ...fullMeal, ...meal };

        return `
            <div class="action-order-card">
                <div class="action-card-info" style="min-width: 40px; align-items: center; justify-content: center; margin-left: 8px;">
                    ${rankDisplay}
                </div>
                
                <div style="width: 40px; height: 40px; border-radius: 8px; overflow: hidden; margin-left: 12px; flex-shrink: 0;">
                    ${window.getMealImageOrPlaceholder ? window.getMealImageOrPlaceholder(mergedMeal, 'width: 100%; height: 100%;', 'width: 100%; height: 100%; object-fit: cover;') : ''}
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
