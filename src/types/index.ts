export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promo_price?: number | null;
  purchase_price?: number | null;
  image: string;
  category: string;
  active: boolean;
  archived?: boolean;
  free_shipping?: boolean;
  indication?: string | null;
  contraindication?: string | null;
  compositions?: string | null;
  markup?: number | null;
  benefits?: string | null;
}

export type PriceHistoryType = 'purchase' | 'sale' | 'promo';

export interface ProductPriceHistory {
  id: string;
  product_id: string;
  type: PriceHistoryType;
  old_price: number | null;
  new_price: number;
  note: string | null;
  created_at: string;
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







