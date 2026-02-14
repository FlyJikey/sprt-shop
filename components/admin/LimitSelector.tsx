'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function LimitSelector({ limit }: { limit: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = e.target.value;
    
    // Берем текущие параметры URL (например ?q=iphone)
    const params = new URLSearchParams(searchParams.toString());
    
    // Обновляем лимит
    params.set('limit', newLimit);
    
    // Сбрасываем страницу на 1, чтобы не улететь в пустоту
    params.set('page', '1');
    
    // Перезагружаем страницу с новыми параметрами
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Показать по:</span>
      <select
        value={limit}
        onChange={handleChange}
        className="border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
      >
        <option value="20">20</option>
        <option value="50">50</option>
        <option value="100">100</option>
        <option value="500">500</option>
        <option value="1000">1000</option>
      </select>
    </div>
  );
}