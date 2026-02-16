'use client';

import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh(); // Важно обновить серверные компоненты
  };

  return (
    <button 
      onClick={(e) => { e.preventDefault(); handleLogout(); }}
      className="flex items-center gap-3 px-4 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-colors"
    >
      <LogOut size={18} /> Выйти
    </button>
  );
}