/**
 * Service for connecting the React frontend to the Node/Express backend (server.ts).
 */

const API_BASE_URL = "/api";

export interface ApiResponse<T = any> {
  status: string;
  message?: string;
  data: T;
}

export interface PaginatedParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  category?: string;
  [key: string]: unknown;
}

export const apiService = {
  /**
   * General fetch wrapper
   */
  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = localStorage.getItem("soletrack_token");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> | undefined),
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Server error (${response.status})`);
        }
        return data as ApiResponse<T>;
      } else {
        const text = await response.text();
        console.error("Non-JSON response from server:", text);
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error: unknown) {
      console.error(`API Request Failed [${endpoint}]:`, error);
      throw error;
    }
  },

  /**
   * Check API health
   */
  async checkHealth(): Promise<ApiResponse<any>> {
    return this.request("/health");
  },

  /**
   * Auth methods
   */
  async login(credentials: unknown): Promise<ApiResponse<any>> {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  async register(userData: unknown): Promise<ApiResponse<any>> {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async logout(): Promise<ApiResponse<any>> {
    return this.request("/auth/logout", {
      method: "POST",
    });
  },

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.request("/auth/me");
  },

  /**
   * Product & Category methods
   */
  async getProducts(params: PaginatedParams & Record<string, unknown> = {}): Promise<ApiResponse<any>> {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      cleaned[k] = String(v);
    }
    const query = new URLSearchParams(cleaned).toString();
    return this.request(query ? `/products?${query}` : "/products");
  },

  async getCategories(): Promise<ApiResponse<any>> {
    return this.request("/categories");
  },

  /**
   * Cart methods
   */
  async getCart(): Promise<ApiResponse<any>> {
    return this.request("/cart");
  },

  async addToCart(productId: number, quantity: number, sizeId?: number): Promise<ApiResponse<any>> {
    return this.request("/cart/add", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, quantity, size_id: sizeId }),
    });
  },

  async updateCartItem(itemId: number, quantity: number): Promise<ApiResponse<any>> {
    return this.request(`/cart/update?id=${itemId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
  },

  async removeCartItem(itemId: number): Promise<ApiResponse<any>> {
    return this.request(`/cart/remove?id=${itemId}`, {
      method: "DELETE",
    });
  },

  /**
   * Order methods
   */
  async checkout(shippingDetails: unknown): Promise<ApiResponse<any>> {
    return this.request("/checkout", {
      method: "POST",
      body: JSON.stringify(shippingDetails),
    });
  },

  async getMyOrders(): Promise<ApiResponse<any>> {
    return this.request("/orders/my");
  },

  async getOrderDetails(orderId: number): Promise<ApiResponse<any>> {
    return this.request(`/orders/details?id=${orderId}`);
  },

  async simulateOrderProgress(orderId: number): Promise<ApiResponse<any>> {
    return this.request(`/orders/simulate?id=${orderId}`, {
      method: "POST",
    });
  },

  async cancelOrder(orderId: number): Promise<ApiResponse<any>> {
    return this.request(`/orders/cancel?id=${orderId}`, {
      method: "PUT",
    });
  },

  async requestReturn(orderId: number): Promise<ApiResponse<any>> {
    return this.request(`/orders/return?id=${orderId}`, {
      method: "POST",
    });
  },

  /**
   * Payment methods
   */
  async getPaymentHistory(orderId: number): Promise<ApiResponse<any>> {
    return this.request(`/payment/history?order_id=${orderId}`);
  },

  /**
   * Admin Methods
   */
  async getAdminDashboard(): Promise<ApiResponse<any>> {
    return this.request("/admin/dashboard");
  },

  async getAdminUsers(params: PaginatedParams & { role?: string; status?: string } = {}): Promise<ApiResponse<any>> {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      cleaned[k] = String(v);
    }
    const query = new URLSearchParams(cleaned).toString();
    return this.request(query ? `/admin/users?${query}` : "/admin/users");
  },

  async createAdminUser(userData: unknown): Promise<ApiResponse<any>> {
    return this.request("/admin/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async updateAdminUser(id: number, userData: unknown): Promise<ApiResponse<any>> {
    return this.request(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },

  async deleteAdminUser(id: number): Promise<ApiResponse<any>> {
    return this.request(`/admin/users/${id}`, {
      method: "DELETE",
    });
  },

  async getAdminReports(): Promise<ApiResponse<any>> {
    return this.request("/admin/reports");
  },

  async getAdminCategories(): Promise<ApiResponse<any>> {
    return this.request("/admin/categories");
  },

  async createAdminCategory(data: unknown): Promise<ApiResponse<any>> {
    return this.request("/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateAdminCategory(id: number, data: unknown): Promise<ApiResponse<any>> {
    return this.request(`/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteAdminCategory(id: number): Promise<ApiResponse<any>> {
    return this.request(`/admin/categories/${id}`, {
      method: "DELETE",
    });
  },

  async getAdminSizes(): Promise<ApiResponse<any>> {
    return this.request("/admin/sizes");
  },
  async createAdminSize(data: unknown): Promise<ApiResponse<any>> {
    return this.request("/admin/sizes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteAdminSize(id: number): Promise<ApiResponse<any>> {
    return this.request(`/admin/sizes/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Seller Methods
   */
  async getSellerDashboard(): Promise<ApiResponse<any>> {
    return this.request("/seller/dashboard");
  },

  async getSellerProducts(): Promise<ApiResponse<any>> {
    return this.request("/seller/products");
  },

  async createSellerProduct(data: unknown): Promise<ApiResponse<any>> {
    return this.request("/seller/products", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateSellerProduct(data: unknown): Promise<ApiResponse<any>> {
    return this.request("/seller/products", {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteSellerProduct(id: number): Promise<ApiResponse<any>> {
    return this.request(`/seller/products?id=${id}`, {
      method: "DELETE"
    });
  },

  async getSellerReports(days: number = 7): Promise<ApiResponse<any>> {
    return this.request(`/seller/reports/sales?days=${days}`);
  },

  /**
   * Upload a product image (base64 -> disk). Returns { url, filename } on success.
   */
  async uploadProductImage(file: File): Promise<ApiResponse<{ url: string; filename: string }>> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result);
        resolve(result.slice(result.indexOf(",") + 1));
      };
      reader.onerror = () => reject(new Error("Could not read the selected file"));
      reader.readAsDataURL(file);
    });
    return this.request("/seller/uploads", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, content_type: file.type, data: base64 }),
    });
  },

  async getSellerProductReviews(productId: number): Promise<ApiResponse<any>> {
    return this.request(`/seller/reviews?product_id=${productId}`);
  },

  async getSellerOrders(params: PaginatedParams & Record<string, unknown> = {}): Promise<ApiResponse<any>> {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      cleaned[k] = String(v);
    }
    const query = new URLSearchParams(cleaned).toString();
    return this.request(`/seller/orders${query ? `?${query}` : ""}`);
  },

  async updateSellerOrderStatus(orderId: number, status: string): Promise<ApiResponse<any>> {
    return this.request("/seller/orders/status", {
      method: "PUT",
      body: JSON.stringify({ order_id: orderId, status })
    });
  },

  async markSellerOrderPayment(orderId: number, payment_status: string): Promise<ApiResponse<any>> {
    return this.request("/seller/orders/payment", {
      method: "PUT",
      body: JSON.stringify({ order_id: orderId, payment_status })
    });
  },

  async approveSellerReturn(orderId: number): Promise<ApiResponse<any>> {
    return this.request("/seller/orders/return", {
      method: "PUT",
      body: JSON.stringify({ order_id: orderId })
    });
  },

  async createReview(data: { product_id: number; rating: number; comment: string }): Promise<ApiResponse<any>> {
    return this.request("/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getProduct(id: number): Promise<ApiResponse<any>> {
    return this.request(`/products?id=${id}`);
  },

  async getSizes(): Promise<ApiResponse<any>> {
    return this.request("/sizes");
  },

  async getStores(): Promise<ApiResponse<any>> {
    return this.request("/stores");
  },

  async getStore(id: number): Promise<ApiResponse<any>> {
    return this.request(`/stores/${id}`);
  },

  async getSellerProfile(): Promise<ApiResponse<any>> {
    return this.request("/seller/profile");
  },

  async updateSellerProfile(data: unknown): Promise<ApiResponse<any>> {
    return this.request("/seller/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async getAdminOrders(params: PaginatedParams & { status?: string } = {}): Promise<ApiResponse<any>> {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      cleaned[k] = String(v);
    }
    const query = new URLSearchParams(cleaned).toString();
    return this.request(query ? `/admin/orders?${query}` : "/admin/orders");
  },

  async getAdminOrder(id: number): Promise<ApiResponse<any>> {
    return this.request(`/admin/orders/${id}`);
  },

  async markAdminOrderPayment(orderId: number, payment_status: string): Promise<ApiResponse<any>> {
    return this.request("/admin/orders/payment", {
      method: "PUT",
      body: JSON.stringify({ order_id: orderId, payment_status }),
    });
  },

  async getAdminPromoCodes(): Promise<ApiResponse<any>> {
    return this.request("/admin/promo-codes");
  },

  async createAdminPromoCode(data: unknown): Promise<ApiResponse<any>> {
    return this.request("/admin/promo-codes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateAdminPromoCode(id: number, data: unknown): Promise<ApiResponse<any>> {
    return this.request(`/admin/promo-codes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteAdminPromoCode(id: number): Promise<ApiResponse<any>> {
    return this.request(`/admin/promo-codes/${id}`, {
      method: "DELETE",
    });
  },
};
