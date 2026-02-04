// ===================================
// Admin Orders Logic
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // ⚡ Instant Render (Cache)
    if (typeof getOrders === 'function' && getOrders().length > 0) {
        renderOrders();
    }

    // ⚡ Poll Removed: Using Event-Driven Updates (SWR) from data.js
    // window.ordersPollInterval is no longer needed as refreshOrders in data.js 
    // fires 'orders-updated' which we already listen to.
    
    // Only load orders and settings
    initializeData({ orders: true, settings: true }).then(() => {
        renderOrders();
        
        // Listen for background updates (SWR pattern)
        document.addEventListener('orders-updated', renderOrders);
        
    });

    // ⚡ REALTIME HANDLED BY DATA.JS (SSE)
    // No manual polling needed here.
    
    // Setup Filter Tabs
    const tabs = document.querySelectorAll('.orders-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            currentOrderFilter = tab.dataset.status;
            renderOrders();
        });
    });

    // Setup Search and Date Filters
    const searchInput = document.getElementById('orderSearchInput');
    const dateInput = document.getElementById('orderDateFilter');
    const btnReset = document.getElementById('btnResetFilters');

    if (searchInput) {
        const executeSearch = async () => {
            const query = searchInput.value.trim();
            // If query is empty -> reload default page
            if (query.length === 0) {
                currentSearchQuery = '';
                if (typeof refreshOrders === 'function') await refreshOrders();
            } else {
                // Search Mode
                currentSearchQuery = query.toLowerCase();
                if (typeof searchOrders === 'function') {
                    showToast('جاري البحث...', 'info');
                    await searchOrders(query);
                }
            }
            renderOrders();
        };

        // Trigger on Enter key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                executeSearch();
            }
        });

        // Trigger on Search Button click
        const btnSearch = document.getElementById('btnExecuteSearch');
        if (btnSearch) {
            btnSearch.addEventListener('click', executeSearch);
        }
    }

    if (dateInput) {
        dateInput.addEventListener('change', () => {
            currentDateFilter = dateInput.value;
            renderOrders();
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', async () => {
            // Also refresh data from server
            if (typeof refreshOrders === 'function') {
                showToast('جاري تحديث البيانات...', 'info');
                await refreshOrders();
            }
            // Clear filters but keep tab if needed? 
            // Usually reset means back to defaults
            searchInput.value = '';
            dateInput.value = '';
            currentSearchQuery = '';
            currentDateFilter = '';
            renderOrders();
            showToast('تم تحديث البيانات وإعادة تعيين التصفية', 'success');
        });
    }
});

let currentOrderFilter = 'new'; // 'new', 'preparing', 'ready', 'delivered', 'cancelled', 'all'
let currentSearchQuery = '';
let currentDateFilter = '';

