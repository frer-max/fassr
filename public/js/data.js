
// =====================================================
// إدارة البيانات - Data Management (Backend Integrated)
// =====================================================

// Fallback Data (Matches Seed)
const FALLBACK_DATA = {
    categories: [
        { id: 1, name: 'بيتزا', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#F59E0B" stroke="#B45309" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16.5 4a3 3 0 0 0-2.83 2h-3.34a3 3 0 0 0-2.83-2A3 3 0 0 0 4.5 7v.29A13 13 0 0 0 12 20a13 13 0 0 0 7.5-12.71V7a3 3 0 0 0-3-3z"/><path d="M6 9l2 2" stroke="#FCD34D" stroke-width="1"/><path d="M14 6l1 1" stroke="#FCD34D" stroke-width="1"/><path d="M9 16l1-1" stroke="#FCD34D" stroke-width="1"/></svg>', order: 1, active: true },
        { id: 2, name: 'برغر', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13C6 13.5 6 14 7 14.5C7.5 14.75 8.5 15 9.5 15C10.5 15 11 14.5 11 14.5C11 14.5 11.5 15 12.5 15C13.5 15 14.5 14.75 15 14.5C15.5 14.25 15.5 13.75 16 13.5" stroke="#166534" stroke-width="2"/><path d="M19 19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V17H19V19Z" fill="#F59E0B" stroke="#B45309"/><path d="M5 10V9C5 6.2 7.2 4 10 4H14C16.8 4 19 6.2 19 9V10H5Z" fill="#FCD34D" stroke="#B45309"/><line x1="5" y1="13" x2="19" y2="13" stroke="#991B1B" stroke-width="3"/></svg>', order: 2, active: true },
        { id: 3, name: 'شاورما', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B45309" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 10V5C13 3.34 11.66 2 10 2C8.34 2 7 3.34 7 5V10" fill="#FDE68A"/><path d="M7 10L5 22L15 20L13 10H7Z" fill="#FCD34D"/><path d="M15 12L19 14L17 20" stroke="#EF4444" fill="#FCA5A5"/><path d="M10 2V22" stroke="#D97706" stroke-width="1" stroke-dasharray="2 2"/><path d="M10 6H12" stroke="#92400E"/><path d="M10 14H12" stroke="#92400E"/><path d="M10 18H12" stroke="#92400E"/></svg>', order: 3, active: true },
        { id: 4, name: 'طاكوس', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11C3 7.5 5 5 8 4C11 3 15 3 18 6C20 8 21 11 21 15V19C21 20.1 20.1 21 19 21H14" fill="#FDE68A"/><path d="M6 14C6 14 7 12 10 12C13 12 14 14 14 14" stroke="#166534"/><path d="M10 16C10 16 11 15 13 15" stroke="#EF4444"/><path d="M3 11V19C3 20.1 3.9 21 5 21H10" fill="#FBBF24"/></svg>', order: 4, active: true },
        { id: 5, name: 'سندويتشات', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8C4 5.79 5.79 4 8 4H16C18.21 4 20 5.79 20 8V10H4V8Z" fill="#FCD34D"/><path d="M4 14H20V17C20 19.21 18.21 21 16 21H8C5.79 21 4 19.21 4 17V14Z" fill="#FCD34D"/><path d="M4 10H20" stroke="#10B981" stroke-width="3"/><path d="M4 14H20" stroke="#EF4444" stroke-width="2"/></svg>', order: 5, active: true },
        { id: 6, name: 'مشروبات', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 6h10v11a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4V6z" fill="#DBEAFE"/><path d="M15 6V3a1 1 0 0 0-1-1H9.95" stroke="#1D4ED8"/><line x1="6" y1="10" x2="18" y2="10" stroke="#93C5FD"/><path d="M9 13L10 17" stroke="#1D4ED8" stroke-width="1" stroke-linecap="round"/><path d="M14 11L13 15" stroke="#1D4ED8" stroke-width="1" stroke-linecap="round"/></svg>', order: 6, active: true },
        { id: 7, name: 'تحلية', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D946EF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L12 5L14 2" stroke="#BE185D"/><path d="M12 21a7 7 0 0 0 7-7c0-2-1-4-2-4H7c-1 0-2 2-2 4a7 7 0 0 0 7 7z" fill="#FCE7F3"/><path d="M12 21V10" stroke="#F472B6"/><path d="M7 10L17 10" stroke="#BE185D"/></svg>', order: 7, active: true }
    ],
    settings: {
        restaurantName: '',
        phone: '0555123456',
        address: 'الجزائر العاصمة',
        currency: 'دج',
        isOpen: true,
        allowPreOrders: true,
        openTime: '10:00',
        closeTime: '23:00',
        delivery: { enabled: true, type: 'fixed', fixedCost: 200 },
        adminPassword: 'admin123' // Fallback password
    },
    meals: [
         { id: 1, categoryId: 1, name: 'بيتزا مارغريتا', description: 'صلصة طماطم طازجة، جبن موزاريلا، ريحان طازج', image: '', price: 800, active: true, popular: true, order: 1, hasSizes: true, sizes: [{ name: 'صغيرة', price: 800 }, { name: 'وسط', price: 1200 }, { name: 'كبيرة', price: 1600 }] },
         { id: 2, categoryId: 1, name: 'بيتزا خضار', description: 'فلفل ملون، زيتون، فطر، بصل، طماطم، جبن موزاريلا', image: '', price: 900, active: true, popular: false, order: 2, hasSizes: true, sizes: [{ name: 'Classic', price: 900 }, { name: 'Mega', price: 1400 }, { name: 'Family', price: 1900 }] },
         { id: 3, categoryId: 1, name: 'بيتزا اللحم', description: 'لحم مفروم، فلفل، بصل، جبن موزاريلا، صلصة خاصة', image: '', price: 1000, active: true, popular: true, order: 3, hasSizes: true, sizes: [{ name: 'صغيرة', price: 1000 }, { name: 'وسط', price: 1500 }, { name: 'كبيرة', price: 2000 }] },
         { id: 5, categoryId: 2, name: 'برغر كلاسيك', description: 'لحم بقري، جبن شيدر، خس، طماطم، بصل، صلصة خاصة', image: '', price: 600, active: true, popular: true, order: 1, hasSizes: true, sizes: [{ name: 'Single', price: 600 }, { name: 'Double', price: 900 }, { name: 'Triple', price: 1200 }] },
         { id: 8, categoryId: 3, name: 'شاورما دجاج', description: 'دجاج متبل، بطاطس، ثوم، مخلل، خبز عربي', image: '', price: 400, active: true, popular: true, order: 1, hasSizes: true, sizes: [{ name: 'عادي', price: 400 }, { name: 'جامبو', price: 600 }] },
         { id: 11, categoryId: 4, name: 'طاكوس دجاج', description: 'دجاج متبل، جبن، خس، صلصة حارة', image: '', price: 350, active: true, popular: false, order: 1, hasSizes: false, sizes: [] },
         { id: 16, categoryId: 6, name: 'كوكا كولا', description: 'مشروب غازي بارد', image: '', price: 100, active: true, popular: false, order: 2, hasSizes: false, sizes: [] },
         { id: 18, categoryId: 7, name: 'تيراميسو', description: 'كعكة إيطالية بالقهوة والماسكاربوني', image: '', price: 400, active: true, popular: true, order: 1, hasSizes: false, sizes: [] }
    ]
};

// Global State
// Load cached settings if available to prevent flicker
let cachedSettings = {};
try {
    cachedSettings = JSON.parse(localStorage.getItem('cachedSettings') || '{}');
} catch (e) {
    console.error('Failed to parse cached settings', e);
}

// Global State
const appState = {
    categories: [],
    meals: [],
    settings: cachedSettings, 
    orders: []
};


// ... (existing code)

// --- Settings ---

// Initial saveSettings removed to avoid duplicate declaration error
// See bottom of file for actual implementation

// Flags & State
const loadedFlags = {
    categories: false,
    meals: false,
    settings: false,
    orders: false
};

const loadingPromises = {
    categories: null,
    meals: null,
    settings: null,
    orders: null
};

async function initializeData(options = {}) {
    const loadAll = Object.keys(options).length === 0;
    const force = options.force || false;

    // Helper to fetch only if needed
    const fetchIfNeeded = (key, fetcher) => {
        // If forcing, or not loaded yet
        if (force || !loadedFlags[key]) {
            // If already loading, return existing promise
            if (loadingPromises[key]) return loadingPromises[key];

            // Start loading
            console.log(`🔄 Fetching ${key}...`);
            loadingPromises[key] = fetcher().then(data => {
                if (data) {
                    if (key === 'categories') appState.categories = data;
                    else if (key === 'meals') appState.meals = data;
                    else if (key === 'settings') {
                        appState.settings = { ...FALLBACK_DATA.settings, ...data };
                        // Cache settings for next load
                        localStorage.setItem('cachedSettings', JSON.stringify(appState.settings));
                    }
                    else if (key === 'orders')appState.orders = (data || []).map(o => normalizeOrder(o));
                    
                    loadedFlags[key] = true;
                } else {
                    // Fallback
                    if (key === 'categories') appState.categories = FALLBACK_DATA.categories;
                    else if (key === 'meals') appState.meals = FALLBACK_DATA.meals;
                    else if (key === 'settings') appState.settings = FALLBACK_DATA.settings;
                }
                return true;
            }).catch(err => {
                console.error(`Failed to load ${key}`, err);
                return false;
            }).finally(() => {
                loadingPromises[key] = null; // Clear promise so we can retry later if needed
            });
            
            return loadingPromises[key];
        }
        return Promise.resolve(true); // Already loaded
    };

    const isAdminPage = window.location.pathname.includes('admin');
    const tasks = [];

    if (loadAll || options.categories) {
        tasks.push(fetchIfNeeded('categories', () => ApiClient.getCategories(isAdminPage)));
    }

    if (loadAll || options.meals) {
        tasks.push(fetchIfNeeded('meals', () => ApiClient.getMeals()));
    }

    if (loadAll || options.settings !== false) {
        tasks.push(fetchIfNeeded('settings', () => ApiClient.getSettings()));
    }

    if ((loadAll && isAdminPage) || options.orders) {
        tasks.push(fetchIfNeeded('orders', () => ApiClient.getOrders()));
    }

    try {
        await Promise.all(tasks);
    } catch (err) {
        console.error("Initialization warning: some tasks failed", err);
    } finally {
        // Dispatch general event ALWAYS so UI can unblock
        document.dispatchEvent(new CustomEvent('data-ready'));
    }
    return true;
}

// ===================================
// Getters (Sync Access to State)
// ===================================

function getCategories() {
    return appState.categories || FALLBACK_DATA.categories;
}

function getMeals() {
    return appState.meals || FALLBACK_DATA.meals;
}

function getSettings() {
    // Return with defaults if empty to avoid crashes
    return {
        restaurantName: '', 
        currency: 'دج',
        isOpen: true, 
        delivery: { enabled: true, type: 'fixed', fixedCost: 200 },
        adminPassword: 'admin123',
        ...appState.settings
    };
}

function getOrders() {
    return appState.orders || [];
}

// Cart is Client-Side Only
function getCart() {
    try {
        return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch(e) {
        return [];
    }
}

// ===================================
// Data Mutation Methods (Async)
// ===================================

// --- Categories ---

async function createCategoryData(category) {
    // Optimistic Update
    appState.categories.push(category); 
    
    try {
        const saved = await ApiClient.saveCategory(category);
        const idx = appState.categories.indexOf(category);
        if (idx !== -1) appState.categories[idx] = saved;
        return saved;
    } catch (e) {
        console.error("Create Category Failed", e);
        return null;
    }
}

async function updateCategoryData(category) {
    const idx = appState.categories.findIndex(c => c.id === category.id);
    if (idx !== -1) appState.categories[idx] = category;
    
    try {
        return await ApiClient.saveCategory(category);
    } catch (e) {
        console.error("Update Category Failed", e);
        return null;
    }
}

async function deleteCategoryData(id) {
    if (!id) return; // Safety check
    
    const targetId = String(id); // Normalize to string for comparison
    
    // 1. Precise Identification: Find all meals strictly in this category
    // Using String() ensures we match "5" with 5
    const mealsToDelete = appState.meals.filter(m => String(m.categoryId) === targetId);
    
    // 2. Remove meals from local state (Keep only those NOT matching targetId)
    appState.meals = appState.meals.filter(m => String(m.categoryId) !== targetId);
    
    // 3. Remove category from local state
    appState.categories = appState.categories.filter(c => String(c.id) !== targetId);
    
    // 4. Update Backend
    try {
        // Manually delete the specific meals we identified
        const deleteMealPromises = mealsToDelete.map(meal => 
            ApiClient.request(`/meals?id=${meal.id}`, { method: 'DELETE' })
                .catch(err => console.error('Failed to delete meal ' + meal.id, err))
        );
        
        await Promise.all(deleteMealPromises);

        // Then delete the category ONLY (No cascade flag to prevent backend side-effects)
        // We have already handled the children manually.
        await ApiClient.request(`/categories?id=${id}`, { method: 'DELETE' });
        
    } catch(e) {
        console.error("Delete category failed", e);
    }
}

function saveCategories(categories) {
    console.warn("saveCategories (bulk) is deprecated. Use create/updateCategoryData instead.");
    appState.categories = categories; 
}


// --- Meals ---

// --- Meals ---

async function createMealData(meal) {
    try {
        const saved = await ApiClient.saveMeal(meal);
        // Optimistic Update / Sync
        appState.meals.push(saved);
        return saved;
    } catch (e) { 
        console.error("Create Meal Failed", e);
        throw e;
    }
}

async function updateMealData(meal) {
    // Optimistic Update
    const idx = appState.meals.findIndex(m => m.id === meal.id);
    if (idx !== -1) appState.meals[idx] = meal;

    try {
        const saved = await ApiClient.saveMeal(meal); 
        // Sync local state
        const idx = appState.meals.findIndex(m => m.id === meal.id);
        if (idx !== -1) appState.meals[idx] = saved;
        return saved;
    } catch (e) { 
        console.error("Update Meal Failed", e);
        throw e;
    }
}

// Deprecated functions removed
function persistLocalMeals() {}
function persistLocalOrders() {}


async function deleteMealData(id) {
    appState.meals = appState.meals.filter(m => m.id !== id);
    try {
         await ApiClient.request(`/meals?id=${id}`, { method: 'DELETE' });
    } catch (e) { console.error(e); throw e; }
}

function saveMeals(meals) {
    console.warn("saveMeals (bulk) is deprecated.");
    appState.meals = meals;
}

// --- Settings ---

// --- Settings ---

async function updateSettingsData(settings) {
    // Merge with existing to prevent data loss
    const current = appState.settings || {};
    const updated = { ...current, ...settings };
    
    appState.settings = updated;
    localStorage.setItem('cachedSettings', JSON.stringify(updated));
    
    try {
        await ApiClient.saveSettings(updated);
        return updated;
    } catch (e) { 
        console.error("Save Settings Failed", e); 
        throw e;
    }
}

// Alias for compatibility
const saveSettings = updateSettingsData;

// --- Orders ---

async function submitOrder(orderData) {
    try {
        const savedOrder = await ApiClient.createOrder(orderData);
        // Polyfill ID for frontend and normalize
        const normalized = normalizeOrder(savedOrder);
        appState.orders.unshift(normalized);
        return normalized;
    } catch (e) {
        console.error("Submit Order Failed", e);
        throw e;
    }
}

// Helper to normalize backend order object to frontend structure
function normalizeOrder(order) {
    if (!order) return null;
    
    // Map items fields
    let items = [];
    if (order.items && Array.isArray(order.items)) {
        items = order.items.map(item => ({
            ...item,
            name: item.name || item.mealName || 'Unknown', // Map mealName to name
            sizeName: item.sizeName || item.size || ''     // Map size to sizeName
        }));
    }
    
    // Parse location if it's a string
    let location = order.location;
    if (typeof location === 'string') {
        try {
            // Check if it looks like JSON
            if (location.trim().startsWith('{')) {
                location = JSON.parse(location);
            }
        } catch (e) {
            console.warn('Failed to parse location JSON', e);
            location = null;
        }
    }

    return {
        ...order,
        location: location,
        orderNumber: order.orderNumber || order.id,
        items: items
    };
}


async function updateOrderStatusData(orderId, status) {
    const order = appState.orders.find(o => o.id == orderId); // Loose equality for string/int IDs
    if (order) {
        // Optimistic UI update
        const oldStatus = order.status;
        order.status = status;
        
        try {
             if (ApiClient.updateOrderStatus) await ApiClient.updateOrderStatus(orderId, status);
             else await ApiClient.request(`/orders?id=${orderId}&status=${status}`, { method: 'PUT' });
        } catch(e) { 
            console.error("Update Status Failed", e); 
            order.status = oldStatus; // Revert on failure
            throw e;
        }
    }
}

// function persistLocalOrders() removed

function saveOrders(orders) {
    // Mainly used by client-side logic previously
    appState.orders = orders;
}

async function refreshOrders() {
    try {
        const serverOrders = await ApiClient.getOrders();
        let combinedOrders = (serverOrders || []).map(o => normalizeOrder(o));

        // Merge Local Orders
        // Local merge removed


        appState.orders = combinedOrders;
        document.dispatchEvent(new CustomEvent('orders-updated'));
        return appState.orders;
    } catch (e) {
        console.error("Failed to refresh orders", e);
        // On error, don't wipe data, just keep existing or reload local?
        // Safe to just return existing
        return appState.orders;
    }
}

// --- Cart ---

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// ===================================
// Auto-Init logic
// ===================================
// We don't auto-run initializeData() to allow hooking events first, 
// OR we run it but UI must listen to 'data-ready'
if (!window.SKIP_AUTO_INIT) {
    initializeData();
}

// ===================================
// Helper: Meal Image OR Category Placeholder
// ===================================
// ===================================
// Helper: Meal Image OR Category Placeholder
// ===================================
window.getMealImageOrPlaceholder = function(meal, containerStyle = '', imgStyle = '', iconScale = 1.0) {
    // Default to filling parent if no style provided for container
    const finalContainerStyle = containerStyle ? containerStyle : 'width: 100%; height: 100%;';
    
    // 1. Check for real meal image
    if (meal && meal.image && typeof meal.image === 'string' && meal.image.trim().length > 10) { 
        // Note: onerror ensures fallback to category
        // We handle the fallback display logic via inline JS in the onerror
        const fallbackHtml = getCategoryFallbackHtml(meal, finalContainerStyle, iconScale);
        
        // Escape the fallback HTML for use in the onerror string (basic escaping)
        // Actually, inline JS in attribute is messy. 
        // Better strategy: Hide img, show sibling fallback div.
        
        return `
            <div style="${finalContainerStyle}; position: relative; overflow: hidden;">
                 <img src="${meal.image}" alt="${meal.name || ''}" class="meal-image-img" style="width: 100%; height: 100%; object-fit: cover; ${imgStyle}" loading="lazy" 
                      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                 <div class="meal-placeholder-fallback" style="display:none; position:absolute; top:0; left:0; width: 100%; height: 100%; background: var(--bg-tertiary); align-items: center; justify-content: center;">
                    ${getCategoryIconSVG(meal.categoryId, iconScale)}
                 </div>
            </div>`;
    }

    // 2. Fallback to Category Icon
    if (meal && (meal.categoryId || meal.category_id)) {
        return getCategoryFallbackHtml(meal, finalContainerStyle, iconScale);
    }
    
    // 3. Ultimate Fallback
    return `
        <div class="meal-placeholder-default" style="${finalContainerStyle} background: #f3f4f6; display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
    `;
};

function getCategoryFallbackHtml(meal, containerStyle, iconScale) {
    const catId = meal.categoryId || meal.category_id;
    const iconSvg = getCategoryIconSVG(catId);
    
    if (iconSvg) {
        // We don't force style inside the SVG string here, we assume container constrains it
        const scaledSvg = iconSvg.replace('<svg ', '<svg style="width:50%; height:50%;" '); // keeping internal relative size
        
        return `
            <div class="meal-placeholder-auto" style="${containerStyle} background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transform: scale(${iconScale}); color: var(--primary);">
                    ${scaledSvg}
                </div>
            </div>
        `;
    }
    return '';
}

// Internal helper to get icon string safely
function getCategoryIconSVG(catId, scale = 1.0) {
    if (!catId) return null;
    try {
        const categories = getCategories(); 
        const category = categories.find(c => String(c.id) === String(catId));
        if (category && category.icon) {
             // Clean fixed dimensions
             return category.icon.replace(/width="\d+"/, '').replace(/height="\d+"/, '')
                                 .replace('<svg ', '<svg style="width:100%; height:100%;" ');
        }
        return null;
    } catch(e) { return null; }
}

