export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  priceRaw: number;
  category: string;
  stock: number | null; // null = unlimited
  membersOnly: boolean;
  active: boolean;
}

export interface ShopOrder {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerInitials: string;
  products: string[];
  totalAmount: string;
  date: string;
  status: 'Offen' | 'Bezahlt' | 'Versendet' | 'Abgeschlossen';
}

export const products: Product[] = [
  { id: 'sp1', name: 'Vereins-Trikot Home', description: 'Offizielles Heimtrikot in Vereinsfarben', price: '45,00 €', priceRaw: 45, category: 'Bekleidung', stock: 24, membersOnly: true, active: true },
  { id: 'sp2', name: 'Trainingsshirt', description: 'Atmungsaktives Trainingsshirt mit Logo', price: '29,90 €', priceRaw: 29.9, category: 'Bekleidung', stock: 50, membersOnly: false, active: true },
  { id: 'sp3', name: 'Vereinsschal', description: 'Strickschal in Vereinsfarben', price: '15,00 €', priceRaw: 15, category: 'Accessoires', stock: 0, membersOnly: false, active: true },
  { id: 'sp4', name: 'Trinkflasche Logo', description: 'BPA-freie Trinkflasche 750ml mit Vereinslogo', price: '12,50 €', priceRaw: 12.5, category: 'Accessoires', stock: 35, membersOnly: false, active: true },
  { id: 'sp5', name: 'Jahrbuch 2025', description: 'Vereinsjahrbuch mit allen Highlights', price: '8,00 €', priceRaw: 8, category: 'Medien', stock: 5, membersOnly: false, active: true },
];

export const orders: ShopOrder[] = [
  { id: 'so1', orderNumber: 'B-2026-001', buyerName: 'Thomas Fischer', buyerInitials: 'TF', products: ['Vereins-Trikot Home'], totalAmount: '45,00 €', date: '14.03.2026', status: 'Abgeschlossen' },
  { id: 'so2', orderNumber: 'B-2026-002', buyerName: 'Sophie Müller', buyerInitials: 'SM', products: ['Trainingsshirt', 'Trinkflasche Logo'], totalAmount: '42,40 €', date: '15.03.2026', status: 'Versendet' },
  { id: 'so3', orderNumber: 'B-2026-003', buyerName: 'Anna Schmidt', buyerInitials: 'AS', products: ['Jahrbuch 2025'], totalAmount: '8,00 €', date: '16.03.2026', status: 'Bezahlt' },
  { id: 'so4', orderNumber: 'B-2026-004', buyerName: 'Markus Schneider', buyerInitials: 'MS', products: ['Vereins-Trikot Home', 'Vereins-Trikot Home'], totalAmount: '90,00 €', date: '16.03.2026', status: 'Offen' },
  { id: 'so5', orderNumber: 'B-2026-005', buyerName: 'Klaus Wagner', buyerInitials: 'KW', products: ['Trinkflasche Logo'], totalAmount: '12,50 €', date: '17.03.2026', status: 'Offen' },
];

export const productCategories = ['Bekleidung', 'Accessoires', 'Medien', 'Sonstiges'];
