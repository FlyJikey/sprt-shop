'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { toggleWaitlist, getUserWaitlist } from '@/app/actions';

interface NotifyButtonProps {
    productId: number;
}

let globalFetchPromise: Promise<{ user: any, waitlist: Set<number> }> | null = null;

async function getWaitlistData() {
    if (globalFetchPromise) {
        return globalFetchPromise;
    }

    globalFetchPromise = new Promise(async (resolve) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const waitlist = await getUserWaitlist(user.id);
                resolve({ user, waitlist: new Set(waitlist) });
            } else {
                resolve({ user: null, waitlist: new Set<number>() });
            }
        } catch (error) {
            console.error("Waitlist fetch error", error);
            resolve({ user: null, waitlist: new Set<number>() });
        }
    });

    return globalFetchPromise;
}

export default function NotifyButton({ productId }: NotifyButtonProps) {
    const [isNotifying, setIsNotifying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        getWaitlistData()
            .then(({ user, waitlist }) => {
                if (!isMounted) return;
                setUser(user);
                setIsNotifying(waitlist.has(productId));
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching waitlist:", error);
                if (!isMounted) return;
                setLoading(false); // Всегда сбрасываем состояние загрузки при ошибке
            });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            // Сбрасываем кэш ТОЛЬКО при реальном входе/выходе, а не при инициализации INITIAL_SESSION
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                globalFetchPromise = null;
            }
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
