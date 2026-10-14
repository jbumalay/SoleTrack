export interface ProductInventory {
  inventory_id?: number;
  size_id: number;
  size_value: string | number;
  stock_quantity: number | string;
}

export interface ProductReview {
  review_id?: number;
  customer_name?: string;
  rating: number | string;
  comment?: string;
  created_at?: string;
}

export interface Product {
  id?: string | number;
  product_id?: number | string;
  name?: string;
  product_name?: string;
  price?: number | string;
  base_price?: number | string;
  image?: string;
  image_url?: string;
  category?: string;
  category_name?: string;
  description?: string;
  brand_name?: string;
  seller_id?: number;
  stock?: number;
  stock_quantity?: number;
  total_stock?: number;
  rating?: number;
  average_rating?: number | string;
  total_reviews?: number | string;
  reviews?: ProductReview[] | number;
  colors?: string[];
  sizes?: number[];
  inventory?: ProductInventory[];
}

export interface User {
  user_id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role: 'admin' | 'seller' | 'customer';
  customer_id?: number;
  seller_id?: number;
  admin_id?: number;
}

export interface CartItem {
  cart_item_id: number;
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  image_url: string;
  stock_quantity?: number;
}

export interface OrderItem {
  product_id?: number;
  product_name?: string;
  image_url?: string;
  quantity: number;
  price_at_purchase?: number | string;
  size_value?: string | number;
}

export interface OrderStatusHistoryItem {
  status: string;
  date_updated: string;
}

export interface Order {
  order_id: number;
  total_amount: number | string;
  order_status: string;
  status?: string;
  order_date: string;
  shipping_address?: string;
  items?: OrderItem[];
  history?: OrderStatusHistoryItem[];
}
