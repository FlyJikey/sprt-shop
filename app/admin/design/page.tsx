'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Trash2, Plus, Edit, Save, ArrowRight, X, ZoomIn, LayoutGrid, Info, Image as ImageIcon, MapPin, Phone, Clock, Mail, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import DynamicIcon from '@/components/DynamicIcon';
import ImageUpload from '@/components/admin/ImageUpload';

export default function DesignPage() {
    const [navLinks, setNavLinks] = useState<any[]>([]);
    const [gridItems, setGridItems] = useState<any[]>([]);
    const [banners, setBanners] = useState<any[]>([]);
    const [aboutData, setAboutData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // --- МОДАЛКИ ---
    const [isNavModalOpen, setIsNavModalOpen] = useState(false);
    const [isGridModalOpen, setIsGridModalOpen] = useState(false);
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

    // --- STATE FOR FORMS ---
    const [currentNav, setCurrentNav] = useState({
        id: null, label: '', href: '/catalog?q=', sort_order: 0
    });

    const [currentGrid, setCurrentGrid] = useState({
        id: null, label: '', href: '/catalog?q=', iconType: 'lucide', iconName: '', customImage: '', sort_order: 0
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
        const { data: about } = await supabase.from('about_page_settings').select('*').single();

        setNavLinks(nav || []);
        setGridItems(grid || []);
        setBanners(hero || []);
        // Инициализируем поля, если их нет
        setAboutData(about || {
            id: 1, title: '', description: '', image_url: '',
            address: '', phone: '', email: '', schedule_weekdays: '', schedule_sunday: ''
        });
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // --- МЕНЮ И ПЛИТКА (ЛОГИКА) ---
    const openNavModal = (nav?: any) => {
        if (nav) {
            setCurrentNav({ ...nav });
        } else {
            setCurrentNav({ id: null, label: '', href: '/catalog?q=', sort_order: navLinks.length + 1 });
        }
        setIsNavModalOpen(true);
    };

    const saveNav = async () => {
        if (!currentNav.label) return alert('Введите название');

        const payload = {
            label: currentNav.label,
            href: currentNav.href,
            sort_order: currentNav.sort_order
        };

        let error;
        if (currentNav.id) {
            const res = await (supabase.from('nav_links') as any).update(payload).eq('id', currentNav.id);
            error = res.error;
        } else {
            const res = await (supabase.from('nav_links') as any).insert([payload]);
            error = res.error;
        }

        if (error) return alert(error.message);
        setIsNavModalOpen(false);
        fetchData();
    };

    const moveNav = async (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === navLinks.length - 1)) return;

        const newItems = [...navLinks];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        // Визуально меняем местами
        const temp = newItems[index];
        newItems[index] = newItems[swapIndex];
        newItems[swapIndex] = temp;

        // Пересчитываем порядок для всех элементов, чтобы избежать дубликатов (если они были)
        const updates = newItems.map((item, i) => {
            item.sort_order = i + 1;
            return (supabase.from('nav_links') as any).update({ sort_order: i + 1 }).eq('id', item.id);
        });

        await Promise.all(updates);
        fetchData();
    };

    const deleteNav = async (id: number) => {
        if (!confirm('Удалить пункт меню?')) return;
        await (supabase.from('nav_links') as any).delete().eq('id', id);
        fetchData();
    };

    const openGridModal = (grid?: any) => {
        if (grid) {
            setCurrentGrid({
                id: grid.id,
                label: grid.label,
                href: grid.href,
                iconType: grid.custom_image_url ? 'custom' : 'lucide',
                iconName: grid.icon_name || '',
                customImage: grid.custom_image_url || '',
                sort_order: grid.sort_order
            });
        } else {
            setCurrentGrid({
                id: null, label: '', href: '/catalog?q=', iconType: 'lucide', iconName: 'Circle', customImage: '', sort_order: gridItems.length + 1
            });
        }
        setIsGridModalOpen(true);
    };

    const saveGrid = async () => {
        if (!currentGrid.label) return alert('Введите название');

        const payload = {
            label: currentGrid.label,
            href: currentGrid.href,
            icon_name: currentGrid.iconType === 'lucide' ? (currentGrid.iconName || 'Circle') : null,
            custom_image_url: currentGrid.iconType === 'custom' ? currentGrid.customImage : null,
            sort_order: currentGrid.sort_order
        };

        let error;
        if (currentGrid.id) {
            const res = await (supabase.from('grid_categories') as any).update(payload).eq('id', currentGrid.id);
            error = res.error;
        } else {
            const res = await (supabase.from('grid_categories') as any).insert([payload]);
            error = res.error;
        }

        if (error) return alert(error.message);
        setIsGridModalOpen(false);
        fetchData();
    };

    const deleteGrid = async (id: number) => {
        if (!confirm('Удалить плитку?')) return;
        await (supabase.from('grid_categories') as any).delete().eq('id', id);
        fetchData();
    };

    const moveGrid = async (index: number, direction: 'left' | 'right') => {
        if ((direction === 'left' && index === 0) || (direction === 'right' && index === gridItems.length - 1)) return;

        const newItems = [...gridItems];
        const swapIndex = direction === 'left' ? index - 1 : index + 1;

        const temp = newItems[index];
        newItems[index] = newItems[swapIndex];
        newItems[swapIndex] = temp;

        const updates = newItems.map((item, i) => {
            item.sort_order = i + 1;
            return (supabase.from('grid_categories') as any).update({ sort_order: i + 1 }).eq('id', item.id);
        });

        await Promise.all(updates);
        fetchData();
    };

    // --- БАННЕРЫ (ЛОГИКА) ---
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
        if (!confirm('Удалить этот слайд?')) return;
        await (supabase.from('hero_banners') as any).delete().eq('id', id);
        fetchData();
    };

    const moveBanner = async (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === banners.length - 1)) return;

        const newItems = [...banners];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        const temp = newItems[index];
        newItems[index] = newItems[swapIndex];
        newItems[swapIndex] = temp;

        const updates = newItems.map((item, i) => {
            item.sort_order = i + 1;
            return (supabase.from('hero_banners') as any).update({ sort_order: i + 1 }).eq('id', item.id);
        });

        await Promise.all(updates);
        fetchData();
    };

    // --- О НАС (ЛОГИКА) ---
    const saveAboutPage = async () => {
        const idToUpdate = aboutData.id || 1;

        const { error } = await supabase
            .from('about_page_settings')
            .upsert({
                id: idToUpdate,
                title: aboutData.title,
                description: aboutData.description,
                main_text: aboutData.main_text,
                image_url: aboutData.image_url,
                // Сохраняем контакты
                address: aboutData.address,
                phone: aboutData.phone,
                email: aboutData.email,
                schedule_weekdays: aboutData.schedule_weekdays,
                schedule_sunday: aboutData.schedule_sunday,
                updated_at: new Date().toISOString()
            });

        if (error) return alert('Ошибка сохранения: ' + error.message);
        setIsAboutModalOpen(false);
        fetchData();
    };

    const PositionSelector = () => {
        const positions = [
            { label: 'top-left', val: '0% 0%' }, { label: 'top-center', val: '50% 0%' }, { label: 'top-right', val: '100% 0%' },
            { label: 'center-left', val: '0% 50%' }, { label: 'center', val: '50% 50%' }, { label: 'center-right', val: '100% 50%' },
            { label: 'bottom-left', val: '0% 100%' }, { label: 'bottom-center', val: '50% 100%' }, { label: 'bottom-right', val: '100% 100%' },
        ];

        return (
            <div className="grid grid-cols-3 gap-2 w-full max-w-[140px]">
                {positions.map((pos) => (
                    <button
                        key={pos.val}
                        onClick={() => setCurrentBanner({ ...currentBanner, image_position: pos.val })}
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                {/* 1. БАННЕРЫ */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-full">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                            Слайдер
                        </h2>
                        <button onClick={() => openBannerModal()} className="bg-black text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-gray-200">
                            <Plus size={14} /> Добавить
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {banners.map((banner, idx) => (
                            <div key={banner.id} className="group flex gap-4 p-4 border border-gray-50 rounded-[2rem] bg-gray-50/50 items-center hover:bg-white hover:border-blue-100 hover:shadow-lg transition-all">
                                <div className="w-20 h-14 relative rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 shadow-inner">
                                    <img
                                        src={banner.image_url}
                                        className="w-full h-full object-cover"
                                        style={{
                                            objectFit: (banner.image_scale || 100) < 100 ? 'contain' : 'cover',
                                            objectPosition: banner.image_position || '50% 50%',
                                            transform: `scale(${(banner.image_scale || 100) / 100})`,
                                            transformOrigin: banner.image_position || '50% 50%'
                                        }}
                                        alt="slide"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">#{idx + 1}</div>
                                    <h4 className="font-bold text-gray-800 text-xs leading-tight line-clamp-1 truncate" dangerouslySetInnerHTML={{ __html: banner.title }}></h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openBannerModal(banner)} className="p-2 bg-white border border-gray-100 rounded-lg hover:bg-blue-50 text-blue-600 transition-all shadow-sm">
                                        <Edit size={14} />
                                    </button>
                                    <button onClick={() => deleteBanner(banner.id)} className="p-2 bg-white border border-gray-100 rounded-lg hover:bg-red-50 text-red-500 transition-all shadow-sm">
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="flex flex-col ml-1 bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                                        <button onClick={() => moveBanner(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white"><ChevronUp size={12} /></button>
                                        <div className="h-px bg-gray-100" />
                                        <button onClick={() => moveBanner(idx, 'down')} disabled={idx === banners.length - 1} className="p-1 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white"><ChevronDown size={12} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {banners.length === 0 && <div className="text-center py-10 text-gray-300 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-gray-100 rounded-[2rem]">Нет слайдов</div>}
                    </div>
                </div>

                {/* 2. О НАС */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <span className="w-2 h-8 bg-[#9C2730] rounded-full"></span>
                            Страница "О нас"
                        </h2>
                        <button onClick={() => setIsAboutModalOpen(true)} className="bg-gray-100 text-gray-900 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2">
                            <Edit size={14} /> Редактировать
                        </button>
                    </div>

                    <div className="flex-1 bg-gray-50 rounded-[2rem] p-6 border border-gray-100 relative overflow-hidden group cursor-pointer" onClick={() => setIsAboutModalOpen(true)}>
                        <div className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Edit size={16} className="text-gray-500" />
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 h-full">
                            {/* Мини-превью */}
                            <div className="w-full md:w-1/3 aspect-video md:aspect-auto bg-gray-200 rounded-2xl overflow-hidden relative shadow-inner">
                                {aboutData?.image_url ? (
                                    <img src={aboutData.image_url} className="w-full h-full object-cover" alt="About" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                        <ImageIcon size={24} className="mb-2 opacity-50" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Нет фото</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col justify-center">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Заголовок</div>
                                <h3 className="font-black text-xl text-gray-900 mb-4 line-clamp-2" dangerouslySetInnerHTML={{ __html: aboutData?.title || 'Без заголовка' }}></h3>

                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Контакты</div>
                                <div className="text-xs text-gray-600 font-bold space-y-1">
                                    <div>{aboutData?.phone || 'Телефон не указан'}</div>
                                    <div>{aboutData?.schedule_weekdays || 'График не указан'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- МЕНЮ И ПЛИТКА --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black uppercase tracking-tight">Верхнее меню</h2>
                        <button onClick={() => openNavModal()} className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1">
                            <Plus size={14} /> Добавить
                        </button>
                    </div>
                    <div className="space-y-2">
                        {navLinks.map((item, index) => (
                            <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                                <span className="font-bold text-gray-800 text-sm truncate mr-4">{item.label}</span>
                                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <div className="flex flex-col mr-2 bg-gray-200/50 rounded-lg overflow-hidden">
                                        <button onClick={() => moveNav(index, 'up')} disabled={index === 0} className="p-1 hover:bg-gray-300 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronUp size={14} /></button>
                                        <button onClick={() => moveNav(index, 'down')} disabled={index === navLinks.length - 1} className="p-1 hover:bg-gray-300 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronDown size={14} /></button>
                                    </div>
                                    <button onClick={() => openNavModal(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={16} /></button>
                                    <button onClick={() => deleteNav(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black uppercase tracking-tight">Плитка категорий</h2>
                        <button onClick={() => openGridModal()} className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1">
                            <Plus size={14} /> Добавить
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {gridItems.map((item, index) => (
                            <div key={item.id} className="relative p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center text-center group">
                                <DynamicIcon name={item.icon_name} imageUrl={item.custom_image_url} className="w-6 h-6 mb-2 text-gray-600" />
                                <span className="font-bold text-[10px] uppercase tracking-tight line-clamp-1">{item.label}</span>

                                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <div className="flex flex-col gap-1">
                                        <button onClick={() => moveGrid(index, 'left')} disabled={index === 0} className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full disabled:opacity-30 disabled:hover:bg-gray-100 transition-colors"><ChevronLeft size={16} /></button>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button onClick={() => openGridModal(item)} className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"><Edit size={14} /></button>
                                        <button onClick={() => deleteGrid(item.id)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-full transition-colors"><Trash2 size={14} /></button>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button onClick={() => moveGrid(index, 'right')} disabled={index === gridItems.length - 1} className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full disabled:opacity-30 disabled:hover:bg-gray-100 transition-colors"><ChevronRight size={16} /></button>
                                    </div>
                                </div>
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
                            {/* (Оставил старый код баннера без изменений для краткости, он тут есть) */}
                            <div className="mb-10">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 block ml-1">Живой предпросмотр</label>
                                <div className="relative w-full h-[350px] bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white ring-1 ring-gray-100 group">
                                    {currentBanner.image_url ? (
                                        <img
                                            src={currentBanner.image_url}
                                            className="w-full h-full object-cover transition-all duration-300"
                                            style={{
                                                objectFit: currentBanner.image_scale < 100 ? 'contain' : 'cover',
                                                objectPosition: currentBanner.image_position || '50% 50%',
                                                transform: `scale(${currentBanner.image_scale / 100})`,
                                                transformOrigin: currentBanner.image_position || '50% 50%'
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
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                                <div className="md:col-span-8 space-y-8">
                                    <div className="flex gap-8 items-start">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Изображение</label>
                                            <ImageUpload value={currentBanner.image_url} onChange={(url) => setCurrentBanner({ ...currentBanner, image_url: url })} />
                                        </div>
                                        <div className="w-1/3 space-y-2 pt-6">
                                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                                <div className="flex justify-between mb-4">
                                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1">
                                                        <ZoomIn size={14} /> Масштаб
                                                    </label>
                                                    <span className="text-xs font-black text-blue-600">{currentBanner.image_scale}%</span>
                                                </div>
                                                <input
                                                    type="range" min="50" max="200" step="5"
                                                    value={currentBanner.image_scale}
                                                    onChange={(e) => setCurrentBanner({ ...currentBanner, image_scale: parseInt(e.target.value) })}
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
                                                onChange={(e) => setCurrentBanner({ ...currentBanner, title: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Описание</label>
                                            <textarea
                                                className="w-full p-5 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-gray-50/50"
                                                rows={3} value={currentBanner.description}
                                                onChange={(e) => setCurrentBanner({ ...currentBanner, description: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Текст кнопки</label>
                                            <input
                                                className="w-full p-5 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-gray-50/50"
                                                value={currentBanner.button_text}
                                                onChange={(e) => setCurrentBanner({ ...currentBanner, button_text: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Ссылка кнопки</label>
                                            <input
                                                className="w-full p-5 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-gray-50/50"
                                                value={currentBanner.button_link}
                                                onChange={(e) => setCurrentBanner({ ...currentBanner, button_link: e.target.value })}
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
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-6 border-t border-gray-200">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Цвет текста</label>
                                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                            <input
                                                type="color" value={currentBanner.text_color}
                                                onChange={(e) => setCurrentBanner({ ...currentBanner, text_color: e.target.value })}
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

            {/* --- МОДАЛКА "О НАС" (ОБНОВЛЕННАЯ С КОНТАКТАМИ) --- */}
            {isAboutModalOpen && aboutData && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[95vh] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0">
                            <h3 className="text-xl font-black uppercase tracking-tighter">Настройка страницы "О нас"</h3>
                            <button onClick={() => setIsAboutModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black">
                                <X size={28} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* ЛЕВАЯ КОЛОНКА - ФОТО */}
                                <div className="space-y-6">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                        <ImageIcon size={14} /> Фото магазина
                                    </label>

                                    <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100">
                                        <ImageUpload
                                            value={aboutData.image_url}
                                            onChange={(url) => setAboutData({ ...aboutData, image_url: url })}
                                        />
                                        <p className="text-[10px] text-gray-400 font-bold mt-4 text-center leading-relaxed">
                                            Это фото будет отображаться крупно в блоке "О нас". Рекомендуем горизонтальное фото высокого качества.
                                        </p>
                                    </div>

                                    {/* БЛОК КОНТАКТОВ (НОВЫЙ) */}
                                    <div className="space-y-4 pt-6 border-t border-gray-100">
                                        <h4 className="font-black uppercase text-sm text-gray-900 mb-2">Контакты</h4>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2 ml-1">
                                                <MapPin size={12} /> Адрес
                                            </label>
                                            <input
                                                className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#9C2730] outline-none font-bold text-xs bg-gray-50/50"
                                                value={aboutData.address}
                                                onChange={(e) => setAboutData({ ...aboutData, address: e.target.value })}
                                                placeholder="г. Ростов..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2 ml-1">
                                                <Phone size={12} /> Телефон
                                            </label>
                                            <input
                                                className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#9C2730] outline-none font-bold text-xs bg-gray-50/50"
                                                value={aboutData.phone}
                                                onChange={(e) => setAboutData({ ...aboutData, phone: e.target.value })}
                                                placeholder="+7..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2 ml-1">
                                                <Mail size={12} /> Email
                                            </label>
                                            <input
                                                className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#9C2730] outline-none font-bold text-xs bg-gray-50/50"
                                                value={aboutData.email}
                                                onChange={(e) => setAboutData({ ...aboutData, email: e.target.value })}
                                                placeholder="info@..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ПРАВАЯ КОЛОНКА - ТЕКСТЫ И ГРАФИК */}
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2 ml-1">
                                            <Info size={14} /> Главный Заголовок
                                        </label>
                                        <textarea
                                            className="w-full p-5 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-[#9C2730] outline-none font-bold text-sm bg-gray-50/50"
                                            rows={2}
                                            value={aboutData.title}
                                            onChange={(e) => setAboutData({ ...aboutData, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2 ml-1">
                                            <Info size={14} /> Короткое описание
                                        </label>
                                        <textarea
                                            className="w-full p-5 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-[#9C2730] outline-none font-bold text-sm bg-gray-50/50"
                                            rows={3}
                                            value={aboutData.description}
                                            onChange={(e) => setAboutData({ ...aboutData, description: e.target.value })}
                                        />
                                    </div>

                                    {/* БЛОК ГРАФИКА РАБОТЫ (НОВЫЙ) */}
                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <h4 className="font-black uppercase text-sm text-gray-900 mb-2 flex items-center gap-2">
                                            <Clock size={16} className="text-[#9C2730]" /> Режим работы
                                        </h4>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Будни (Пн-Сб)</label>
                                                <input
                                                    className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#9C2730] outline-none font-bold text-xs bg-gray-50/50"
                                                    value={aboutData.schedule_weekdays}
                                                    onChange={(e) => setAboutData({ ...aboutData, schedule_weekdays: e.target.value })}
                                                    placeholder="Пн-Сб: 09:00 - 20:00"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Выходные (Вс)</label>
                                                <input
                                                    className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#9C2730] outline-none font-bold text-xs bg-gray-50/50"
                                                    value={aboutData.schedule_sunday}
                                                    onChange={(e) => setAboutData({ ...aboutData, schedule_sunday: e.target.value })}
                                                    placeholder="Вс: 09:00 - 18:00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4 shrink-0">
                            <button onClick={() => setIsAboutModalOpen(false)} className="px-8 py-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-black transition-all">Отмена</button>
                            <button onClick={saveAboutPage} className="px-10 py-4 bg-black text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-[#9C2730] transition-all shadow-xl shadow-gray-200 flex items-center gap-2">
                                <Save size={18} /> Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* МОДАЛКА ВЕРХНЕГО МЕНЮ */}
            {isNavModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[110] p-4">
                    <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900">
                                {currentNav.id ? 'Редактировать ссылку' : 'Новая ссылка'}
                            </h3>
                            <button onClick={() => setIsNavModalOpen(false)} className="text-gray-400 hover:text-black">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Название</label>
                                <input placeholder="Например: Акции" className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-gray-50/50" value={currentNav.label} onChange={e => setCurrentNav({ ...currentNav, label: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Ссылка</label>
                                <input placeholder="/catalog?q=" className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-gray-50/50" value={currentNav.href} onChange={e => setCurrentNav({ ...currentNav, href: e.target.value })} />
                            </div>
                            <div className="flex gap-4 pt-4 border-t border-gray-100">
                                <button onClick={() => setIsNavModalOpen(false)} className="flex-1 py-4 text-gray-500 hover:bg-gray-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-colors">Отмена</button>
                                <button onClick={saveNav} className="flex-1 py-4 bg-black text-white hover:bg-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-gray-200 transition-colors">
                                    Сохранить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* МОДАЛКА КАТЕГОРИИ */}
            {isGridModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[110] p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[95vh] shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10 shrink-0">
                            <h3 className="text-xl font-black uppercase tracking-tighter">
                                {currentGrid.id ? 'Настройка плитки' : 'Новая плитка'}
                            </h3>
                            <button onClick={() => setIsGridModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black">
                                <X size={28} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Название</label>
                                        <input
                                            placeholder="Например: Обувь"
                                            className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-gray-50/50"
                                            value={currentGrid.label}
                                            onChange={e => setCurrentGrid({ ...currentGrid, label: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Ссылка</label>
                                        <input
                                            placeholder="/catalog?q="
                                            className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-gray-50/50"
                                            value={currentGrid.href}
                                            onChange={e => setCurrentGrid({ ...currentGrid, href: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 block">Тип иконки</label>
                                        <div className="flex bg-gray-100 p-1.5 rounded-xl">
                                            <button
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${currentGrid.iconType === 'lucide' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                                                onClick={() => setCurrentGrid({ ...currentGrid, iconType: 'lucide' })}
                                            >
                                                Стандартная
                                            </button>
                                            <button
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${currentGrid.iconType === 'custom' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                                                onClick={() => setCurrentGrid({ ...currentGrid, iconType: 'custom' })}
                                            >
                                                Загрузить
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100">
                                    {currentGrid.iconType === 'lucide' ? (
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                                <Search size={14} /> Название иконки Lucide
                                            </label>
                                            <input
                                                className="w-full p-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-white"
                                                placeholder="Например: ShoppingBag, Zap, Star..."
                                                value={currentGrid.iconName}
                                                onChange={e => setCurrentGrid({ ...currentGrid, iconName: e.target.value })}
                                            />
                                            <div className="text-[10px] text-gray-500 font-medium">
                                                Поддерживаются любые иконки из <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">lucide.dev</a>. Введите точное название на английском с большой буквы.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                                                <ImageIcon size={14} /> Своя иконка (SVG/PNG)
                                            </label>
                                            <ImageUpload
                                                value={currentGrid.customImage}
                                                onChange={(url) => setCurrentGrid({ ...currentGrid, customImage: url })}
                                            />
                                        </div>
                                    )}

                                    <div className="mt-8 flex flex-col items-center">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Предпросмотр</label>
                                        <div className="w-24 h-24 bg-white rounded-3xl border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden">
                                            {currentGrid.iconType === 'lucide' ? (
                                                <DynamicIcon name={currentGrid.iconName || 'Circle'} className="text-gray-400 w-8 h-8" />
                                            ) : (
                                                currentGrid.customImage ? (
                                                    <img src={currentGrid.customImage} alt="Preview" className="w-12 h-12 object-contain" />
                                                ) : (
                                                    <div className="text-gray-300"><ImageIcon size={32} /></div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4 shrink-0">
                            <button onClick={() => setIsGridModalOpen(false)} className="px-8 py-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-black transition-all">Отмена</button>
                            <button onClick={saveGrid} className="px-10 py-4 bg-black text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-gray-200 flex items-center gap-2">
                                <Save size={18} /> Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}