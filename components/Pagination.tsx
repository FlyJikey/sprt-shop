'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ totalPages, currentPage }: { totalPages: number, currentPage: number }) {
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNumber.toString());
    return `?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-4 mt-12">
      {currentPage > 1 ? (
        <Link
          href={createPageURL(currentPage - 1)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
        >
          <ChevronLeft size={16} /> Назад
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 border border-transparent text-gray-300 cursor-not-allowed font-medium">
          <ChevronLeft size={16} /> Назад
        </div>
      )}

      <span className="text-sm font-medium text-gray-500">
        Страница {currentPage} из {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={createPageURL(currentPage + 1)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
        >
           Вперед <ChevronRight size={16} />
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 border border-transparent text-gray-300 cursor-not-allowed font-medium">
           Вперед <ChevronRight size={16} />
        </div>
      )}
    </div>
  );
}