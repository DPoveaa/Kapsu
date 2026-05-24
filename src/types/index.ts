export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promo_price?: number | null;
  image: string;
  category: 'vitamina' | 'mineral' | 'fitoterapico' | 'outros';
  inStock: boolean;
  free_shipping?: boolean;
}

export type PurchaseType = 'one-time' | 'subscription';

export interface CartItem {
  id: string;
  product?: Product;
  quantity: number;
  purchaseType?: PurchaseType; // 'one-time' ou 'subscription'
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'ready' | 'delivered';
  createdAt: Date;
}







