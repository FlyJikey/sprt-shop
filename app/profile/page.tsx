'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { useCart } from '@/app/store';
import {
  ShoppingBag, User, RefreshCcw, Mail,
  Clock, Package, CheckCircle2, XCircle,
  X, ShoppingCart, ChevronRight, MessageCircle, Send,
  Bell, Heart
} from 'lucide-react';
import { getOrderMessages, sendOrderMessage } from '@/app/actions';
import Image from 'next/image';

function ProfileContent() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({ full_name: '', phone: '+7', email: '' });
  const [orders, setOrders] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'waitlist' | 'favorites'>('orders');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorToast, setErrorToast] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const selectedOrderRef = useRef<any>(null); // Храним актуальный выбранный заказ для подписки
  const messagesRef = useRef<any[]>([]); // Храним актуальные сообщения для проверки дублей

  const { addItem } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Синхронизируем рефы с состоянием (нужно для Realtime колбеков)
  useEffect(() => { selectedOrderRef.current = selectedOrder; }, [selectedOrder]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Восстановление вкладки из URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'favorites' || tabParam === 'waitlist' || tabParam === 'orders') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // --- 1. ЗАГРУЗКА ДАННЫХ ---
  const loadData = useCallback(async () => {
    // Не ставим setLoading(true), чтобы не мигало при обновлении в фоне
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return router.push('/login');
    setUser(authUser);

    // Профиль
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (prof) {
      if (!prof.email && authUser.email) {
        await (supabase.from('profiles') as any).update({ email: authUser.email }).eq('id', authUser.id);
      }
      setProfile({
        full_name: prof.full_name || '',
        phone: prof.phone || '+7',
        email: prof.email || authUser.email || ''
      });
    }

    // Заказы
    const { data: ords } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*))')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });

    setOrders(ords || []);

    // Лист ожидания
    const { data: waitData } = await supabase
      .from('waitlist')
      .select('*, products(*)')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });

    setWaitlist(waitData || []);

    // Избранное
    const { data: favData } = await supabase
      .from('favorites')
      .select('*, products(*)')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });

    setFavorites(favData || []);

    // Если открыт заказ, обновляем и его статус
    if (selectedOrderRef.current) {
      const freshOrder = ords?.find(o => o.id === selectedOrderRef.current.id);
      if (freshOrder) setSelectedOrder(freshOrder);
    }

    setLoading(false);
  }, [router]);

  // Первичная загрузка
  useEffect(() => { loadData(); }, [loadData]);

  // --- 2. REALTIME ПОДПИСКА ---
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`user_dashboard_${user.id}`)
      // Слушаем изменения в заказах (статусы)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('⚡️ Обновление заказа:', payload.new);
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));

        // Если этот заказ сейчас открыт в модалке — обновляем его и там
        if (selectedOrderRef.current?.id === payload.new.id) {
          setSelectedOrder((prev: any) => ({ ...prev, ...payload.new }));
        }
      })
      // Слушаем новые сообщения (Чат)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_messages'
      }, (payload) => {
        const newMsg = payload.new;
        // Если сообщение относится к открытому заказу
        if (selectedOrderRef.current?.id === newMsg.order_id) {
          // Проверка на дубли (если мы уже добавили его оптимистично)
          // Сравниваем по ID или по (тексту + времени создания), если ID временный
          const isDuplicate = messagesRef.current.some(m => m.id === newMsg.id || (m.isOptimistic && m.text === newMsg.text));

          if (!isDuplicate) {
            console.log('📩 Новое сообщение из базы:', newMsg);
            setMessages(prev => [...prev, newMsg]);
          }
        }
      })
      .subscribe((status) => {
        console.log(`🔌 Статус соединения Realtime: ${status}`);
        if (status === 'SUBSCRIBED') {
          // Можно обновить данные при успешном переподключении
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // --- 3. АВТО-ОБНОВЛЕНИЕ ПРИ ВОЗВРАЩЕНИИ НА ВКЛАДКУ ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 Вкладка активна, проверяем обновления...');
        loadData();
        // Если открыт заказ, подгружаем свежие сообщения
        if (selectedOrderRef.current) {
          getOrderMessages(selectedOrderRef.current.id).then(setMessages);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadData]);

  // Скролл вниз при новых сообщениях
  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // --- ФУНКЦИИ ---

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    const { error } = await (supabase.from('profiles') as any)
      .update({ full_name: profile.full_name, phone: profile.phone, email: profile.email })
      .eq('id', user.id);

    if (error) alert('Ошибка: ' + error.message);
    else alert('Данные обновлены!');
    setIsSaving(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith('+7')) value = '+7';
    setProfile({ ...profile, phone: value });
  };

  const openOrder = async (order: any) => {
    setSelectedOrder(order);
    const msgs = await getOrderMessages(order.id);
    setMessages(msgs);
  };

  const handleSendMessage = async () => {
    if (!chatText.trim() || !selectedOrder || !user) return;

    const textToSend = chatText;
    setChatText(''); // Очищаем поле сразу

    // 1. ОПТИМИСТИЧНОЕ ДОБАВЛЕНИЕ (Мгновенно показываем сообщение)
    const tempMessage = {
      id: Date.now(), // Временный ID
      order_id: selectedOrder.id,
      text: textToSend,
      is_admin: false,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      isOptimistic: true // Флаг, что это локальное сообщение
    };

    setMessages(prev => [...prev, tempMessage]);

    // 2. Отправка на сервер
    await sendOrderMessage(selectedOrder.id, textToSend, false, user.id);

    // Примечание: Когда придет ответ от Realtime, он добавится в список.
    // Если нужно строго избегать дублей, можно фильтровать isOptimistic при получении настоящего ID.
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'new': return { label: 'Новый', color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} /> };
      case 'processing': return { label: 'В работе', color: 'bg-orange-100 text-orange-700', icon: <Package size={14} /> };
      case 'done': return { label: 'Выдан', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={14} /> };
      case 'cancelled': return { label: 'Отменен', color: 'bg-red-100 text-red-700', icon: <XCircle size={14} /> };
      default: return { label: status, color: 'bg-gray-100 text-gray-600', icon: null };
    }
  };

  if (loading && orders.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center font-black text-gray-400">
      ЗАГРУЗКА...
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 pb-20 font-sans">
      <Header />
      <div className="max-w-6xl mx-auto mt-10 px-4">
        <div className="flex justify-between items-end mb-10">
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase">Личный кабинет</h1>
          <button onClick={loadData} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Обновить данные">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-80 space-y-6">
            {/* Блок профиля */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-8 font-black text-gray-900 uppercase tracking-tighter">
                <User size={20} className="text-blue-600" /> Мои данные
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-black block mb-2 ml-1">Email</label>
                  <div className="text-sm bg-gray-50 p-4 rounded-2xl border border-gray-100 truncate flex items-center gap-2 text-gray-500 font-bold">
                    <Mail size={14} /> {profile.email || 'Загрузка...'}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-black block mb-2 ml-1">ФИО</label>
                  <input
                    className="w-full p-4 border border-gray-200 rounded-2xl text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-black block mb-2 ml-1">Телефон</label>
                  <input
                    className="w-full p-4 border border-gray-200 rounded-2xl text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={profile.phone}
                    onChange={handlePhoneChange}
                  />
                </div>
                <button
                  onClick={handleUpdateProfile}
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all disabled:bg-gray-300"
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
                <button onClick={handleLogout} className="w-full text-red-500 text-xs font-black uppercase tracking-widest mt-2 border border-red-50 py-4 rounded-2xl hover:bg-red-50 transition-all">
                  Выйти
                </button>
              </div>
            </div>
          </aside>

          <section className="flex-1">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 min-h-[500px]">
              <div className="flex items-center gap-4 sm:gap-6 mb-8 border-b border-gray-100 pb-4 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center gap-2 font-black text-sm sm:text-xl uppercase tracking-tighter pb-4 -mb-[17px] border-b-2 transition-all whitespace-nowrap ${activeTab === 'orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
                >
                  <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6" /> Мои покупки
                </button>
                <button
                  onClick={() => setActiveTab('waitlist')}
                  className={`flex items-center gap-2 font-black text-sm sm:text-xl uppercase tracking-tighter pb-4 -mb-[17px] border-b-2 transition-all whitespace-nowrap ${activeTab === 'waitlist' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
                >
                  <Bell className="w-4 h-4 sm:w-6 sm:h-6" /> Лист ожидания
                </button>
                <button
                  onClick={() => setActiveTab('favorites')}
                  className={`flex items-center gap-2 font-black text-sm sm:text-xl uppercase tracking-tighter pb-4 -mb-[17px] border-b-2 transition-all whitespace-nowrap ${activeTab === 'favorites' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
                >
                  <Heart className="w-4 h-4 sm:w-6 sm:h-6" /> Избранное
                </button>
              </div>

              {activeTab === 'orders' ? (
                orders.length === 0 ? (
                  <div className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest italic">У вас еще нет заказов</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {orders.map(order => {
                      const style = getStatusStyle(order.status);
                      return (
                        <div
                          key={order.id}
                          onClick={() => openOrder(order)}
                          className="cursor-pointer group border border-gray-50 rounded-3xl p-6 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all bg-gray-50/50 flex justify-between items-center"
                        >
                          <div className="space-y-1">
                            <div className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors tracking-tighter">Заказ #{order.id}</div>
                            <div className="text-xs text-gray-400 font-bold">{new Date(order.created_at).toLocaleDateString('ru-RU')}</div>
                            <div className={`mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${style.color}`}>
                              {style.icon} {style.label}
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-6">
                            <div className="text-2xl font-black text-blue-600 tracking-tighter">{order.total_price} ₽</div>
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                              <ChevronRight size={20} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : activeTab === 'waitlist' ? (
                waitlist.length === 0 ? (
                  <div className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest italic flex flex-col items-center justify-center gap-4">
                    <Bell size={48} className="opacity-20" />
                    Вы не подписывались на уведомления
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                    {waitlist.map((item) => {
                      const isAvailable = (item.products?.stock || 0) > 0;
                      return (
                        <div key={item.id} className="bg-gray-50/50 border border-gray-100 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col hover:border-blue-200 transition-colors group cursor-pointer" onClick={() => router.push(`/product/${item.products?.slug}`)}>
                          <div className="aspect-square bg-white rounded-xl sm:rounded-2xl mb-3 sm:mb-4 p-2 sm:p-4 flex items-center justify-center border border-gray-50 overflow-hidden relative">
                            {isAvailable ? (
                              <div className="absolute top-3 left-3 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm z-10">
                                В наличии
                              </div>
                            ) : (
                              <div className="absolute top-3 left-3 bg-gray-200 text-gray-500 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm z-10">
                                Ожидается
                              </div>
                            )}

                            {item.products?.image_url ? (
                              <Image src={item.products.image_url} alt="product" fill sizes="(max-width: 640px) 50vw, 33vw" className="object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <Package className="text-gray-300" size={32} />
                            )}

                            {isAvailable && (
                              <button
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); addItem(item.products); }}
                                className="absolute bottom-2 right-2 p-3 bg-black text-white rounded-xl shadow-lg hover:bg-spartak active:scale-95 transition-all z-20 flex"
                                title="В корзину"
                              >
                                <ShoppingCart className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                              </button>
                            )}
                          </div>
                          <div className="mt-auto">
                            <h3 className="font-bold text-gray-900 text-xs sm:text-sm leading-snug mb-2 line-clamp-2">{item.products?.name}</h3>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 gap-1 sm:gap-0">
                              <div className="text-xs sm:text-sm font-black text-gray-900">{item.products?.price} ₽</div>
                              <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-600 group-hover:text-blue-700 transition-colors sm:text-right">
                                Подробнее →
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              ) : (
                favorites.length === 0 ? (
                  <div className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest italic flex flex-col items-center justify-center gap-4">
                    <Heart size={48} className="opacity-20 flex-shrink-0" />
                    Ваш список избранного пуст
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                    {favorites.map((item) => (
                      <div key={item.id} className="bg-gray-50/50 border border-gray-100 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col hover:border-red-100 transition-colors group cursor-pointer" onClick={() => router.push(`/product/${item.products?.slug}`)}>
                        <div className="aspect-square bg-white rounded-xl sm:rounded-2xl mb-3 sm:mb-4 p-2 sm:p-4 flex items-center justify-center border border-gray-50 overflow-hidden relative">
                          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 text-red-500 z-10">
                            <Heart size={20} className="fill-current" />
                          </div>

                          {item.products?.image_url ? (
                            <Image src={item.products.image_url} alt="product" fill sizes="(max-width: 640px) 50vw, 33vw" className="object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <Package className="text-gray-300" size={32} />
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if ((item.products?.stock || 0) > 0) {
                                addItem(item.products);
                              } else {
                                setErrorToast('Этот товар временно отсутствует на складе');
                                setTimeout(() => setErrorToast(''), 3000);
                              }
                            }}
                            className="absolute bottom-2 right-2 p-3 bg-black text-white rounded-xl shadow-lg hover:bg-spartak active:scale-95 transition-all z-20 flex"
                            title="В корзину"
                          >
                            <ShoppingCart className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                          </button>
                        </div>
                        <div className="mt-auto">
                          <h3 className="font-bold text-gray-900 text-xs sm:text-sm leading-snug mb-2 line-clamp-2">{item.products?.name}</h3>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-2 gap-1 sm:gap-0">
                            <div className="text-xs sm:text-sm font-black text-gray-900">{item.products?.price} ₽</div>
                            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-red-600 group-hover:text-red-700 transition-colors sm:text-right">
                              Подробнее →
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Модалка заказа */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl my-auto flex flex-col shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-black uppercase tracking-tighter">ЗАКАЗ #{selectedOrder.id}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-4 hover:bg-white rounded-3xl transition-all text-gray-400 hover:text-red-500 shadow-sm">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 max-h-[75vh]">
              {/* Состав заказа */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Состав покупки</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-5 p-4 bg-white border border-gray-100 rounded-[2rem] hover:border-blue-200 transition-colors">
                      <div className="w-16 h-16 bg-gray-50 rounded-2xl border flex items-center justify-center p-2 flex-shrink-0 relative overflow-hidden">
                        {item.products?.image_url ? <Image src={item.products.image_url} fill sizes="64px" className="object-contain p-1" alt={item.product_name} /> : <div className="text-[8px] text-gray-300 font-bold uppercase">Фото</div>}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">{item.product_name}</h4>
                        <p className="text-blue-600 font-black text-lg">{item.price} ₽ <span className="text-xs text-gray-300 font-medium">x {item.quantity}</span></p>
                      </div>
                      <button onClick={() => item.products && addItem(item.products)} className="p-4 bg-gray-900 text-white rounded-2xl hover:bg-blue-600 active:scale-90 transition-all shadow-lg">
                        <ShoppingCart size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Чат */}
              <div className="pt-10 border-t border-gray-100">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 mb-5 flex items-center gap-2">
                  <MessageCircle size={16} className="text-blue-500" /> Переписка
                </h3>

                <div className="bg-gray-50 rounded-[2.5rem] p-6 space-y-4 h-64 overflow-y-auto mb-6 border border-gray-100 shadow-inner custom-scrollbar">
                  {messages.length === 0 && <p className="text-[10px] font-black uppercase tracking-widest opacity-30 text-center py-10">Сообщений нет</p>}

                  {messages.map((m: any, i: number) => (
                    <div key={m.id || i} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
                      <div className={`
                        max-w-[85%] p-4 rounded-3xl text-sm font-medium relative animate-in zoom-in-95 duration-200
                        ${m.is_admin ? 'bg-white border text-gray-800 shadow-sm' : 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'}
                        ${m.isOptimistic ? 'opacity-70' : 'opacity-100'}
                      `}>
                        {m.text}
                        <span className={`text-[8px] block mt-1.5 opacity-40 text-right font-black`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {m.isOptimistic && ' •'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className="flex gap-3">
                  <input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 p-5 border rounded-3xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Написать сообщение..."
                  />
                  <button onClick={handleSendMessage} className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg shadow-blue-200 hover:scale-105 active:scale-95 transition-all">
                    <Send size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Уведомление об ошибке (Товара нет в наличии) */}
      {errorToast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-white border border-red-100 shadow-2xl rounded-3xl p-4 flex gap-4 items-center max-w-sm animate-in slide-in-from-bottom-5">
          <div className="bg-red-50 text-red-600 p-3 rounded-2xl flex-shrink-0">
            <XCircle size={24} />
          </div>
          <div className="flex-1 mt-1">
            <h4 className="font-black text-gray-900 text-sm mb-0.5 uppercase tracking-tighter">Ошибка</h4>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">{errorToast}</p>
          </div>
          <button onClick={() => setErrorToast('')} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>
      )}
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-black text-gray-400 uppercase tracking-widest text-sm">
        Загрузка приложения...
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}