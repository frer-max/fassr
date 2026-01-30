// =====================================================
// تطبيق الواجهة الرئيسية - Main App
// =====================================================

let currentCategory = null;
let searchQuery = '';

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// تهيئة التطبيق
async function initializeApp() {
    // تطبيق الإعدادات المحفوظة فوراً لتجنب الوميض
    loadRestaurantSettings();

    // تهيئة البيانات والانتظار حتى تكتمل
    // عرض واجهة التحميل الوهمية (Skeleton) فوراً لإعطاء شعور بالسرعة
    renderSkeletonLoading();

    if (typeof initializeData === 'function') {
        await initializeData();
    }
    
    // تحميل إعدادات المطعم مرة أخرى (لتحديثها بالبيانات الجديدة)
    loadRestaurantSettings();
    
    // عرض الفئات
    renderCategories();
    
    // عرض الوجبات
    renderMeals();
    
    // إعداد البحث
    setupSearch();
    
    // إعداد تفاعل الرأس مع التمرير
    setupHeaderScroll();
    
    // إخفاء التحميل تدريجياً
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        // Minimum wait to ensure animation is seen (optional aesthetic choice)
        setTimeout(() => {
            loader.classList.add('fade-out');
            setTimeout(() => loader.remove(), 500); // Wait for transition
        }, 800); 
    }
}

