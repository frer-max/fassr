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
            <span class="category-icon" style="font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;">🍽️</span>
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
                <div class="no-meals-icon" style="font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif;">🍽️</div>
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
                ${meal.image 
                    ? `<img src="${meal.image}" alt="${meal.name}" loading="lazy">` 
                    : `<div class="meal-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none">
                            <path d="M12 3C12 3 13.5 3.5 13.5 5C13.5 6.5 12 7 12 7" stroke="#FF6B00" stroke-width="1.5" stroke-linecap="round"/>
                            <path d="M16 4C16 4 17.5 4.5 17.5 6C17.5 7.5 16 8 16 8" stroke="#FF6B00" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
                            <path d="M8 5C8 5 9.5 5.5 9.5 7C9.5 8.5 8 9 8 9" stroke="#FF6B00" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
                            <path d="M12 10C7.58172 10 4 13.5817 4 18H20C20 13.5817 16.4183 10 12 10Z" fill="#F8FAFC" stroke="#64748B" stroke-width="1.5"/>
                            <path d="M12 10V8.5" stroke="#64748B" stroke-width="1.5" stroke-linecap="round"/>
                            <circle cx="12" cy="7.5" r="1.5" fill="#64748B"/>
                            <path d="M3 18H21" stroke="#64748B" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                       </div>`
                }
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
                ${meal.image 
                    ? `<img src="${meal.image}" alt="${meal.name}">` 
                    : `<div class="meal-placeholder-large">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none">
                            <path d="M12 3C12 3 13.5 3.5 13.5 5C13.5 6.5 12 7 12 7" stroke="#FF6B00" stroke-width="1.5" stroke-linecap="round"/>
                            <path d="M16 4C16 4 17.5 4.5 17.5 6C17.5 7.5 16 8 16 8" stroke="#FF6B00" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
                            <path d="M8 5C8 5 9.5 5.5 9.5 7C9.5 8.5 8 9 8 9" stroke="#FF6B00" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
                            <path d="M12 10C7.58172 10 4 13.5817 4 18H20C20 13.5817 16.4183 10 12 10Z" fill="#F8FAFC" stroke="#64748B" stroke-width="1.5"/>
                            <path d="M12 10V8.5" stroke="#64748B" stroke-width="1.5" stroke-linecap="round"/>
                            <circle cx="12" cy="7.5" r="1.5" fill="#64748B"/>
                            <path d="M3 18H21" stroke="#64748B" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                       </div>`
                }
                ${meal.popular ? '<span class="meal-badge popular">⭐ مميز</span>' : ''}
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
                        🛒 أضف للسلة
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
