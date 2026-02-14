'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, User, ShieldCheck, Search, Loader2, Lock } from 'lucide-react';
import { getStaffUsers, assignRole, revokeAccess } from './actions';
import { supabase } from '@/lib/supabase-client';

const SUPER_ADMIN_EMAIL = 'sarahmandanil@gmail.com';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Форма
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data.user?.id || null);
  };

  const loadData = async () => {
    setLoading(true);
    const data = await getStaffUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const res = await assignRole(email, role);
    if (res.success) {
      setEmail('');
      await loadData();
    } else {
      alert(res.message);
    }
    setActionLoading(false);
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm('Вы уверены? Этот человек потеряет доступ к админ-панели.')) return;
    setActionLoading(true);
    const res = await revokeAccess(userId);
    if (res.success) {
      await loadData();
    } else {
      alert(res.message);
    }
    setActionLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black uppercase tracking-tight">Сотрудники</h1>
        <span className="text-gray-400 text-sm font-medium">{users.length} активных</span>
      </div>

      {/* ФОРМА ДОБАВЛЕНИЯ */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <UserPlus size={20} className="text-[#C5A070]" />
          Добавить сотрудника
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email пользователя</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-300" size={18} />
              <input 
                type="email" required
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-black transition-colors"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 pl-1">
              * Пользователь должен быть зарегистрирован на сайте
            </p>
          </div>
          <div className="w-full md:w-48">
             <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Роль доступа</label>
             <select 
               value={role} 
               onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
               className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-black cursor-pointer"
             >
               <option value="employee">Сотрудник</option>
               <option value="admin">Администратор</option>
             </select>
          </div>
          <button 
            type="submit" disabled={actionLoading}
            className="w-full md:w-auto px-6 py-2.5 bg-black text-white font-bold rounded-lg hover:bg-[#C5A070] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {actionLoading ? 'Обработка...' : 'Выдать права'}
          </button>
        </form>
      </div>

      {/* СПИСОК */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-12 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-4">Пользователь</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-3">Роль</div>
            <div className="col-span-2 text-right">Действие</div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <Loader2 className="animate-spin mx-auto mb-2" /> Загрузка списка...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Сотрудников нет.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((u) => {
              const isMe = u.id === currentUserId;
              const isSuperAdmin = u.email === SUPER_ADMIN_EMAIL;

              return (
                <div key={u.id} className="grid grid-cols-12 items-center px-6 py-4 hover:bg-gray-50 transition-colors">
                  {/* Имя */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}`}>
                      <User size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">{u.full_name || 'Без имени'}</div>
                      <div className="text-xs text-gray-400 font-mono sm:hidden">{u.email}</div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-span-3 text-sm text-gray-600 hidden sm:block">
                    {u.email}
                  </div>

                  {/* Роль */}
                  <div className="col-span-3">
                    {u.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-wide">
                        <ShieldCheck size={12} /> Админ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide">
                        <Shield size={12} /> Сотрудник
                      </span>
                    )}
                  </div>

                  {/* Действие */}
                  <div className="col-span-2 text-right flex justify-end">
                    {isSuperAdmin ? (
                       <span className="flex items-center gap-1 text-xs text-[#C5A070] font-bold uppercase">
                         <Lock size={12} /> DV
                       </span>
                    ) : isMe ? (
                      <span className="text-xs text-gray-300 font-medium">Это вы</span>
                    ) : (
                      <button 
                        onClick={() => handleRevoke(u.id)}
                        disabled={actionLoading}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Закрыть доступ"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}