// عرض واجهة التحميل (Skeleton)
function renderSkeletonLoading() {
    const container = document.getElementById('mealsContainer');
    const catContainer = document.getElementById('categoriesContainer');
    
    if (catContainer && !catContainer.hasChildNodes()) {
         catContainer.innerHTML = Array(5).fill(0).map(() => `
            <div class="category-btn skeleton-cat"></div>
        `).join('');
    }

    if (container) {
        container.innerHTML = Array(6).fill(0).map((_, i) => `
            <div class="meal-card skeleton-card" style="animation-delay: ${i * 0.1}s">
                <div class="meal-image skeleton-image">
                    <div class="skeleton-shimmer"></div>
                </div>
                <div class="meal-content">
                    <div class="skeleton-text title"></div>
                    <div class="skeleton-text desc"></div>
                    <div class="meal-footer">
                        <div class="skeleton-text price"></div>
                        <div class="skeleton-btn"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// تحميل إعدادات المطعم
function loadRestaurantSettings() {
    const settings = getSettings();
    
    // تحديث اسم المطعم
    // تحديث اسم المطعم
    if (settings.restaurantName) {
        const elements = ['logoName', 'footerName', 'copyrightName', 'pageTitle'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'pageTitle') {
                    el.textContent = settings.restaurantName + ' - اطلب الآن';
                } else {
                    el.textContent = settings.restaurantName;
                }
            }
        });
    }

    // تحديث معلومات الاتصال (الهاتف والعنوان)
    const phoneEl = document.getElementById('contactPhone');
    if (phoneEl && settings.contactPhone) {
        // Use contactPhone from settings if available (preferred)
        phoneEl.innerHTML = `📞 <a href="tel:${settings.contactPhone}" style="color: inherit;">${settings.contactPhone}</a>`;
    } else if (phoneEl && settings.phone) {
        // Fallback to legacy 'phone' field
        phoneEl.innerHTML = `📞 <a href="tel:${settings.phone}" style="color: inherit;">${settings.phone}</a>`;
    }

    const addressEl = document.getElementById('contactAddress');
    if (addressEl && settings.address) {
        addressEl.textContent = '📍 ' + settings.address;
    }
    
    // تحديث حالة المطعم (مفتوح/مغلق)
    const statusEl = document.querySelector('.restaurant-status');
    if (statusEl) {
        if (settings.isOpen === true) {
            statusEl.style.display = 'flex'; // Ensure visible
            statusEl.classList.remove('closed');
            statusEl.classList.add('open');
            statusEl.querySelector('span:last-child').textContent = 'مفتوح الآن';
        } else if (settings.isOpen === false) {
            statusEl.style.display = 'flex'; // Ensure visible
            statusEl.classList.remove('open');
            statusEl.classList.add('closed');
            statusEl.querySelector('span:last-child').textContent = 'مغلق حالياً';
        } else {
            // الحالة غير معروفة بعد (null) - إخفاء المؤشر
            statusEl.style.display = 'none';
        }
    }

    // تحديث السنة الحالية
    const yearEl = document.getElementById('currentYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}

// عرض الفئات
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    const categories = getCategories().filter(c => c.active).sort((a, b) => a.order - b.order);
    
    if (categories.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">لا توجد فئات</p>';
        return;
    }
    
    // إضافة زر "الكل"
    let html = `
        <button class="category-btn ${!currentCategory ? 'active' : ''}" onclick="filterByCategory(null)">
            <span class="category-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3"/></svg>
            </span>
            <span class="category-name">الكل</span>
        </button>
    `;
    
    // إضافة باقي الفئات
    html += categories.map(cat => `
        <button class="category-btn ${currentCategory === cat.id ? 'active' : ''}" onclick="filterByCategory(${cat.id})">
            <span class="category-icon">${cat.icon}</span>
            <span class="category-name">${cat.name}</span>
        </button>
    `).join('');
    
    container.innerHTML = html;
    
    // Check for scroll buttons after rendering
    setTimeout(checkScrollButtons, 100);
}

// تصفية الوجبات حسب الفئة
function filterByCategory(categoryId) {
    currentCategory = categoryId;
    renderCategories();
    renderMeals();
}

// إعداد البحث
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderMeals();
    });
}

// عرض الوجبات
function renderMeals() {
    const container = document.getElementById('mealsContainer');
    if (!container) return;
    
    let meals = getMeals().filter(m => m.active);
    
    // تصفية حسب الفئة
    if (currentCategory) {
        meals = meals.filter(m => m.categoryId === currentCategory);
    }
    
    // تصفية حسب البحث
    if (searchQuery) {
        meals = meals.filter(m => 
            m.name.toLowerCase().includes(searchQuery) ||
            m.description.toLowerCase().includes(searchQuery)
        );
    }
    
    // ترتيب الوجبات
    meals.sort((a, b) => {
        // الوجبات الشائعة أولاً
        if (a.popular && !b.popular) return -1;
        if (!a.popular && b.popular) return 1;
        return a.order - b.order;
    });
    
    if (meals.length === 0) {
        container.innerHTML = `
            <div class="no-meals">
                <div class="no-meals-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <!-- Plate -->
                        <circle cx="12" cy="12" r="9" stroke="#E5E7EB" stroke-width="2"/>
                        <circle cx="12" cy="12" r="6" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="2 2"/>
                        
                        <!-- Fork (Left, slightly tilted) -->
                        <path d="M7 6V11C7 12 8 13 8 13H5C5 13 6 12 6 11V6" stroke="#9CA3AF" stroke-width="1.5"/>
                        <line x1="6.5" y1="6" x2="6.5" y2="10" stroke="#9CA3AF"/>
                        <line x1="5.5" y1="13" x2="5.5" y2="18" stroke="#9CA3AF" stroke-width="1.5"/>
                        
                        <!-- Spoon (Right, slightly tilted) -->
                        <path d="M17 18V13C17 13 19 11 19 8C19 6 18 5 17 5C16 5 15 6 15 8C15 11 17 13 17 13Z" stroke="#9CA3AF" stroke-width="1.5"/>
                        

                    </svg>
                </div>
                <h3>لا توجد وجبات</h3>
                <p>${searchQuery ? 'لم نجد وجبات تطابق بحثك' : 'لا توجد وجبات في هذه الفئة'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = meals.map((meal, index) => createMealCard(meal, index)).join('');
}

// إعداد تأثير التمرير للرأس
function setupHeaderScroll() {
    const header = document.getElementById('mainHeader');
    if (!header) return;

    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll);
    // استدعاء فوري لضبط الحالة عند التحميل
    handleScroll();
}

// إنشاء بطاقة وجبة
function createMealCard(meal, index) {
    const displayPrice = meal.hasSizes && meal.sizes.length > 0 
        ? meal.sizes[0].price 
        : meal.price;
    
    const priceLabel = meal.hasSizes && meal.sizes.length > 0 
        ? 'يبدأ من ' 
        : '';
    
    return `
        <div class="meal-card fade-in" style="animation-delay: ${index * 0.05}s" onclick="openMealModal(${meal.id})">
            <div class="meal-image">
                ${window.getMealImageOrPlaceholder 
                    ? window.getMealImageOrPlaceholder(meal) 
                    : (meal.image ? `<img src="${meal.image}" alt="${meal.name}" loading="lazy">` : '')}
            </div>
            <div class="meal-content">
                <h3 class="meal-name">${meal.name}</h3>
                <p class="meal-description">${meal.description}</p>
                <div class="meal-footer">
                    <div class="meal-price">
                        <span class="price-label">${priceLabel}</span>
                        <span class="price-value">${formatPrice(displayPrice)}</span>
                    </div>
                    <button class="btn btn-primary btn-sm meal-add-btn" onclick="event.stopPropagation(); quickAddToCart(${meal.id})">
                        <span>+</span> أضف
                    </button>
                </div>
            </div>
        </div>
    `;
}

// إضافة سريعة للسلة
function quickAddToCart(mealId) {
    const meal = getMeals().find(m => m.id === mealId);
    if (!meal) return;
    
    if (meal.hasSizes && meal.sizes.length > 0) {
        // إذا كانت الوجبة لها أحجام، افتح النافذة المنبثقة
        openMealModal(mealId);
    } else {
        // إضافة مباشرة
        addToCart(mealId, null, 1);
    }
}

// فتح نافذة تفاصيل الوجبة
function openMealModal(mealId) {
    const meal = getMeals().find(m => m.id === mealId);
    if (!meal) return;
    
    // إزالة أي modal موجود
    const existingModal = document.getElementById('mealModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'mealModal';
    modal.className = 'modal-overlay';
    
    const sizesHtml = meal.hasSizes && meal.sizes.length > 0 
        ? `
            <div class="size-selection">
                <label class="form-label">اختر الحجم:</label>
                <div class="size-options">
                    ${meal.sizes.map((size, i) => `
                        <label class="size-option ${i === 0 ? 'selected' : ''}">
                            <input type="radio" name="mealSize" value="${size.name}" ${i === 0 ? 'checked' : ''}>
                            <span class="size-name">${size.name}</span>
                            <span class="size-price">${formatPrice(size.price)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `
        : '';
    
    const currentPrice = meal.hasSizes && meal.sizes.length > 0 
        ? meal.sizes[0].price 
        : meal.price;
    
    modal.innerHTML = `
        <div class="modal meal-modal">
            <button class="modal-close" onclick="closeMealModal()">✕</button>
            
            <div class="meal-modal-image">
                ${window.getMealImageOrPlaceholder 
                    ? window.getMealImageOrPlaceholder(meal, '', '', 0.5) // 0.5 scale for modal placeholder
                    : (meal.image ? `<img src="${meal.image}" alt="${meal.name}">` : '')}
                ${meal.popular ? '<span class="meal-badge popular"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> مميز</span>' : ''}
            </div>
            
            <div class="meal-modal-content">
                <h2 class="meal-modal-title">${meal.name}</h2>
                <p class="meal-modal-description">${meal.description}</p>
                
                ${sizesHtml}
                
                <div class="quantity-section">
                    <label class="form-label">الكمية:</label>
                    <div class="quantity-control quantity-control-lg">
                        <button class="quantity-btn" onclick="updateModalQuantity(-1)">−</button>
                        <span class="quantity-value" id="modalQuantity">1</span>
                        <button class="quantity-btn" onclick="updateModalQuantity(1)">+</button>
                    </div>
                </div>
                
                <div class="meal-modal-footer">
                    <div class="modal-total">
                        <span>المجموع:</span>
                        <span class="modal-total-price" id="modalTotalPrice">${formatPrice(currentPrice)}</span>
                    </div>
                    <button class="btn btn-primary btn-lg btn-block" onclick="addMealFromModal(${meal.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:8px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg> أضف للسلة
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // تفعيل النافذة
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
    
    // إعداد تغيير الحجم
    setupSizeSelection(meal);
    
    // إغلاق عند النقر خارج النافذة
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeMealModal();
    });
    
    // إغلاق بمفتاح Escape
    document.addEventListener('keydown', handleEscapeKey);
}

// إعداد اختيار الحجم
function setupSizeSelection(meal) {
    const sizeOptions = document.querySelectorAll('.size-option input');
    sizeOptions.forEach(radio => {
        radio.addEventListener('change', () => {
            // تحديث الحالة المرئية
            document.querySelectorAll('.size-option').forEach(opt => opt.classList.remove('selected'));
            radio.closest('.size-option').classList.add('selected');
            
            // تحديث السعر
            updateModalPrice(meal);
        });
    });
}

// تحديث الكمية في النافذة المنبثقة
function updateModalQuantity(delta) {
    const quantityEl = document.getElementById('modalQuantity');
    if (!quantityEl) return;
    
    let quantity = parseInt(quantityEl.textContent) + delta;
    if (quantity < 1) quantity = 1;
    if (quantity > 99) quantity = 99;
    
    quantityEl.textContent = quantity;
    
    // تحديث السعر الإجمالي
    const modalEl = document.getElementById('mealModal');
    if (modalEl) {
        const mealId = parseInt(modalEl.querySelector('[onclick*="addMealFromModal"]').getAttribute('onclick').match(/\d+/)[0]);
        const meal = getMeals().find(m => m.id === mealId);
        if (meal) updateModalPrice(meal);
    }
}

// تحديث السعر في النافذة المنبثقة
function updateModalPrice(meal) {
    const quantityEl = document.getElementById('modalQuantity');
    const priceEl = document.getElementById('modalTotalPrice');
    
    if (!quantityEl || !priceEl) return;
    
    const quantity = parseInt(quantityEl.textContent);
    let price = meal.price;
    
    // الحصول على السعر حسب الحجم المختار
    const selectedSize = document.querySelector('.size-option input:checked');
    if (selectedSize && meal.hasSizes) {
        const size = meal.sizes.find(s => s.name === selectedSize.value);
        if (size) price = size.price;
    }
    
    priceEl.textContent = formatPrice(price * quantity);
}

// إضافة من النافذة المنبثقة
function addMealFromModal(mealId) {
    const quantityEl = document.getElementById('modalQuantity');
    const selectedSize = document.querySelector('.size-option input:checked');
    
    const quantity = quantityEl ? parseInt(quantityEl.textContent) : 1;
    const sizeName = selectedSize ? selectedSize.value : null;
    
    if (addToCart(mealId, sizeName, quantity)) {
        closeMealModal();
    }
}

// إغلاق نافذة الوجبة
function closeMealModal() {
    const modal = document.getElementById('mealModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
    document.removeEventListener('keydown', handleEscapeKey);
}

// معالجة مفتاح Escape
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeMealModal();
    }
}

// =====================================================
// Scroll Logic (Categories)
// =====================================================

function scrollCategories(direction) {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    // Determine scroll amount (approx width of a few cards)
    const scrollAmount = 300 * direction; // -1 for left (prev), 1 for right (next)
    
    // Since we are RTL, scrolling "positive" (1) usually means going LEFT (Next items). 
    // However, scrollLeft behavior varies by browser in RTL.
    // Standard logic in modern browsers:
    // RTL: scrollLeft is negative or 0 on rightmost.
    // But easier to use scrollBy({ left: -scrollAmount })?
    
    // Let's assume standard behavior:
    // Button "Next" (Left Arrow) needs to scroll to Next items.
    // In RTL, "Next" items are to the LEFT. So we want to scroll negative X?
    // Wait, physically they are to the left.
    // Let's rely on scrollBy. left: -300 means move view to left (scan rightwards content in LTR, but in RTL...)
    
    // Simplest: Direction 1 (Next) = Scroll deeper into content.
    // Direction -1 (Prev) = Scroll back to start.
    
    // In RTL, "start" is right. "End" is left.
    // So "Next" should scroll towards the left (negative value usually).
    
    // Safe approach: check current direction via flow
    const isRTL = document.dir === 'rtl';
    const factor = isRTL ? -1 : 1;
    
    container.scrollBy({
        left: scrollAmount * factor, 
        behavior: 'smooth'
    });
    
    // Update buttons afterwards
    setTimeout(checkScrollButtons, 300);
}

function checkScrollButtons() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    const prevBtn = document.getElementById('scrollLeftBtn');
    const nextBtn = document.getElementById('scrollRightBtn');
    
    if (!prevBtn || !nextBtn) return;
    
    // Check if scrollable
    // Use slightly larger tolerance
    const isScrollable = container.scrollWidth > container.clientWidth + 5;
    
    if (!isScrollable) {
        prevBtn.classList.remove('visible');
        nextBtn.classList.remove('visible');
        return;
    }
    
    // Show buttons if scrollable
    // Only show if we are NOT at the very start/end?
    // Or just always show if scrollable for simplicity in UX?
    // User said "if one section starts to disappear" (overflow).
    
    // Logic: 
    // If we are at strict start, hide Prev.
    // If we are at strict end, hide Next.
    
    // RTL handling for scrollLeft is messy cross-browser. 
    // Chrome: scrollLeft decreases (negative) as you go left.
    // Firefox: scrollLeft decreases (negative).
    // Some older: scrollLeft increases.
    
    // Robust check:
    // Start is when scrollLeft is close to 0 (or max positive in some impls?? No, usually 0 is start).
    // EXCEPT in RTL, 0 is often the rightmost point (Start).
    
    const scrollLeft = Math.abs(container.scrollLeft);
    const maxScroll = container.scrollWidth - container.clientWidth;
    
    // Start (Right side in RTL): scrollLeft is near 0.
    // End (Left side in RTL): scrollLeft is near maxScroll.
    
    // "Prev" Button (Right Scroll) -> Should appear if we have scrolled AWAY from start (scrollLeft > 0)
    if (scrollLeft > 10) {
        prevBtn.classList.add('visible'); // Show Prev (to go back right)
    } else {
        prevBtn.classList.remove('visible');
    }
    
    // "Next" Button (Left Scroll) -> Should appear if we are NOT at end (scrollLeft < max)
    if (maxScroll - scrollLeft > 10) {
        nextBtn.classList.add('visible'); // Show Next (to go further left)
    } else {
        nextBtn.classList.remove('visible');
    }
}

// Hook resize
window.addEventListener('resize', checkScrollButtons);
// Hook scroll
const catContainer = document.getElementById('categoriesContainer');
if (catContainer) {
    catContainer.addEventListener('scroll', () => {
        // Throttling could be good but not strictly necessary for simple button toggle
        checkScrollButtons();
    });
}

