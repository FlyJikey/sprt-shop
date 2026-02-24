import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Brain,
  Tag,
  Package,
  UploadCloud,
  Palette
} from "lucide-react";
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/admin/LogoutButton';
import AdminMobileMenu from '@/components/admin/AdminMobileMenu';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { }
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'employee')) {
    redirect('/');
  }

  // --- ЛОГИКА МЕНЮ ---

  // Полный список всех возможных пунктов
  const allMenuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Главная", roles: ['admin'] },
    { href: "/admin/products", icon: ShoppingBag, label: "Товары", roles: ['admin'] },
    { href: "/admin/categories", icon: Tag, label: "Категории", roles: ['admin'] },
    // "orders" доступен и админу, и сотруднику
    { href: "/admin/orders", icon: Package, label: "Заказы", roles: ['admin', 'employee'] },
    { href: "/admin/users", icon: Users, label: "Пользователи", roles: ['admin'] },
    { href: "/admin/ai", icon: Brain, label: "AI Менеджер", roles: ['admin'] },
    { href: "/admin/import", icon: UploadCloud, label: "Импорт", roles: ['admin'] },
    { href: "/admin/design", icon: Palette, label: "Дизайн", roles: ['admin'] },
  ];

  // Фильтруем пункты согласно роли текущего пользователя
  const visibleMenuItems = allMenuItems.filter(item =>
    item.roles.includes(profile.role)
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 font-sans text-gray-900">
      <AdminMobileMenu
        userEmail={user.email || ''}
        userRole={profile.role}
        menuItems={visibleMenuItems.map(i => ({ href: i.href, label: i.label }))}
      />

      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-100">
          <Link href="/" className="text-2xl font-black tracking-tighter block">
            SPAR<span className="text-[#C5A070]">TAK</span>
          </Link>
          <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">Панель управления</div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {visibleMenuItems.map((item) => (
            <SidebarItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="px-4 py-3 mb-2 rounded-lg bg-gray-50 border border-gray-100">
            <div className="text-xs text-gray-500 font-bold uppercase mb-1">Вы вошли как</div>
            <div className="text-sm font-bold truncate" title={user.email}>{user.email}</div>
            <div className="text-xs text-[#C5A070] capitalize">
              {profile.role === 'employee' ? 'Сотрудник' : 'Администратор'}
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 w-full max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

function SidebarItem({ href, icon: Icon, label }: { href: string, icon: any, label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-black transition-colors group"
    >
      <Icon size={18} className="text-gray-400 group-hover:text-black" />
      {label}
    </Link>
  );
}