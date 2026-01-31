/**
 * API Client for communicating with the backend
 */
const API_BASE_URL = '/api';

const ApiClient = {
    // Generic fetch wrapper
    async request(endpoint, options = {}) {
        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Call Failed [${endpoint}]:`, error);
            throw error;
        }
    },

    // Categories
    async getCategories(includeAll = false) {
        return this.request(`/categories${includeAll ? '?all=true' : ''}`);
    },

    async saveCategory(category) {
        return this.request('/categories', {
            method: 'POST', // or PUT depending on ID logic
            body: JSON.stringify(category)
        });
    },

    // Meals
    async getMeals() {
        return this.request('/meals');
    },

    async saveMeal(meal) {
        return this.request('/meals', {
            method: 'POST',
            body: JSON.stringify(meal)
        });
    },
    
    // Orders
    async getOrders() {
        return this.request('/orders');
    },
    
    async createOrder(order) {
        return this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(order)
        });
    },
    
    async updateOrderStatus(orderId, status) {
        return this.request('/orders', {
            method: 'PUT',
            body: JSON.stringify({ id: orderId, status })
        });
    },

    async markOrderRatingSeen(orderId) {
        return this.request('/orders', {
            method: 'PUT',
            body: JSON.stringify({ id: orderId, ratingSeen: true })
        });
    },

    // Settings
    async getSettings() {
        return this.request('/settings');
    },

    async saveSettings(settings) {
        return this.request('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    },
    
    // Seed
    async seedData() {
        return this.request('/seed');
    }
};

// Expose to window
window.ApiClient = ApiClient;
