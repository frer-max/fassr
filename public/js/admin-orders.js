// ===================================
// Admin Orders Logic
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Only load orders and settings
    initializeData({ orders: true, settings: true }).then(() => {
        renderOrders();
        
        // Auto-refresh orders
        setInterval(async () => {
            if (typeof refreshOrders === 'function') {
                const oldOrders = JSON.stringify(getOrders());
                await refreshOrders();
                const newOrders = getOrders();
                if (JSON.stringify(newOrders) !== oldOrders) {
                    renderOrders();
                }
            }
        }, 5000);
    });
    
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
});

let currentOrderFilter = 'new'; // 'new', 'preparing', 'ready', 'delivered', 'cancelled', 'all'

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
    
    // Filter
    if (currentOrderFilter !== 'all') {
        orders = orders.filter(o => o.status === currentOrderFilter);
    }
    
    // Check Alerts (Moved from dashboard logic if we want alerts here too)
    // For now skipping duplicate alert logic to keep it simple
    
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
                            <span class="order-type-badge ${order.orderType === 'delivery' ? 'type-delivery' : 'type-dinein'}">
                                ${order.orderType === 'delivery' ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg> توصيل' : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3"></path></svg> طاولة'}
                            </span>
                        </h4>
                        <p>
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
}

function safeUpdateStatus(orderId, newStatus, currentStatus) {
    if (currentStatus === 'delivered') {
        if (!confirm('⚠️ تنبيه: هل أنت متأكد من التراجع عن حالة "تم التسليم"؟\n\nسيتم إعادة الطلب إلى قائمة "جاهز للاستلام".')) {
            return;
        }
    }
    updateStatus(orderId, newStatus);
}

// Ensure updateStatus uses the one from orders.js or defined here?
// orders.js has updateOrderStatus(id, status).
async function updateStatus(orderId, status) {
    // updateOrderStatus is in orders.js
    if (await updateOrderStatus(orderId, status)) {
        showToast(`تم تغيير حالة الطلب إلى ${getStatusText(status)}`, 'success');
        renderOrders();
    } else {
        showToast('فشل تغيير الحالة', 'error');
    }
}

async function cancelOrderBtn(orderId) {
    // cancelOrder is in orders.js
    if (confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
        const success = await cancelOrder(orderId);
        if (success) {
            showToast('تم إلغاء الطلب', 'success');
            renderOrders();
        }
    }
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
        <div class="order-details-container">
            <div class="order-details-header">
                <div class="order-id-badge">
                    <span class="label">رقم الطلب</span>
                    <span class="value">#${order.orderNumber}</span>
                </div>
                <div class="order-status-pill" style="background: ${statusColor}15; color: ${statusColor};">
                    <span class="dot"></span>
                    ${statusText}
                </div>
            </div>

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
                    <a href="tel:${order.customerPhone}" class="phone-link">
                        <span class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.12 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></span>
                        <span class="text">${order.customerPhone}</span>
                    </a>
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
                ${locationButtons}
            </div>

            ${order.notes ? `
            <div class="details-card notes-card">
                <h4 class="card-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    ملاحظات الطلب
                </h4>
                <p class="notes-text">${order.notes}</p>
            </div>
            ` : ''}
            
            <div class="details-card items-card">
                <h4 class="card-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                    قائمة المشتريات
                </h4>
                <div class="items-list">
                    ${itemsHtml}
                </div>
            </div>
            
            <div class="details-card summary-card">
                <div class="summary-row">
                    <span>المجموع الفرعي</span>
                    <span>${formatPrice(order.subtotal)}</span>
                </div>
                <div class="summary-row">
                    <span>رسوم التوصيل</span>
                    <span>${formatPrice(order.deliveryCost)}</span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-row total">
                    <span>الإجمالي النهائي</span>
                    <span>${formatPrice(order.total)}</span>
                </div>
            </div>

            <div class="modal-actions-footer">
                <button onclick="printOrder('${order.id}')" class="btn-print-order">
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
