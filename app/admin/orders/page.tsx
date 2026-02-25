'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import {
  Package, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Archive, Inbox,
  MessageCircle, Send, AlertTriangle, RefreshCcw
} from 'lucide-react';
import {
  updateOrderStatus,
  getOrderItems,
  getOrderMessages,
  sendOrderMessage
} from '@/app/actions';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');

  const chatEndRef = useRef<HTMLDivElement>(null);
  // Используем ref для текущей вкладки, чтобы Realtime видел актуальное состояние без перезапуска эффекта
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    const statuses = activeTab === 'active' ? ['new', 'processing', 'ready'] : ['done', 'cancelled'];
    const { data } = await supabase
      .from('orders')
      .select('*')
      .in('status', statuses)
      .order('id', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  // --- ЕДИНАЯ СТАБИЛЬНАЯ ПОДПИСКА ---
  useEffect(() => {
    console.log("--- ИНИЦИАЛИЗАЦИЯ REALTIME КАНАЛА ---");

    const channel = supabase
      .channel('admin_universal_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('📡 СОБЫТИЕ ТАБЛИЦЫ ORDERS:', payload);

          const currentStatuses = activeTabRef.current === 'active' ? ['new', 'processing', 'ready'] : ['done', 'cancelled'];

          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            if (currentStatuses.includes(newOrder.status)) {
              setOrders(prev => [newOrder, ...prev]);
            }
          }
          else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            setOrders(prev => {
              const isMatch = currentStatuses.includes(updated.status);
              const exists = prev.find(o => o.id === updated.id);

              if (exists && !isMatch) return prev.filter(o => o.id !== updated.id);
              if (!exists && isMatch) return [updated, ...prev].sort((a, b) => b.id - a.id);
              if (exists && isMatch) return prev.map(o => o.id === updated.id ? updated : o);
              return prev;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_messages' },
        (payload) => {
          setMessages((prev) => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe((status) => {
        console.log('СТАТУС ПОДПИСКИ:', status);
        setConnectionStatus(status);
      });

    return () => {
      // При HMR мы даем время на закрытие
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 200);
    };
  }, []); // Пустой массив зависимостей = подписка живет всё время работы страницы

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleToggleDetails = async (orderId: number) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
      const [orderItems, orderMsgs] = await Promise.all([
        getOrderItems(orderId),
        getOrderMessages(orderId)
      ]);
      setItems(orderItems);
      setMessages(orderMsgs);
    }
  };

  const handleAdminReply = async (orderId: number) => {
    if (!replyText.trim()) return;
    const text = replyText;
    setReplyText('');
    await sendOrderMessage(orderId, text, true);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'new': return { label: 'Новый', color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} /> };
      case 'processing': return { label: 'В работе', color: 'bg-orange-100 text-orange-700', icon: <Package size={14} /> };
      case 'ready': return { label: 'К выдаче', color: 'bg-purple-100 text-purple-700', icon: <Inbox size={14} /> };
      case 'done': return { label: 'Выдан', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={14} /> };
      case 'cancelled': return { label: 'Отменен', color: 'bg-red-100 text-red-700', icon: <XCircle size={14} /> };
      default: return { label: status, color: 'bg-gray-100', icon: null };
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">Заказы</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'SUBSCRIBED' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Realtime: {connectionStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={fetchOrders} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'active' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-gray-900'}`}
              >
                <Inbox size={18} /> Активные
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'archive' ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-400 hover:text-gray-900'}`}
              >
                <Archive size={18} /> Архив
              </button>
            </div>
          </div>
        </div>

        {loading && orders.length === 0 ? (
          <div className="text-center py-20 text-gray-300 font-black uppercase tracking-widest animate-pulse">Загрузка...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Пусто</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = getStatusInfo(order.status);
              const isExpanded = expandedOrder === order.id;

              return (
                <div key={order.id} className={`bg-white rounded-3xl border transition-all duration-300 ${isExpanded ? 'ring-4 ring-blue-500/10 border-blue-500 shadow-2xl' : 'border-gray-100 shadow-sm'}`}>
                  <div className="p-6 flex items-center justify-between cursor-pointer" onClick={() => handleToggleDetails(order.id)}>
                    <div className="flex items-center gap-8">
                      <span className="text-xl font-black text-gray-300">#{order.id}</span>
                      <div>
                        <div className="font-black text-gray-900 text-lg">{order.customer_name}</div>
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-tight">{order.customer_phone}</div>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 ${status.color}`}>
                        {status.icon} {status.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <div className="text-2xl font-black text-gray-900">{order.total_price} ₽</div>
                        <div className="text-[10px] text-gray-400 font-black uppercase">{new Date(order.created_at).toLocaleTimeString('ru-RU')}</div>
                      </div>
                      <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'}`}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-8 border-t border-gray-50 bg-gray-50/30 rounded-b-3xl grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Состав</h4>
                          <div className="bg-white p-5 rounded-3xl border border-gray-100 space-y-3">
                            {items.map((item: any) => (
                              <div key={item.id} className="flex justify-between items-center text-sm">
                                <span className="font-bold text-gray-700">{item.product_name} <span className="text-gray-300 ml-1">x{item.quantity}</span></span>
                                <span className="font-black">{item.price * item.quantity} ₽</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Статус</h4>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => updateOrderStatus(order.id, 'processing')} className="bg-orange-500 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-orange-600 active:scale-95 transition-all">В работу</button>
                            <button onClick={() => updateOrderStatus(order.id, 'ready')} className="bg-purple-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-purple-700 active:scale-95 transition-all">К выдаче</button>
                            <button onClick={() => updateOrderStatus(order.id, 'done')} className="bg-green-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-green-700 active:scale-95 transition-all">Выдан</button>
                            <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="bg-red-500 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase hover:bg-red-600 active:scale-95 transition-all">Отмена</button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col h-[400px]">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2 ml-1">
                          <MessageCircle size={14} className="text-blue-500" /> Чат
                        </h4>
                        <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 p-5 overflow-y-auto space-y-3 shadow-inner mb-4">
                          {messages.map((m: any, i: number) => (
                            <div key={i} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-bold ${m.is_admin ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-800'}`}>
                                {m.text}
                              </div>
                            </div>
                          ))}
                          <div ref={chatEndRef} />
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdminReply(order.id)}
                            className="flex-1 p-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Ответить..."
                          />
                          <button onClick={() => handleAdminReply(order.id)} className="bg-gray-900 text-white p-4 rounded-2xl hover:bg-black transition-all active:scale-90 shadow-xl"><Send size={20} /></button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}