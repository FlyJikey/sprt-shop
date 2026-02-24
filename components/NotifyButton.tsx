'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { toggleWaitlist, getUserWaitlist } from '@/app/actions';

interface NotifyButtonProps {
    productId: number;
}

export default function NotifyButton({ productId }: NotifyButtonProps) {
    const [isNotifying, setIsNotifying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        async function checkWaitlist() {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const waitlist = await getUserWaitlist(user.id);
                setIsNotifying(waitlist.includes(productId));
            }
            setLoading(false);
        }
        checkWaitlist();
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
                className="w-full mt-2 bg-spartak/50 text-white/70 py-2 rounded-md font-medium text-sm cursor-wait animate-pulse"
            >
                Сообщить о поступлении
            </button>
        );
    }

    if (isNotifying) {
        return (
            <button
                onClick={handleNotify}
                disabled={loading}
                className="w-full mt-2 bg-gray-800 text-white py-2 rounded-md hover:bg-opacity-90 transition-all font-medium text-sm"
            >
                В листе ожидания
            </button>
        );
    }

    return (
        <button
            onClick={handleNotify}
            disabled={loading}
            className="w-full mt-2 bg-spartak text-white py-2 rounded-md hover:bg-opacity-90 transition-all font-medium text-sm"
        >
            Сообщить о поступлении
        </button>
    );
}
