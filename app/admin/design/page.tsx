'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Trash2, Plus, Edit, Save, ArrowRight, X, ZoomIn, LayoutGrid } from 'lucide-react';
import DynamicIcon from '@/components/DynamicIcon';
import ImageUpload from '@/components/admin/ImageUpload';

export default function DesignPage() {
  const [navLinks, setNavLinks] = useState<any[]>([]);
  const [gridItems, setGridItems] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- МОДАЛКИ ---
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

  // --- STATE FOR FORMS ---
  const [newCat, setNewCat] = useState({ 
    label: '', href: '/catalog?q=', iconType: 'lucide', iconName: '', customImage: '' 
  });
  
  const [currentBanner, setCurrentBanner] = useState({
    id: null,
    image_url: '',
    title: '<b>НОВАЯ</b><br/>КОЛЛЕКЦИЯ',
    description: 'Описание акции',
    button_text: 'В Каталог',
    button_link: '/catalog',
    text_color: '#ffffff',
    sort_order: 0,
    image_position: '50% 50%',
    image_scale: 100 
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: nav } = await supabase.from('nav_links').select('*').order('sort_order');
    const { data: grid } = await supabase.from('grid_categories').select('*').order('sort_order');
    const { data: hero } = await supabase.from('hero_banners').select('*').order('sort_order');
    
    setNavLinks(nav || []);
    setGridItems(grid || []);
    setBanners(hero || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- МЕНЮ ---
  const addNavLink = async () => {
    const label = prompt('Название (например: Акции):');
    if (!label) return;
    const href = prompt('Ссылка:', '/catalog?q=');
    await (supabase.from('nav_links') as any).insert([{ label, href, sort_order: navLinks.length + 1 }]);
    fetchData();
  };
  
  const deleteNav = async (id: number) => {
    if(!confirm('Удалить пункт меню?')) return;
    await (supabase.from('nav_links') as any).delete().eq('id', id);
    fetchData();
  };

  // --- ПЛИТКА ---
  const handleAddGrid = async () => {
    if (!newCat.label) return alert('Введите название');
    const newItem = {
      label: newCat.label,
      href: newCat.href,
      icon_name: newCat.iconType === 'lucide' ? (newCat.iconName || 'Circle') : 'Circle',
      custom_image_url: newCat.iconType === 'custom' ? newCat.customImage : null,
      sort_order: gridItems.length + 1
    };
    const { error } = await (supabase.from('grid_categories') as any).insert([newItem]);
    if (error) return alert(error.message);
    setIsGridModalOpen(false);
    fetchData();
  };

  const deleteGrid = async (id: number) => {
    if(!confirm('Удалить плитку?')) return;
    await (supabase.from('grid_categories') as any).delete().eq('id', id);
    fetchData();
  };

  // --- БАННЕРЫ ---
  const openBannerModal = (banner?: any) => {
    if (banner) {
        setCurrentBanner({
            ...banner,
            image_position: banner.image_position || '50% 50%',
            image_scale: banner.image_scale || 100
        });
    } else {
        setCurrentBanner({
            id: null,
            image_url: '',
            title: 'EXCLUSIVE<br/>DEALS.',
            description: 'Премиальная электроника',
            button_text: 'Купить',
            button_link: '/catalog',
            text_color: '#ffffff',
            sort_order: banners.length + 1,
            image_position: '50% 50%',
            image_scale: 100
        });
    }
    setIsBannerModalOpen(true);
  };

  const saveBanner = async () => {
      if (!currentBanner.image_url) return alert('Загрузите изображение');
      
      const payload = {
          image_url: currentBanner.image_url,
          title: currentBanner.title,
          description: currentBanner.description,
          button_text: currentBanner.button_text,
          button_link: currentBanner.button_link,
          text_color: currentBanner.text_color,
          sort_order: currentBanner.sort_order,
          image_position: currentBanner.image_position,
          image_scale: currentBanner.image_scale
      };

      let error;
      if (currentBanner.id) {
          const res = await (supabase.from('hero_banners') as any).update(payload).eq('id', currentBanner.id);
          error = res.error;
      } else {
          const res = await (supabase.from('hero_banners') as any).insert([payload]);
          error = res.error;
      }

      if (error) return alert(error.message);
      setIsBannerModalOpen(false);
      fetchData();
  };

  const deleteBanner = async (id: number) => {
      if(!confirm('Удалить этот слайд?')) return;
      await (supabase.from('hero_banners') as any).delete().eq('id', id);
      fetchData();
  };

  const PositionSelector = () => {
      const positions = [
          { label: 'top-left', val: '0% 0%' },     { label: 'top-center', val: '50% 0%' },     { label: 'top-right', val: '100% 0%' },
          { label: 'center-left', val: '0% 50%' }, { label: 'center', val: '50% 50%' },      { label: 'center-right', val: '100% 50%' },
          { label: 'bottom-left', val: '0% 100%' },{ label: 'bottom-center', val: '50% 100%' },{ label: 'bottom-right', val: '100% 100%' },
      ];

      return (
          <div className="grid grid-cols-3 gap-2 w-full max-w-[140px]">
              {positions.map((pos) => (
                  <button
                    key={pos.val}
                    onClick={() => setCurrentBanner({...currentBanner, image_position: pos.val})}
                    className={`
                        aspect-square rounded-md border-2 flex items-center justify-center transition-all
                        ${currentBanner.image_position === pos.val 
                            ? 'bg-blue-600 border-blue-600 shadow-md scale-105' 
                            : 'bg-white border-gray-200 hover:border-gray-400'
                        }
                    `}
                  >
                      <div className={`w-2 h-2 rounded-full ${currentBanner.image_position === pos.val ? 'bg-white' : 'bg-gray-300'}`} />
                  </button>
              ))}
          </div>
      );
  };

  if (loading) return <div className="p-10 text-center text-gray-500 font-bold uppercase tracking-widest animate-pulse">Загрузка...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen pb-40 font-sans">
      <h1 className="text-4xl font-black text-gray-900 mb-10 tracking-tighter uppercase">Дизайн магазина</h1>

      {/* 1. БАННЕРЫ */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 mb-8">
         <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
            Слайдер на главной
          </h2>
          <button onClick={() => openBannerModal()} className="bg-black text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-gray-200">
            <Plus size={16} /> Добавить слайд
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {banners.map((banner, idx) => (
                <div key={banner.id} className="group flex gap-6 p-5 border border-gray-50 rounded-[2rem] bg-gray-50/50 items-center hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                    {/* МИНИАТЮРА (ИСПРАВЛЕНО) */}
                    <div className="w-32 h-20 relative rounded-2xl overflow-hidden bg-gray-200 flex-shrink-0 shadow-inner">
                         <img 
                            src={banner.image_url} 
                            className="w-full h-full object-cover" 
                            style={{ 
                                objectPosition: banner.image_position || '50% 50%',
                                transform: `scale(${(banner.image_scale || 100) / 100})`
                            }}
                            alt="slide" 
                         />
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Слайд #{idx + 1}</div>
                        <h4 className="font-bold text-gray-800 leading-tight line-clamp-1" dangerouslySetInnerHTML={{__html: banner.title}}></h4>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => openBannerModal(banner)} className="p-3 bg-white border border-gray-100 rounded-xl hover:bg-blue-50 text-blue-600 transition-all shadow-sm">
                            <Edit size={18} />
                        </button>
                        <button onClick={() => deleteBanner(banner.id)} className="p-3 bg-white border border-gray-100 rounded-xl hover:bg-red-50 text-red-500 transition-all shadow-sm">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))}
            {banners.length === 0 && <div className="text-center py-16 text-gray-300 font-bold uppercase tracking-widest border-2 border-dashed border-gray-100 rounded-[2.5rem]">Нет активных слайдов</div>}
        </div>
      </div>

      {/* --- МЕНЮ И ПЛИТКА (Без изменений) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black uppercase tracking-tight">Верхнее меню</h2>
                    <button onClick={addNavLink} className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1">
                        <Plus size={14}/> Добавить
                    </button>
                </div>
                <div className="space-y-2">
                    {navLinks.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <span className="font-bold text-gray-800 text-sm">{item.label}</span>
                            <button onClick={() => deleteNav(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black uppercase tracking-tight">Плитка категорий</h2>
                    <button onClick={() => setIsGridModalOpen(true)} className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1">
                        <Plus size={14}/> Добавить
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {gridItems.map((item) => (
                        <div key={item.id} className="relative p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center group">
                            <DynamicIcon name={item.icon_name} imageUrl={item.custom_image_url} className="w-6 h-6 mb-2 text-gray-600" />
                            <span className="font-bold text-[10px] uppercase tracking-tight line-clamp-1">{item.label}</span>
                            <button onClick={() => deleteGrid(item.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 transition-all"><X size={12}/></button>
                        </div>
                    ))}
                </div>
            </div>
      </div>

      {/* --- МОДАЛКА БАННЕРА --- */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
             <div className="bg-white rounded-[3rem] w-full max-w-6xl max-h-[95vh] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col overflow-hidden">
                
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Настройка слайда</h3>
                    <button onClick={() => setIsBannerModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black">
                        <X size={28} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* --- ПРЕДПРОСМОТР --- */}
                    <div className="mb-10">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 block ml-1">Живой предпросмотр</label>
                        <div className="relative w-full h-[350px] bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white ring-1 ring-gray-100 group">
                             {currentBanner.image_url ? (
                                <img 
                                    src={currentBanner.image_url} 
                                    className="w-full h-full object-cover transition-all duration-300" 
                                    style={{ 
                                        objectPosition: currentBanner.image_position,
                                        transform: `scale(${currentBanner.image_scale / 100})`
                                    }}
                                    alt="Preview" 
                                />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-50 font-black uppercase tracking-widest italic">Нет изображения</div>
                             )}
                             <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                             <div className="absolute inset-0 flex flex-col justify-center px-16 max-w-2xl pointer-events-none">
                                <h2 
                                    style={{ color: currentBanner.text_color }}
                                    className="text-5xl font-black leading-[0.9] mb-4 tracking-tighter drop-shadow-2xl"
                                    dangerouslySetInnerHTML={{ __html: currentBanner.title || 'ЗАГОЛОВОК' }} 
                                />
                                <p 
                                    style={{ color: currentBanner.text_color }}
                                    className="text-lg font-bold mb-8 opacity-80 drop-shadow-md whitespace-pre-line"
                                >
                                    {currentBanner.description || 'Описание акции появится здесь...'}
                                </p>
                                <div className="inline-flex bg-white text-black px-8 py-4 font-black text-xs uppercase tracking-[0.2em] rounded-xl items-center gap-2 w-max shadow-xl">
                                    {currentBanner.button_text} <ArrowRight size={16} />
                                </div>
                             </div>
                             <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-0 group-hover:opacity-20 pointer-events-none transition-opacity">
                                {[...Array(9)].map((_, i) => <div key={i} className="border border-white"></div>)}
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                        <div className="md:col-span-8 space-y-8">
                            <div className="flex gap-8 items-start">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Изображение</label>
                                    <ImageUpload value={currentBanner.image_url} onChange={(url) => setCurrentBanner({...currentBanner, image_url: url})} />
                                </div>
                                <div className="w-1/3 space-y-2 pt-6">
                                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                        <div className="flex justify-between mb-4">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1">
                                                <ZoomIn size={14}/> Масштаб
                                            </label>
                                            <span className="text-xs font-black text-blue-600">{currentBanner.image_scale}%</span>
                                        </div>
                                        <input 
                                            type="range" min="50" max="200" step="5"
                                            value={currentBanner.image_scale}
                                            onChange={(e) => setCurrentBanner({...currentBanner, image_scale: parseInt(e.target.value)})}
                                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Заголовок (HTML)</label>
                                    <textarea 
                                        className="w-full p-5 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-gray-50/50"
                                        rows={3} value={currentBanner.title}
                                        onChange={(e) => setCurrentBanner({...currentBanner, title: e.target.value})}
                                    />
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Теги: &lt;b&gt;жирный&lt;/b&gt;, &lt;br/&gt; (перенос)</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Описание</label>
                                    <textarea 
                                        className="w-full p-5 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-gray-50/50"
                                        rows={3} value={currentBanner.description}
                                        onChange={(e) => setCurrentBanner({...currentBanner, description: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Текст кнопки</label>
                                    <input 
                                        className="w-full p-5 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-gray-50/50"
                                        value={currentBanner.button_text}
                                        onChange={(e) => setCurrentBanner({...currentBanner, button_text: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Ссылка кнопки</label>
                                    <input 
                                        className="w-full p-5 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-gray-50/50"
                                        value={currentBanner.button_link}
                                        onChange={(e) => setCurrentBanner({...currentBanner, button_link: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-4 space-y-8 bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 h-fit">
                             <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                    <LayoutGrid size={14} /> Точка фокуса
                                </label>
                                <div className="flex flex-col gap-5">
                                    <PositionSelector />
                                    <div className="text-[10px] font-bold text-gray-400 leading-tight">
                                        Если фото не влезает целиком, выберите край, который важнее всего показать. <br/><br/>
                                        <span className="text-blue-600">Смотрите на предпросмотр!</span>
                                    </div>
                                </div>
                            </div>

                             <div className="space-y-3 pt-6 border-t border-gray-200">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Цвет текста</label>
                                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <input 
                                        type="color" value={currentBanner.text_color}
                                        onChange={(e) => setCurrentBanner({...currentBanner, text_color: e.target.value})}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                                    />
                                    <span className="text-sm font-black text-gray-600 font-mono tracking-tighter uppercase">{currentBanner.text_color}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4 shrink-0">
                    <button onClick={() => setIsBannerModalOpen(false)} className="px-8 py-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-black transition-all">Отмена</button>
                    <button onClick={saveBanner} className="px-10 py-4 bg-black text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-gray-200 flex items-center gap-2">
                        <Save size={18} /> Сохранить слайд
                    </button>
                </div>
             </div>
        </div>
      )}

      {/* МОДАЛКА КАТЕГОРИИ (Без изменений) */}
      {isGridModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[110] p-4">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 text-gray-900">Новый блок</h3>
            <div className="space-y-5">
              <input placeholder="Название" className="w-full p-5 border border-gray-200 rounded-2xl bg-gray-50 font-bold" value={newCat.label} onChange={e => setNewCat({...newCat, label: e.target.value})} />
              <input placeholder="Ссылка" className="w-full p-5 border border-gray-200 rounded-2xl bg-gray-50 font-bold" value={newCat.href} onChange={e => setNewCat({...newCat, href: e.target.value})} />
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsGridModalOpen(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">Отмена</button>
                <button onClick={handleAddGrid} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-200">Создать</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}