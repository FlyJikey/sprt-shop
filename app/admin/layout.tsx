"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Layers, 
  Palette,
  Users,
  LogOut,
  Loader2,
  Upload,
  Brain // <--- 1. Импортировали иконку мозга
} from "lucide-react";

type UserProfile = {
  role: string;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      try {
        setLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          router.push('/admin/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile) {
          console.error("Ошибка доступа:", profileError);
          router.push('/'); 
          return;
        }

        if (profile.role !== 'admin' && profile.role !== 'employee') {
          router.push('/'); 
          return;
        }

        setRole(profile.role);
      } catch (error) {
        console.error('System error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 flex-col gap-4">
        <Loader2 className="animate-spin text-gray-400" size={40} />
      </div>
    );
  }

  // --- МЕНЮ ---
  const allMenuItems = [
    { name: "Обзор", href: "/admin", icon: LayoutDashboard },
    { name: "Заказы", href: "/admin/orders", icon: ShoppingBag },
    { name: "Товары", href: "/admin/products", icon: Package },
    { name: "Категории", href: "/admin/categories", icon: Layers },
    { name: "Импорт (CSV)", href: "/admin/import", icon: Upload },
    { name: "Дизайн", href: "/admin/design", icon: Palette },
    { name: "Сотрудники", href: "/admin/users", icon: Users },
    { name: "AI Ассистент", href: "/admin/ai", icon: Brain }, // <--- 2. Добавили новый раздел
  ];

  const employeeMenuItems = [
    { name: "Заказы", href: "/admin/orders", icon: ShoppingBag },
  ];

  const menuItems = role === 'admin' ? allMenuItems : employeeMenuItems;

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-black">
      <aside className="w-64 bg-black text-white flex flex-col fixed h-full z-10 left-0 top-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
           <span className="font-bold text-xl">Admin<span className="text-[#C5A070]">Panel</span></span>
        </div>
        
        <div className="px-6 py-4 border-b border-gray-800">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Роль</div>
            <div className="font-medium text-white capitalize">
              {role === 'admin' ? 'Администратор' : 'Сотрудник'}
            </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
           {menuItems.map((item) => {
             const Icon = item.icon;
             return (
               <Link 
                 key={item.href} 
                 href={item.href} 
                 className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors 
                   ${pathname === item.href ? 'bg-[#C5A070] text-white' : 'text-gray-400 hover:bg-gray-900 hover:text-white'}
                 `}
               >
                 <Icon size={18} />
                 {item.name}
               </Link>
             );
           })}
        </nav>

        <div className="p-4 border-t border-gray-800">
           <button 
             onClick={handleLogout} 
             className="flex items-center gap-3 text-red-400 hover:text-red-300 text-sm font-medium w-full px-3 py-2 transition-colors"
           >
             <LogOut size={18} /> Выйти
           </button>
        </div>
      </aside>
      
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}