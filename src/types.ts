export interface PurchaseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  qty: number;
  cost: number; // Unit cost
  note: string;
  createdAt: number;
}

export interface SaleRecord {
  id: string;
  date: string; // YYYY-MM-DD
  qty: number;
  channel: string;
  createdAt: number;
}

export interface SKU {
  id: string;
  name: string;
  initialStock: number;
  purchases: PurchaseRecord[];
  sales: SaleRecord[];
}

export interface Product {
  id: string;
  name: string;
  leadtime: number; // Replenishment cycle (now at Product level!)
  skus: SKU[];
}

export interface InventoryState {
  products: Product[];
}

export const CHANNELS = ['淘宝', '小红书', '微店', '线下', '其他'] as const;
export type ChannelType = typeof CHANNELS[number];
