
// =====================================================
// إدارة البيانات - Data Management (Backend Integrated)
// =====================================================

// Fallback Data (Matches Seed)
// Fallback Data (Matches Seed)
const FALLBACK_DATA = {
    categories: [],
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
    meals: []
};

// Global State
// Load cached settings if available to prevent flicker
let cachedSettings = {};
try {
    cachedSettings = JSON.parse(localStorage.getItem('cachedSettings') || '{}');
} catch (e) {
    console.error('Failed to parse cached settings', e);
}

// Load Cached Data
let cachedOrders = [];
let cachedCategories = [];
let cachedMeals = [];

try {
    cachedOrders = JSON.parse(localStorage.getItem('cachedOrders') || '[]');
    cachedCategories = JSON.parse(localStorage.getItem('cachedCategories_v2') || '[]');
    // Fallback to FALLBACK_DATA only if cache is empty? No, better start empty or cached.
    // Actually FALLBACK_DATA is useful for offline/first run demo.
    // If cache exists, use it. If not, fallback data is used in getters if array empty?
    // Current getter logic: return appState.categories || FALLBACK_DATA.categories;
    // We should overwrite appState with cache if available.
    if (cachedCategories.length === 0) cachedCategories = FALLBACK_DATA.categories; 

    cachedMeals = JSON.parse(localStorage.getItem('cachedMeals_v2') || '[]');
    if (cachedMeals.length === 0) cachedMeals = FALLBACK_DATA.meals;

} catch (e) {
    console.error('Failed to parse cached data', e);
}

