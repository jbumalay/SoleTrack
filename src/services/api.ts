/**
 * Service for connecting the React frontend to the Node/Express backend (server.ts).
 */

const API_BASE_URL = "/api";

export const apiService = {
  /**
   * General fetch wrapper
   */
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("soletrack_token");
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
          ...options.headers,
        },
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Server error (${response.status})`);
        }
        return data;
      } else {
        const text = await response.text();
        console.error("Non-JSON response from server:", text);
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error: any) {
      console.error(`API Request Failed [${endpoint}]:`, error);
      throw error;
    }
  },

  /**
   * Check API health
   */
  async checkHealth() {
    return this.request("/health");
  },

  /**
   * Auth methods
   */
  async login(credentials: any) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  async register(userData: any) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async logout() {
    return this.request("/auth/logout", {
      method: "POST",
    });
  },

  async getCurrentUser() {
    return this.request("/auth/me");
  },

  /**
   * Product & Category methods
   */
  async getProducts(params: any = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products?${query}`);
  },

  async getCategories() {
    return this.request("/categories");
  },

  /**
   * Cart methods
   */
  async getCart() {
    return this.request("/cart");
  },

  async addToCart(productId: number, quantity: number, sizeId?: number) {
    return this.request("/cart/add", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity, size_id: sizeId }),
    });
  },

  async updateCartItem(itemId: number, quantity: number) {
    return this.request(`/cart/update?id=${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
  },

  async removeCartItem(itemId: number) {
    return this.request(`/cart/remove?id=${itemId}`, {
      method: "DELETE",
    });
  },

  /**
   * Order methods
   */
  async checkout(shippingDetails: any) {
    return this.request("/checkout", {
      method: "POST",
      body: JSON.stringify(shippingDetails),
    });
  },

  async getMyOrders() {
    return this.request("/orders/my");
  },

  async getOrderDetails(orderId: number) {
    return this.request(`/orders/details?id=${orderId}`);
  },

  async simulateOrderProgress(orderId: number) {
    return this.request(`/orders/simulate?id=${orderId}`, {
      method: "POST",
    });
  },

  async cancelOrder(orderId: number) {
    return this.request(`/orders/cancel?id=${orderId}`, {
      method: "PUT",
    });
  },

  /**
   * Payment methods
   */
  async getPaymentHistory(orderId: number) {
    return this.request(`/payment/history?order_id=${orderId}`);
  },

  /**
   * Admin Methods
   */
  async getAdminDashboard() {
    return this.request("/admin/dashboard");
  },

  async getAdminUsers(params: { search?: string, role?: string, status?: string } = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/users?${query}`);
  },

  async createAdminUser(userData: any) {
    return this.request("/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async updateAdminUser(id: number, userData: any) {
    return this.request(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  async deleteAdminUser(id: number) {
    return this.request(`/admin/users/${id}`, {
      method: "DELETE",
    });
  },

  async getAdminReports() {
    return this.request("/admin/reports");
  },

  async getAdminCategories() {
    return this.request("/admin/categories");
  },

  async createAdminCategory(data: any) {
    return this.request("/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateAdminCategory(id: number, data: any) {
    return this.request(`/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteAdminCategory(id: number) {
    return this.request(`/admin/categories/${id}`, {
      method: "DELETE",
    });
  },

  async getAdminSizes() {
    return this.request("/admin/sizes");
  },

  async createAdminSize(data: any) {
    return this.request("/admin/sizes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteAdminSize(id: number) {
    return this.request(`/admin/sizes/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Seller Methods
   */
  async getSellerDashboard() {
    return this.request("/seller/dashboard");
  },

  async getSellerProducts() {
    return this.request("/seller/products");
  },

  async createSellerProduct(data: any) {
    return this.request("/seller/products", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateSellerProduct(data: any) {
    return this.request("/seller/products", {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteSellerProduct(id: number) {
    return this.request(`/seller/products?id=${id}`, {
      method: "DELETE"
    });
  },

  async getSellerReports(days: number = 7) {
    return this.request(`/seller/reports/sales?days=${days}`);
  },

  async getSellerProductReviews(productId: number) {
    return this.request(`/seller/reviews?product_id=${productId}`);
  },

  async getSellerOrders() {
    return this.request("/seller/orders");
  },

  async updateSellerOrderStatus(orderId: number, status: string) {
    return this.request("/seller/orders/status", {
      method: "PUT",
      body: JSON.stringify({ order_id: orderId, status })
    });
  },

  async createReview(data: { product_id: number; rating: number; comment: string }) {
    return this.request("/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getProduct(id: number) {
    return this.request(`/products?id=${id}`);
  },

  async getSizes() {
    return this.request("/sizes");
  },

  async getStores() {
    return this.request("/stores");
  },

  async getStore(id: number) {
    return this.request(`/stores/${id}`);
  },

  async getSellerProfile() {
    return this.request("/seller/profile");
  },

  async updateSellerProfile(data: any) {
    return this.request("/seller/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};
