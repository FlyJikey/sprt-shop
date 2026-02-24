'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { toggleWaitlist, getUserWaitlist } from '@/app/actions';

interface NotifyButtonProps {
    productId: number;
}

// Глобальный кэш для предотвращения 40 запросов на странице каталога одновременно
let globalFetchPromise: Promise<{ user: any, waitlist: Set<number> }> | null = null;

async function getWaitlistData() {
    if (!globalFetchPromise) {
        globalFetchPromise = (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const waitlist = await getUserWaitlist(user.id);
                return { user, waitlist: new Set(waitlist) };
            }
            return { user: null, waitlist: new Set<number>() };
        })();
    }
    return globalFetchPromise;
}

export default function NotifyButton({ productId }: NotifyButtonProps) {
    const [isNotifying, setIsNotifying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        getWaitlistData().then(({ user, waitlist }) => {
            if (!isMounted) return;
            setUser(user);
            setIsNotifying(waitlist.has(productId));
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            globalFetchPromise = null; // сброс кэша при входе/выходе
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [productId]);

    const handleNotify = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!user) {
            router.push('/login');
            return;
        }

        setLoading(true);
        const result = await toggleWaitlist(productId, user.id);
        if (result.success) {
            setIsNotifying(result.action === 'added');
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <button
                disabled
                className="w-full mt-2 bg-gray-100 text-gray-400 py-1.5 sm:py-2 rounded-md font-medium text-xs sm:text-sm cursor-wait animate-pulse"
            >
                Загрузка...
            </button>
        );
    }

    if (isNotifying) {
        return (
            <button
                onClick={handleNotify}
                disabled={loading}
                className="w-full mt-2 bg-gray-800 text-white py-1.5 sm:py-2 rounded-md hover:bg-opacity-90 transition-all font-medium text-xs sm:text-sm"
            >
                В листе ожидания
            </button>
        );
    }

    return (
        <button
            onClick={handleNotify}
            disabled={loading}
            className="w-full mt-2 bg-spartak text-white py-1.5 sm:py-2 rounded-md hover:bg-opacity-90 transition-all font-medium text-xs sm:text-sm"
        >
            Сообщить о поступлении
        </button>
    );
}
