'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function CatalogSort() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || 'newest';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    
    // Создаем новые параметры URL, сохраняя старые (например, поиск ?q=...)
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    
    // Переходим по новому адресу
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 hidden sm:inline">Сортировка:</span>
      <select
        value={currentSort}
        onChange={handleChange}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="newest">Сначала новые</option>
        <option value="in_stock">В наличии</option>
        <option value="out_of_stock">Нет в наличии</option> {/* <-- НОВАЯ ОПЦИЯ */}
        <option value="price_asc">Сначала дешевые</option>
        <option value="price_desc">Сначала дорогие</option>
        <option value="name_asc">По названию (А-Я)</option>
      </select>
    </div>
  );
}