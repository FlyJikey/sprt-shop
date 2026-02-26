'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ fallback = '/' }: { fallback?: string }) {
    const router = useRouter();

    return (
        <button
            onClick={() => {
                if (window.history.length > 2) {
                    router.back();
                } else {
                    router.push(fallback);
                }
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors"
        >
            <ArrowLeft size={16} /> Назад к каталогу
        </button>
    );
}
