import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  stock: number; // ВАЖНО: Храним информацию об остатке
  slug: string;
  category?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: any) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => {
        const items = get().items;
        const existing = items.find((i) => i.id === product.id);

        if (existing) {
          // Если товар уже есть, увеличиваем, но НЕ БОЛЬШЕ остатка
          // Если остаток неизвестен (вдруг), ставим ограничение 99
          const limit = product.stock ?? 99;
          const newQuantity = Math.min(existing.quantity + 1, limit);
          
          set({
            items: items.map((i) =>
              i.id === product.id ? { ...i, quantity: newQuantity } : i
            ),
          });
        } else {
          // Новый товар
          set({ items: [...items, { ...product, quantity: 1 }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        const items = get().items;
        const item = items.find((i) => i.id === id);
        
        if (!item) return;

        // Самая главная защита:
        // 1. Нельзя меньше 1
        // 2. Нельзя больше, чем item.stock
        const limit = item.stock ?? 99;
        const validQuantity = Math.max(1, Math.min(quantity, limit));

        set({
          items: items.map((i) =>
            i.id === id ? { ...i, quantity: validQuantity } : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage', // Имя ключа в LocalStorage
    }
  )
);