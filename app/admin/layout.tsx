"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Brain, 
  Tag, 
  LogOut, 
  Package, 
  UploadCloud, 
  Palette
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null); // <--- ИСПРАВЛЕНИЕ: any убирает ошибку сборки
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/admin/login');
          return;
        }

        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error || !userProfile) {
          console.error("Ошибка загрузки профиля:", error);
          router.push('/');
          return;
        }

        // Проверка роли
        if (userProfile.role !== 'admin' && userProfile.role !== 'employee') {
          router.push('/');
          return;
        }

        setProfile(userProfile);
        setIsLoading(false);
      } catch (e) {
        console.error("Auth error:", e);
        router.push('/');
      }
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">
        <div className="animate-pulse">Загрузка панели управления...</div>
      </div>
    );
  }

  const menuItems = [
    { name: "Главная", href: "/admin", icon: LayoutDashboard },
    { name: "Товары", href: "/admin/products", icon: ShoppingBag },
    { name: "Категории", href: "/admin/categories", icon: Tag },
    { name: "Заказы", href: "/admin/orders", icon: Package },
    { name: "Пользователи", href: "/admin/users", icon: Users },
    { name: "AI Менеджер", href: "/admin/ai", icon: Brain },
    { name: "Импорт", href: "/admin/import", icon: UploadCloud },
    { name: "Дизайн", href: "/admin/design", icon: Palette },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-100">
          <Link href="/" className="text-2xl font-black tracking-tighter block">
            SPAR<span className="text-[#C5A070]">TAK</span>
          </Link>
          <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Панель управления</div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-black text-white shadow-md" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="px-4 py-3 mb-2 rounded-lg bg-gray-50 border border-gray-100">
            <div className="text-xs text-gray-500 font-bold uppercase mb-1">Вы вошли как</div>
            <div className="text-sm font-bold truncate">{profile?.email || 'Администратор'}</div>
            <div className="text-xs text-[#C5A070] capitalize">{profile?.role}</div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors"
          >
            <LogOut size={18} /> Выйти
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-8">
        {children}
      </main>
    </div>
  );
}