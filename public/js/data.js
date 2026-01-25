
// =====================================================
// إدارة البيانات - Data Management (Backend Integrated)
// =====================================================

// Fallback Data (Matches Seed)
const FALLBACK_DATA = {
    categories: [
        { id: 1, name: 'بيتزا', icon: '🍕', order: 1, active: true },
        { id: 2, name: 'برغر', icon: '🍔', order: 2, active: true },
        { id: 3, name: 'شاورما', icon: '🌯', order: 3, active: true },
        { id: 4, name: 'طاكوس', icon: '🌮', order: 4, active: true },
        { id: 5, name: 'سلطات', icon: '🥗', order: 5, active: true },
        { id: 6, name: 'مشروبات', icon: '🥤', order: 6, active: true },
        { id: 7, name: 'حلويات', icon: '🍰', order: 7, active: true }
    ],
    settings: {
        restaurantName: 'مطعمي',
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
const appState = {
    categories: [],
    meals: [],
    settings: {}, 
    orders: []
};


// ... (existing code)

// --- Settings ---

// Initial saveSettings removed to avoid duplicate declaration error
// See bottom of file for actual implementation

// Flags
let isDataInitialized = false;
let initPromise = null;

// ===================================
// Initialization
// ===================================

async function initializeData() {
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        try {
            console.log('🔄 Initializing Data from Backend...');
            
            // 1. Load data in parallel
            const [categories, meals, settings, orders] = await Promise.all([
                ApiClient.getCategories().catch(err => {
                    console.error('Failed to load categories', err);
                    return null;
                }),
                ApiClient.getMeals().catch(err => {
                    console.error('Failed to load meals', err);
                    return null;
                }),
                ApiClient.getSettings().catch(err => {
                     console.error('Failed to load settings', err);
                     return null;
                }),
                ApiClient.getOrders().catch(err => {
                    // Orders might fail for non-admin, just return empty
                    return [];
                })
            ]);
            
            // 2. Update State with Fallback
            // If API returns null/empty, use FALLBACK_DATA
            
            appState.categories = (categories && categories.length > 0) ? categories : FALLBACK_DATA.categories;
            appState.meals = (meals && meals.length > 0) ? meals : FALLBACK_DATA.meals;
            // For settings, merge fallback with API result (if any)
            appState.settings = { ...FALLBACK_DATA.settings, ...(settings || {}) };
            
            // MERGE LOCAL DATA REMOVED - FULL CLOUD SYNC MODE
            console.log('☁️ Syncing with Cloud Database...');


            // Polyfill orderNumber and normalize items for frontend compatibility
            appState.orders = (appState.orders || []).map(o => normalizeOrder(o));
            
            isDataInitialized = true;
            console.log('✅ Data Initialized', appState);
            
            // 3. Dispatch Event
            document.dispatchEvent(new CustomEvent('data-ready'));
            
            return true;
        } catch (error) {
            console.error('❌ Data Initialization Failed:', error);
            // Even on fatal error, use fallback
            appState.categories = FALLBACK_DATA.categories;
            appState.meals = FALLBACK_DATA.meals;
            appState.settings = FALLBACK_DATA.settings;
            document.dispatchEvent(new CustomEvent('data-ready'));
            return false;
        }
    })();
    
    return initPromise;
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
        restaurantName: 'مطعمي', 
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
    
    return {
        ...order,
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
initializeData();

