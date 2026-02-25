export interface User {
  id: number;
  phone: string;
  name: string;
  role: 'buyer' | 'seller';
  verified: number;
  created_at: string;
}

export interface Product {
  id: number;
  seller_id: number;
  seller_name: string;
  seller_verified: number;
  name: string;
  description: string;
  price: number;
  location: string;
  category: string;
  image_url: string;
  delivery_method: string;
  created_at: string;
}

export interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  receiver_id: number;
  product_id: number;
  content: string;
  created_at: string;
}

export interface Order {
  id: number;
  product_id: number;
  buyer_id: number;
  status: 'pending' | 'paid' | 'delivered';
  payment_method: string;
  payment_reference?: string;
  created_at: string;
}

export interface Review {
  id: number;
  seller_id: number;
  buyer_id: number;
  buyer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}