function renderOrders() {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    let orders = getOrders();
    
    // Update tabs UI
    const tabs = document.querySelectorAll('.orders-tab');
    tabs.forEach(tab => {
        if (tab.dataset.status === currentOrderFilter) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // 1. Filter by Search Query (Global Search - Overrides Status Tab)
    // If user is searching, we look through ALL orders regardless of their status
    if (currentSearchQuery) {
        // Special Case: Search by Order Number specifically using "+" prefix (e.g., "+123")
        if (currentSearchQuery.startsWith('+')) {
            const numberQuery = currentSearchQuery.substring(1).trim(); 
            if (numberQuery) {
                orders = orders.filter(o => o.orderNumber && o.orderNumber.toString() === numberQuery);
            }
        } 
        // Standard Broad Search
        else {
            orders = orders.filter(o => {
                // Prepare searchable fields
                const name = o.customerName ? o.customerName.toLowerCase() : '';
                
                // Robust Phone Search: Remove spaces/dashes, ensure string
                const rawPhone = o.customerPhone ? o.customerPhone.toString() : '';
                const cleanPhone = rawPhone.replace(/\s|-/g, ''); 
                
                // Product Names
                const hasProduct = o.items && o.items.some(item => 
                    item.name && item.name.toLowerCase().includes(currentSearchQuery)
                );

                return (
                    name.includes(currentSearchQuery) ||
                    rawPhone.includes(currentSearchQuery) || // Match "06 61" if user types "06 61"
                    cleanPhone.includes(currentSearchQuery) || // Match "0661" if user types "0661" (against "06 61")
                    hasProduct
                );
            });
        }
    } else {
        // Only apply Status Filter if NOT searching
        if (currentOrderFilter !== 'all') {
            if (currentOrderFilter === 'cancelled') {
                 // Match any status starting with 'cancelled' (legacy, client, admin)
                 orders = orders.filter(o => o.status && o.status.startsWith('cancelled'));
            } else {
                 orders = orders.filter(o => o.status === currentOrderFilter);
            }
        }
    }

    // 3. Filter by Date
    if (currentDateFilter) {
        orders = orders.filter(o => {
            const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
            return orderDate === currentDateFilter;
        });
    }
    
    // 4. Sort logic
    if (currentOrderFilter === 'all') {
        const statusPriority = {
            'new': 0,
            'preparing': 1,
            'ready': 2,
            'onTheWay': 3,
            'delivered': 4,
            'cancelled': 5
        };
        
        orders.sort((a, b) => {
            const priorityA = statusPriority[a.status] !== undefined ? statusPriority[a.status] : 99;
            const priorityB = statusPriority[b.status] !== undefined ? statusPriority[b.status] : 99;
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            // Secondary sort: Newest first within same status
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    } else {
        // Default sort: Newest first
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #9ca3af;">
                <div style="margin-bottom: 10px; display:inline-block;"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
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
                <button class="btn-status-action prev" onclick="updateStatus('${order.id}', 'new')" title="رجوع للحالة السابقة"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg></button>
                <button class="btn-status-action next" onclick="updateStatus('${order.id}', 'ready')">جاهز</button>
            `;
        } else if (order.status === 'ready') {
            actionButtons = `
                <button class="btn-status-action prev" onclick="updateStatus('${order.id}', 'preparing')" title="رجوع للحالة السابقة"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg></button>
                <button class="btn-status-action next" onclick="updateStatus('${order.id}', 'delivered')">تم التسليم</button>
            `;
        } else if (order.status === 'delivered') {
            actionButtons = `
                <button class="btn-status-action prev" onclick="safeUpdateStatus('${order.id}', 'ready', 'delivered')" title="رجوع للحالة السابقة"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg> تراجع</button>
            `;
        } else if (order.status && order.status.startsWith('cancelled')) {
            actionButtons = `
                <button class="btn-status-action next" onclick="updateStatus('${order.id}', 'new')" style="background:var(--success); color:white;">إستعادة الطلب</button>
            `;
        }
        
        // Count items
        const itemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
        
        return `
            <div class="order-card-row">
                <div class="order-row-start">
                    <div class="order-number">#${order.orderNumber}</div>
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
                                ${order.orderType === 'delivery' ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg> توصيل' : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3"></path></svg> طاولة'}
                            </span>
                        </h4>
                        <p>
                            <span><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.12 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${order.customerPhone}</span>
                            <span><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${new Date(order.createdAt).toLocaleTimeString('ar-DZ', {hour:'2-digit', minute:'2-digit'})}</span>
                        </p>
                    </div>
                    <div style="flex: 1; color: #6b7280; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                        <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></span> ${itemsCount} منتجات
                    </div>
                </div>
                
                <div class="order-row-end">
                    <div class="order-total">${formatPrice(order.total)}</div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-order-view" onclick="viewOrderDetails('${order.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Pagination Button
    if (typeof getOrdersPagination === 'function') {
        const panigation = getOrdersPagination();
        if (panigation && panigation.page < panigation.totalPages) {
            container.innerHTML += `
                <div style="text-align: center; margin-top: 20px; padding-bottom: 20px;">
                    <button onclick="triggerLoadMore()" class="btn-primary" id="btnLoadMoreOrders" style="padding: 10px 20px; font-size: 14px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:8px;"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
                        عرض المزيد (${panigation.total - (panigation.page * panigation.limit)} متبقي)
                    </button>
                </div>
            `;
            
            // Helper for the button
            if (!window.triggerLoadMore) {
                window.triggerLoadMore = async function() {
                    const btn = document.getElementById('btnLoadMoreOrders');
                    if(btn) { btn.textContent = 'جاري التحميل...'; btn.disabled = true; }
                    
                    if (typeof loadMoreOrders === 'function') {
                        await loadMoreOrders();
                        // renderOrders will be called by event listener 'orders-updated' automatically
                    }
                };
            }
        }
    }
}

function safeUpdateStatus(orderId, newStatus, currentStatus) {
    // ⚡ removed confirm for speed
    updateStatus(orderId, newStatus);
}

// Ensure updateStatus uses the one from orders.js or defined here?
// orders.js has updateOrderStatus(id, status).
async function updateStatus(orderId, status) {
    // 1. Optimistic Update (Instant)
    const order = getOrders().find(o => o.id == orderId); 
    if (order) {
        order.status = status; 
    }
    
    // Instant Render
    renderOrders();
    // ⚡ Removed 'Changing...' toast for speed

    // 2. Background Sync
    try {
        const success = await updateOrderStatus(orderId, status);
        
        if (success) {
            // ⚡ Removed 'Saved' toast for professional silence - visual feedback is enough
        } else {
            throw new Error("Update returned false");
        }
    } catch (e) {
        console.error("Optimistic update failed:", e);
        // Revert UI on failure
        if (order) {
             await refreshOrders();
             renderOrders();
        }
        showToast('فشل تغيير الحالة - تم التراجع', 'error');
    }
}

async function cancelOrderBtn(orderId) {
    // ⚡ Instant cancellation without confirm
    await updateStatus(orderId, 'cancelled');
}

// =======================
// Modal & Details Logic
// =======================

function viewOrderDetails(orderId) {
    const order = getOrderById(orderId);
    if (!order) return;
    
    const modalBody = document.getElementById('orderModalBody');
    const itemsHtml = order.items.map(item => `
        <div class="modal-item-row">
            <div class="item-visual" style="width: 50px; height: 50px; border-radius: 8px; overflow: hidden; margin-left: 12px; flex-shrink: 0;">
                ${window.getMealImageOrPlaceholder ? window.getMealImageOrPlaceholder(
                    { ...item, image: item.image, categoryId: item.categoryId } // Pass item as meal-like object
                ) : ''}
            </div>
            <div class="item-info">
                <span class="item-qty">${item.quantity}</span>
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    ${item.sizeName ? `<div class="item-size">${item.sizeName}</div>` : ''}
                </div>
            </div>
            <div class="item-price">${formatPrice(item.price * item.quantity)}</div>
        </div>
    `).join('');
    
    let locationButtons = '';
    if (order.location && order.location.lat && order.location.lng) {
        locationButtons = `
            <div class="location-actions">
                <button onclick="openLocationInMaps(${order.location.lat}, ${order.location.lng})" class="btn-location map">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    فتح الخريطة
                </button>
                <button onclick="copyLocation(${order.location.lat}, ${order.location.lng})" class="btn-location copy">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    نسخ الإحداثيات
                </button>
            </div>
        `;
    } else if (order.orderType === 'delivery') {
        const addrText = order.address || '';
        const safeAddr = addrText.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        locationButtons = `
            <div class="location-actions">
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addrText)}" target="_blank" class="btn-location map" style="text-decoration:none;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    بحث في الخريطة
                </a>
                <button onclick="copyToClipboard('${safeAddr}')" class="btn-location copy">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    نسخ العنوان
                </button>
            </div>
        `;
    }
    
    const statusColor = getStatusColor(order.status);
    const statusText = getStatusText(order.status);

    modalBody.innerHTML = `
        <div class="order-modal-content">
            <!-- Header -->
            <div class="order-details-header">
                <div class="order-id-badge">
                    <span class="label">رقم الطلب</span>
                    <div class="value">#${order.orderNumber}</div>
                </div>
                <div class="order-status-pill" style="background: ${statusColor}15; color: ${statusColor}; align-self: center; display: inline-flex;">
                    <span class="dot"></span>
                    ${statusText}
                </div>
            </div>

            <!-- Customer Card -->
            <div class="details-card customer-card">
                <h4 class="card-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    بيانات العميل
                </h4>
                
                <div class="info-row">
                    <span class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></span>
                    <span class="text">${order.customerName}</span>
                </div>
                
                <div class="info-row">
                    <span class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.12 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>
                    <a href="tel:${order.customerPhone}" style="color: inherit; text-decoration: none;" class="text">${order.customerPhone}</a>
                </div>

                <div class="info-row">
                    <span class="icon">
                        ${order.orderType === 'delivery' ? 
                            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>' : 
                            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3"></path></svg>'
                        }
                    </span>
                    <span class="text" style="color: var(--primary);">${order.orderType === 'delivery' ? 'طلب توصيل' : 'تناول في المطعم'}</span>
                </div>

                ${order.orderType === 'delivery' ? `
                <div class="info-row">
                    <span class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></span>
                    <span class="text">${order.address || (order.location ? 'موقع محدد على الخريطة' : '⚠️ العنوان غير محدد')}</span>
                </div>
                ` : ''}

                <!-- Responsive Buttons Grid -->
                ${locationButtons}
            </div>

            ${order.notes ? `
            <div class="details-card notes-card" style="background: #fffbea; border-color: #fef3c7;">
                <h4 class="card-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    ملاحظات
                </h4>
                <p class="notes-text" style="font-style: italic; color: #b45309;">${order.notes}</p>
            </div>
            ` : ''}
            
            <!-- Items Card -->
            <div class="details-card items-card">
                <h4 class="card-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    المشتريات (${order.items.length})
                </h4>
                <div class="items-list">
                    ${itemsHtml}
                </div>
            </div>
            
            <!-- Summary Card -->
            <div class="details-card summary-card">
                <div class="summary-row">
                    <span>المجموع الفرعي</span>
                    <span>${formatPrice(order.subtotal)}</span>
                </div>
                <div class="summary-row">
                    <span>رسوم التوصيل</span>
                    <span>${formatPrice(order.deliveryCost)}</span>
                </div>
                <div class="summary-row total">
                    <span>الإجمالي النهائي</span>
                    <span>${formatPrice(order.total)}</span>
                </div>
            </div>

            <div class="modal-actions-footer" style="margin-top: 10px;">
                <button onclick="printOrder('${order.id}')" class="btn-print-order" style="width: 100%; justify-content: center; background: #1e293b; color: white; padding: 14px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    طباعة الفاتورة
                </button>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('orderModal');
    modal.classList.add('active');
    
    // Close on overlay click
    modal.onclick = (e) => {
        if (e.target === modal) closeOrderModal();
    };
}



function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

function openLocationInMaps(lat, lng) {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
}

function copyLocation(lat, lng) {
    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
    copyToClipboard(mapsLink);
}

function printOrder(orderId) {
    const order = getOrderById(orderId);
    if (!order) return;
    
    const settings = getSettings();
    const printWindow = window.open('', '', 'width=400,height=600');
    
    const itemsHtml = order.items.map(item => `
        <tr class="item-row">
            <td style="vertical-align: top;">${item.quantity}x</td>
            <td class="item-name"><div>${item.name}</div>${item.sizeName ? `<div class="item-variant">${item.sizeName}</div>` : ''}</td>
            <td class="item-price">${formatPrice(item.price * item.quantity)}</td>
        </tr>
    `).join('');
    
    const html = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>فاتورة #${order.orderNumber}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
                body { margin: 0; padding: 10px; font-family: 'Tajawal', sans-serif; font-size: 14px; max-width: 300px; margin: 0 auto; }
                .receipt-container { width: 100%; }
                .header { text-align: center; margin-bottom: 15px; }
                .logo { font-size: 30px; margin-bottom: 5px; }
                .store-name { font-size: 18px; font-weight: 800; margin: 5px 0; }
                .store-info { font-size: 12px; margin-bottom: 5px; }
                .separator { border-bottom: 1px dashed #000; margin: 10px 0; width: 100%; }
                .order-info { font-size: 13px; margin-bottom: 5px; }
                .customer-block { margin: 10px 0; padding: 5px 0; font-size: 13px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th { text-align: right; border-bottom: 1px solid #000; padding: 5px 0; font-size: 12px; }
                td { padding: 6px 0; vertical-align: top; }
                .item-name { padding-right: 5px; }
                .item-variant { font-size: 11px; color: #444; }
                .item-price { text-align: left; white-space: nowrap; }
                .totals { margin-top: 5px; }
                .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 13px; }
                .grand-total { font-weight: 800; font-size: 16px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                @media print { @page { margin: 0; size: 80mm auto; } body { padding: 5px; max-width: 100%; } }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="header">
                    <div class="logo"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5s-6 6.5-6 11c0 3 2.5 5.5 6 5.5s6-2.5 6-5.5c0-4.5-6-11-6-11z" fill="#000"/></svg></div>
                    <div class="store-name">${settings.name || 'Fast Food'}</div>
                    <div class="store-info">${settings.phone || ''}</div>
                    <div class="store-info">${new Date().toLocaleString('ar-DZ')}</div>
                </div>
                <div class="separator"></div>
                <div class="order-info">
                    <div style="font-weight: bold; font-size: 16px; text-align: center;">طلب #${order.orderNumber}</div>
                </div>
                
                <div class="customer-block">
                    <div><strong>${order.customerName}</strong></div>
                    <div>${order.customerPhone}</div>
                </div>
                
                <table>
                    <thead><tr><th style="width: 25px;">#</th><th>الصنف</th><th style="text-align: left; width: 60px;">السعر</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                
                <div class="separator"></div>
                
                <div class="totals">
                    <div class="total-row"><span>المجموع:</span><span>${formatPrice(order.subtotal)}</span></div>
                    ${order.deliveryCost > 0 ? `<div class="total-row"><span>التوصيل:</span><span>${formatPrice(order.deliveryCost)}</span></div>` : ''}
                    <div class="total-row grand-total"><span>الإجمالي:</span><span>${formatPrice(order.total)}</span></div>
                </div>
                
                <div class="footer"><div>شكراً لطلبك!</div></div>
            </div>
            <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); }</script>
        </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
}