// Global State
const appState = {
    categories: cachedCategories,
    meals: cachedMeals,
    settings: cachedSettings, 
    orders: cachedOrders
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
                    if (key === 'categories') {
                        appState.categories = data;
                        localStorage.setItem('cachedCategories_v2', JSON.stringify(data));
                        document.dispatchEvent(new CustomEvent('categories-updated'));
                    }
                    else if (key === 'meals') {
                        if (data && data.meals) {
                            appState.meals = data.meals;
                            // We could store pagination here if needed
                        } else {
                            appState.meals = Array.isArray(data) ? data : [];
                        }
                        localStorage.setItem('cachedMeals_v2', JSON.stringify(appState.meals));
                        document.dispatchEvent(new CustomEvent('meals-updated'));
                    }
                    else if (key === 'settings') {
                        appState.settings = { ...FALLBACK_DATA.settings, ...data };
                        // Cache settings for next load
                        localStorage.setItem('cachedSettings', JSON.stringify(appState.settings));
                    }
                    else if (key === 'orders') {
                        // Handle Paginated Response
                        if (data && data.orders) {
                            appState.orders = data.orders.map(o => normalizeOrder(o));
                            appState.ordersPagination = data.pagination;
                        } else {
                            // Fallback for old array format or empty
                            appState.orders = (Array.isArray(data) ? data : []).map(o => normalizeOrder(o));
                        }
                    }
                    
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
        if (appState.categories && appState.categories.length > 0) {
             console.log('⚡ Using cached categories...');
             // Still fetch to update
             fetchIfNeeded('categories', () => ApiClient.getCategories(isAdminPage));
        } else {
             tasks.push(fetchIfNeeded('categories', () => ApiClient.getCategories(isAdminPage)));
        }
    }

    if (loadAll || options.meals) {
        if (appState.meals && appState.meals.length > 0) {
             console.log('⚡ Using cached meals...');
             fetchIfNeeded('meals', () => ApiClient.getMeals());
        } else {
             tasks.push(fetchIfNeeded('meals', () => ApiClient.getMeals()));
        }
    }

    if (loadAll || options.settings !== false) {
        tasks.push(fetchIfNeeded('settings', () => ApiClient.getSettings()));
    }

    if ((loadAll && isAdminPage) || options.orders) {
        // Optimization: If we have cached orders, don't block. Refresh in background.
        if (appState.orders && appState.orders.length > 0) {
            console.log('⚡ Using cached orders, refreshing in background...');
            refreshOrders(); // Fire and forget
        } else {
             tasks.push(fetchIfNeeded('orders', () => ApiClient.getOrders()));
        }
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

function getOrdersPagination() {
    return appState.ordersPagination || null;
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
    
    // Optimistic Update: Remove from local state immediately
    // 1. Identify meals to delete FIRST
    const mealsToDelete = appState.meals.filter(m => String(m.categoryId) === targetId);

    // 2. Optimistic Update: Remove from local state
    appState.meals = appState.meals.filter(m => String(m.categoryId) !== targetId);
    appState.categories = appState.categories.filter(c => String(c.id) !== targetId);
    
    // 3. Update Backend
    try {
        // Database has ON DELETE CASCADE constraint, so just deleting the category is enough.
        // The backend DB will automatically remove all associated meals.
        
        await ApiClient.request(`/categories?id=${id}`, { method: 'DELETE' });
        showToast('تم حذف القسم وجميع وجباته', 'success');
    } catch(e) {
        console.error("Delete category failed", e);
        showToast('فشل حذف القسم من الخادم', 'error');
        throw e;
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

    // --- ENHANCEMENT: Merge Local Completion Data ---
    // If backend doesn't support completedAt, we retrieve it from local storage
    let completedAt = order.completedAt;
    if (!completedAt && order.status === 'delivered') {
        try {
            const localDates = JSON.parse(localStorage.getItem('localCompletedDates') || '{}');
            // Use local date if available, otherwise fallback to createdAt (legacy behavior)
            completedAt = localDates[order.id] || order.createdAt;
        } catch(e) {}
    }

    return {
        ...order,
        location: location,
        orderNumber: order.orderNumber || order.id,
        items: items,
        completedAt: completedAt // Use the merged or existing date
    };
}


async function updateOrderStatusData(orderId, status) {
    const order = appState.orders.find(o => o.id == orderId); // Loose equality for string/int IDs
    if (order) {
        // Optimistic UI update
        const oldStatus = order.status;
        order.status = status;
        
        // Track completion time for revenue calculation
        if (status === 'delivered') {
            const now = new Date().toISOString();
            // 1. Update State
            if (!order.completedAt) order.completedAt = now;
            
            // 2. Persist Locally (Backup in case backend drops it)
            try {
                const localDates = JSON.parse(localStorage.getItem('localCompletedDates') || '{}');
                // Only set if not already there to preserve original completion time
                if (!localDates[orderId]) {
                    localDates[orderId] = now;
                    localStorage.setItem('localCompletedDates', JSON.stringify(localDates));
                }
            } catch(e) { console.error("Failed to save local date", e); }
        }

        try {
             if (ApiClient.updateOrderStatus) await ApiClient.updateOrderStatus(orderId, status);
             else {
                 // Pass completedAt if supported by backend, otherwise it's just local optimistic until refresh
                 let url = `/orders?id=${orderId}&status=${status}`;
                 if (order.completedAt) url += `&completedAt=${order.completedAt}`;
                 await ApiClient.request(url, { method: 'PUT' });
             }
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
        const response = await ApiClient.getOrders();
        let serverOrders = [];
        
        if (response && response.orders) {
            serverOrders = response.orders;
            appState.ordersPagination = response.pagination;
        } else if (Array.isArray(response)) {
            serverOrders = response;
        }

        let combinedOrders = serverOrders.map(o => normalizeOrder(o));

        // Merge Local Orders
        // Local merge removed


        appState.orders = combinedOrders;
        
        // Cache for next load
        try {
             localStorage.setItem('cachedOrders', JSON.stringify(combinedOrders));
        } catch (e) { console.error('Failed to cache orders', e); }

        document.dispatchEvent(new CustomEvent('orders-updated'));
        return appState.orders;
    } catch (e) {
        console.error("Failed to refresh orders", e);
        // On error, don't wipe data, just keep existing or reload local?
        // Safe to just return existing
        return appState.orders;
    }
}

async function loadMoreOrders() {
    if (!appState.ordersPagination) return;
    const { page, totalPages, limit } = appState.ordersPagination;
    if (page >= totalPages) return;

    try {
        const nextPage = page + 1;
        const response = await ApiClient.getOrders(nextPage, limit);
        
        if (response && response.orders) {
            const newOrders = response.orders.map(o => normalizeOrder(o));
            // Append
            appState.orders = [...appState.orders, ...newOrders];
            appState.ordersPagination = response.pagination;
            
            document.dispatchEvent(new CustomEvent('orders-updated'));
            return newOrders;
        }
    } catch (e) {
        console.error("Failed to load more orders", e);
    }
}

async function searchOrders(query) {
    try {
        const response = await ApiClient.getOrders(1, 50, query); // Always page 1 for new search
        
        if (response && response.orders) {
            appState.orders = response.orders.map(o => normalizeOrder(o));
            appState.ordersPagination = response.pagination;
            
            document.dispatchEvent(new CustomEvent('orders-updated'));
        }
    } catch (e) {
        console.error("Search failed", e);
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
// Image helpers moved to utils.js

// ===================================
// Real-time Updates (SSE)
// ===================================
// This replaces the old polling mechanism with instant server-push notifications

let sseSource = null;

function subscribeToRealtimeUpdates() {
    if (sseSource) return; // Already connected

    if (typeof EventSource !== 'undefined') {
        console.log('🔌 Connecting to Realtime Updates...');
        sseSource = new EventSource('/api/updates');

        sseSource.onopen = () => {
             console.log('✅ Realtime Updates Connected');
        };

        sseSource.onmessage = (event) => {
            // Server says "update" -> we fetch fresh data
            // We ignore the content of the message, just the signal matters
            console.log('🔔 Received Realtime Update Signal');
            refreshOrders();
        };

        sseSource.onerror = (err) => {
            console.warn('⚠️ Realtime Updates Disconnected, retrying...', err);
            sseSource.close();
            sseSource = null;
            // Retry in 5 seconds
            setTimeout(subscribeToRealtimeUpdates, 5000);
        };
    } else {
        console.warn('EventSource not supported. Falling back to polling.');
        // Fallback for ancient browsers
        setInterval(refreshOrders, 5000);
    }
}

// Auto-start real-time listener if we are not skipping auto-init
if (!window.SKIP_AUTO_INIT) {
    // Wait a bit for initial load
    setTimeout(subscribeToRealtimeUpdates, 1000);
}
