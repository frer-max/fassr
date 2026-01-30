// =====================================================
// أدوات مساعدة - Utility Functions
// =====================================================

// تنسيق العملة
function formatPrice(amount) {
    let currency = 'دج';
    if (typeof getSettings === 'function') {
        const settings = getSettings();
        if (settings && settings.currency) {
            currency = settings.currency;
        }
    }
    return Number(amount).toLocaleString('fr-DZ') + ' ' + currency;
}
// Alias for compatibility
function formatCurrency(amount) {
    return formatPrice(amount);
}

// توليد معرف فريد
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// توليد رقم طلب عشوائي
function generateOrderNumber() {
    return '#' + Math.floor(1000 + Math.random() * 9000);
}

// إظهار تنبيه (Toast Notification)
function showToast(message, type = 'info') {
    // Create container if not exists
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Inline styles for high priority
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let bgColor = 'white';
    let textColor = '#333';
    let borderColor = '#3b82f6';
    let icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'; // info
    
    if (type === 'success') { 
        borderColor = '#10b981'; 
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'; 
    }
    if (type === 'error') { 
        borderColor = '#ef4444'; 
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'; 
    }
    if (type === 'warning') { 
        borderColor = '#f59e0b'; 
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'; 
    }
    
    // Check for dark mode
    if (document.body.getAttribute('data-theme') === 'dark') {
        bgColor = '#1f2937';
        textColor = '#f3f4f6';
    }

    toast.style.cssText = `
        background: ${bgColor}; 
        color: ${textColor};
        padding: 12px 24px; 
        border-radius: 8px; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
        border-right: 4px solid ${borderColor}; 
        display: flex; 
        align-items: center; 
        gap: 12px; 
        min-width: 250px; 
        font-weight: 500; 
        pointer-events: auto;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
    `;
    
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    
    // Remove after 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Toggle Theme
// Toggle Theme (Disabled)
function toggleTheme() {
    // Feature removed as per request
    document.body.removeAttribute('data-theme');
    localStorage.removeItem('theme');
}

// Init theme (Force Default/Light)
function initTheme() {
    document.body.removeAttribute('data-theme');
    localStorage.removeItem('theme');
}

// Confirm Action Wrapper
function confirmAction(message) {
    return new Promise((resolve) => {
        // Use browser confirm for now, could be custom modal later
        const result = confirm(message);
        resolve(result);
    });
}

// Calculate delivery cost
function calculateDeliveryCost(subtotal, distance = 0) {
    // getSettings() is in data.js, must be available globally
    if (typeof getSettings !== 'function') return 0;

    const settings = getSettings();
    if (!settings.delivery || !settings.delivery.enabled) return 0;
    
    if (settings.delivery.type === 'free') return 0;
    if (settings.delivery.freeAbove && subtotal >= settings.delivery.freeAbove) return 0;
    
    if (settings.delivery.type === 'fixed') {
        return settings.delivery.fixedCost || 0;
    }
    
    // Distance based (simple logic)
    if (settings.delivery.type === 'distance') {
        if (distance > settings.delivery.maxDistance) return 9999; // Too far
        return distance * (settings.delivery.costPerKm || 0);
    }

    return 0;
}

// التحقق من رقم الهاتف الجزائري
function validatePhone(phone) {
    if (!phone) return false;
    // تنظيف الرقم من المسافات
    const cleanPhone = phone.replace(/\s/g, '');
    // التحقق من الصيغة: يبدأ بـ 05, 06, أو 07 ويتكون من 10 أرقام
    const phoneRegex = /^0[5-7][0-9]{8}$/;
    return phoneRegex.test(cleanPhone);
}

// تنسيق التاريخ والوقت
function formatDateTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // التحقق من صحة التاريخ
    if (isNaN(date.getTime())) return dateString;
    
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    
    try {
        return date.toLocaleDateString('ar-DZ', options);
    } catch {
        // Fallback إذا لم تدعم اللغة العربية
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
}

// تنسيق التاريخ فقط
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    try {
        return date.toLocaleDateString('ar-DZ', options);
    } catch {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
}

// إظهار مؤشر التحميل
function showLoading(message = 'جاري التحميل...') {
    // إزالة أي مؤشر تحميل موجود
    hideLoading();
    
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p class="loading-message">${message}</p>
        </div>
    `;
    
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        backdrop-filter: blur(4px);
    `;
    
    const content = overlay.querySelector('.loading-content');
    content.style.cssText = `
        text-align: center;
        color: white;
    `;
    
    const spinner = overlay.querySelector('.loading-spinner');
    spinner.style.cssText = `
        width: 50px;
        height: 50px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top-color: #f97316;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    `;
    
    // إضافة الـ keyframes للـ animation
    if (!document.getElementById('loadingSpinnerStyle')) {
        const style = document.createElement('style');
        style.id = 'loadingSpinnerStyle';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(overlay);
}

// إخفاء مؤشر التحميل
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// الحصول على الموقع الجغرافي الحالي
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('المتصفح لا يدعم تحديد الموقع'));
            return;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                let message = 'فشل في تحديد الموقع';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'تم رفض إذن تحديد الموقع';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'معلومات الموقع غير متاحة';
                        break;
                    case error.TIMEOUT:
                        message = 'انتهت مهلة طلب الموقع';
                        break;
                }
                reject(new Error(message));
            },
            options
        );
    });
}

