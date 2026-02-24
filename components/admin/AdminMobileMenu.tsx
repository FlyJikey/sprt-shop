'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, ShoppingBag, Tag, Package, Users, Brain, UploadCloud, Palette } from 'lucide-react';
import LogoutButton from '@/components/admin/LogoutButton';

interface MenuItem {
    href: string;
    label: string;
}

const getIconForHref = (href: string) => {
    switch (href) {
        case "/admin": return LayoutDashboard;
        case "/admin/products": return ShoppingBag;
        case "/admin/categories": return Tag;
        case "/admin/orders": return Package;
        case "/admin/users": return Users;
        case "/admin/ai": return Brain;
        case "/admin/import": return UploadCloud;
        case "/admin/design": return Palette;
        default: return Tag;
    }
}

interface AdminMobileMenuProps {
    userEmail: string;
    userRole: string;
    menuItems: MenuItem[];
}

export default function AdminMobileMenu({ userEmail, userRole, menuItems }: AdminMobileMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const handleLogout = async () => {
        // We already have a LogoutButton logic, but typically we want to hit the same supabase signout. 
        // Usually it's better to just reuse the <LogoutButton /> component, or do it here. 
        // Since we don't know the exact implementation of LogoutButton without checking, we'll just redirect to a logout route or use supabase client.
        // However, looking at layout.tsx, there's `import LogoutButton from '@/components/admin/LogoutButton';`
        // We should probably just render the <LogoutButton /> directly inside our menu.
    };

    return (
        <div className="md:hidden">
            {/* Топбар (шапка) */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4 shadow-sm">
                <Link href="/admin" className="text-xl font-black tracking-tighter" onClick={() => setIsOpen(false)}>
                    SPAR<span className="text-[#C5A070]">TAK</span>
                </Link>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 text-gray-600 hover:text-gray-900 transition-colors bg-gray-50 rounded-lg border border-gray-100"
                    aria-label="Toggle admin menu"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Выпадающее меню */}
            {isOpen && (
                <div className="fixed inset-0 top-16 bg-white z-40 overflow-y-auto pt-4 shadow-2xl flex flex-col">
                    <nav className="flex-1 px-4 space-y-2">
                        {menuItems.map((item) => {
                            const Icon = getIconForHref(item.href);
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-4 px-4 py-4 rounded-xl text-base font-bold transition-colors ${isActive
                                        ? "bg-gray-900 text-white"
                                        : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    <Icon size={20} className={isActive ? "text-white" : "text-gray-400"} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 mt-auto">
                        <div className="px-4 py-4 mb-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                            <div className="text-xs text-gray-500 font-bold uppercase mb-1">Вы вошли как</div>
                            <div className="text-sm font-bold truncate text-gray-900" title={userEmail}>
                                {userEmail}
                            </div>
                            <div className="text-xs text-[#C5A070] capitalize mt-1 font-medium">
                                {userRole === 'employee' ? 'Сотрудник' : 'Администратор'}
                            </div>
                        </div>
                        <LogoutButton />
                    </div>
                </div>
            )}
        </div>
    );
}
