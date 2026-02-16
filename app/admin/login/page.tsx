'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); 
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  // 1. АВТО-РЕДИРЕКТ
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile && (profile.role === 'admin' || profile.role === 'employee')) {
          router.replace('/admin/orders');
          return;
        }
      }
      setPageLoading(false);
    };
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Попытка входа
      const { data: { user }, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) throw new Error('Неверный email или пароль');
      if (!user) throw new Error('Пользователь не найден');

      // 2. Жесткая проверка роли
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || (profile.role !== 'admin' && profile.role !== 'employee')) {
        await supabase.auth.signOut();
        throw new Error('У этого аккаунта нет прав доступа к админ-панели');
      }

      // 3. Успех
      // ИСПРАВЛЕНИЕ: Обязательно обновляем роутер, чтобы layout увидел куки
      router.refresh(); 
      router.replace('/admin/orders'); 
      
    } catch (err: any) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-[#C5A070]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Декоративная полоска сверху */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[#C5A070]"></div>

        <div className="flex flex-col items-center mb-8 pt-4">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-[#C5A070] border border-gray-100">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wide">
            Admin<span className="text-[#C5A070]">Panel</span>
          </h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">
            Только для персонала
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 min-w-[20px]" size={20} />
            <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Email</label>
            <input 
              type="email" required 
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 focus:border-black focus:bg-white rounded-xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-300"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@spartak.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">Пароль</label>
            <input 
              type="password" required 
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 focus:border-black focus:bg-white rounded-xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-300"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#C5A070] transition-colors flex justify-center items-center gap-2 mt-2 shadow-lg hover:shadow-xl active:scale-[0.98] duration-200"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Lock size={16}/>}
            {loading ? 'Проверка прав...' : 'Войти в систему'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-400">
            Забыли пароль или нет доступа? <br/>
            Обратитесь к главному администратору.
          </p>
        </div>
      </div>
    </div>
  );
}