// حساب المسافة بين نقطتين (بالكيلومتر)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// نسخ نص للحافظة
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text)
            .then(() => {
                showToast('تم النسخ!', 'success');
                return true;
            })
            .catch(() => {
                fallbackCopyToClipboard(text);
                return false;
            });
    } else {
        return fallbackCopyToClipboard(text);
    }
}

// نسخ بديل للمتصفحات القديمة
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.cssText = 'position: fixed; left: -9999px;';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('تم النسخ!', 'success');
        return true;
    } catch (err) {
        showToast('فشل النسخ', 'error');
        return false;
    } finally {
        document.body.removeChild(textArea);
    }
}

// توليد HTML لصورة الوجبة أو العنصر البديل (شعار القسم أو الشعار الافتراضي)
/**
 * @param {Object} meal - كائن الوجبة
 * @param {string} style - ستايل اختياري للحاوية
 * @param {string} imgStyle - ستايل الصورة
 * @param {number} iconScale - نسبة حجم الأيقونة (0-1)
 */
function getMealImageOrPlaceholder(meal, style = '', imgStyle = '', iconScale = 0.6) {
    if (meal && meal.image) {
        return `<img src="${meal.image}" alt="${meal.name}" style="${imgStyle}" loading="lazy">`;
    }

    // محاولة الحصول على أيقونة القسم
    let categoryIcon = null;
    if (meal) {
         // Attempt to find category via global getCategories if available
         if (typeof getCategories === 'function') {
            let catId = meal.categoryId;
            
            // If catId is missing (e.g. cart item), try to find it from global meals
            if (!catId && typeof getMeals === 'function') {
                const globalMeal = getMeals().find(m => m.id == meal.id);
                if (globalMeal) catId = globalMeal.categoryId;
            }

            const cat = getCategories().find(c => c.id == catId);
            if (cat && cat.icon) categoryIcon = cat.icon;
         }
         // Fallback: check if icon is directly on the meal object (e.g. cart items might have it)
         if (!categoryIcon && meal.categoryIcon) {
            categoryIcon = meal.categoryIcon;
         }
    }

    const placeholderContent = categoryIcon 
        ? `<div class="category-icon-placeholder" style="font-size: 2.5rem; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">${categoryIcon}</div>`
        : `<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f37d.svg" alt="placeholder" style="width: ${iconScale * 100}%; height: ${iconScale * 100}%; object-fit: contain;">`;

    return `<div class="meal-placeholder" style="display:flex; align-items:center; justify-content:center; background:#f8fafc; width:100%; height:100%; ${style}">
                ${placeholderContent}
            </div>`;
}
// Export globally
window.getMealImageOrPlaceholder = getMealImageOrPlaceholder;

// Run init on load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
});
