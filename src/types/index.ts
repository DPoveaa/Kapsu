export type ProductTargetAudience = 'male' | 'female' | 'unisex' | 'unknown';

export interface Product {
  id: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  label_url?: string | null;
  label_original_name?: string | null;
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
  targetAudience?: ProductTargetAudience | null;
  target_audience?: ProductTargetAudience | null;
  indication?: string | null;
  contraindication?: string | null;
  compositions?: string | null;
  markup?: number | null;
  benefits?: string | null;
  slug?: string | null;
  sku?: string;
  quantity?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  tags?: string | null;
  last_sync?: string | null;
  created_at?: string;
  updated_at?: string;
  intended_form?: string | null;
  intended_presentation?: string | null;
  intended_units_per_dose?: string | null;
  marketplace_tags?: string | null;
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







