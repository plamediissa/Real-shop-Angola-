export interface User {
  id: string;
  email?: string;
  phone: string;
  name: string;
  password?: string;
  role: 'buyer' | 'seller';
  verified: number;
  created_at: any;
}

export interface Product {
  id: string;
  seller_id: string;
  seller_name: string;
  seller_verified: number;
  name: string;
  description: string;
  price: number;
  location: string;
  category: string;
  image_url: string;
  delivery_method: string;
  created_at: any;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  product_id: string;
  content: string;
  created_at: any;
}

export interface Order {
  id: string;
  product_id: string;
  buyer_id: string;
  status: 'pending' | 'paid' | 'delivered';
  payment_method: string;
  payment_reference?: string;
  created_at: any;
}

export interface Review {
  id: string;
  seller_id: string;
  buyer_id: string;
  buyer_name: string;
  rating: number;
  comment: string;
  created_at: any;
}
