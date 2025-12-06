export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'vitamina' | 'mineral' | 'fitoterapico' | 'outros';
  inStock: boolean;
  isCustomizable: boolean;
}

export interface CustomMedication {
  id: string;
  name: string;
  activeIngredients: ActiveIngredient[];
  dosage: string;
  quantity: number;
  instructions: string;
  price: number;
  prescriptionRequired: boolean;
}

export interface ActiveIngredient {
  id: string;
  name: string;
  concentration: string;
  unit: 'mg' | 'g' | 'ml' | 'UI';
}

export type PurchaseType = 'one-time' | 'subscription';

export interface CartItem {
  id: string;
  product?: Product;
  customMedication?: CustomMedication;
  quantity: number;
  type: 'product' | 'custom';
  purchaseType?: PurchaseType; // 'one-time' ou 'subscription'
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'ready' | 'delivered';
  createdAt: Date;
}






