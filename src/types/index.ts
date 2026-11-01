export type Language = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr';

export interface ProductItem {
  id: string;
  name: Record<Language, string>;
  price: number;
  currency: string;
  stock: number;
  icon: string;
  videoUrl: string;
  description: Record<Language, string>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: Record<Language, string> | string;
  suggestedProduct?: ProductItem;
  timestamp: string;
}

export interface ActionOrder {
  orderId: string;
  productName: string;
  amount: number;
  currency: string;
  trackingNumber: string;
  status: string;
  createdAt: string;
}
