'use client';
import { getProxyImageUrl } from "@/lib/proxy-image";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { 
  Folder, FolderOpen, ChevronRight, ChevronDown, 
  Edit2, Trash2, Plus, Package, Search, RefreshCw 
} from 'lucide-react';
// Импортируем только то, что реально есть в actions.ts
import { createCategory, renameCategoryV2, deleteCategoryV2, syncCategories } from '@/app/actions';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'rename' | null>(null);
  const [inputValue, setInputValue] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const { data: cats, error } = await supabase.from('categories').select('*').order('path');
    if (error) console.error('Load categories error:', error);
    
    const { data: prods } = await supabase.from('products').select('id, name, price, image_url, category');
    
    setCategories(cats || []);
    setProducts(prods || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleNode = (path: string) => {
    const newSet = new Set(expandedNodes);
    if (newSet.has(path)) newSet.delete(path); else newSet.add(path);
    setExpandedNodes(newSet);
  };

  const handleCreate = async () => {
    if (!inputValue.trim()) return;
    const res = await createCategory(inputValue, modalMode === 'create' ? selectedPath : null);
    if (res.success) { setModalMode(null); setInputValue(''); fetchData(); }
    else alert('Ошибка: ' + res.error);
  };

  const handleRename = async () => {
    if (!selectedPath || !inputValue.trim()) return;
    const res = await renameCategoryV2(selectedPath, inputValue);
    if (res.success) { setModalMode(null); setInputValue(''); setSelectedPath(null); fetchData(); }
    else alert('Ошибка');
  };

  const handleDelete = async () => {
    if (!selectedPath) return;
    if (confirm(`Удалить категорию "${selectedPath}" и товары?`)) {
      await deleteCategoryV2(selectedPath);
      setSelectedPath(null);
      fetchData();
    }
  };

  const handleSync = async () => {
    setLoading(true);
    await syncCategories();
    fetchData();
  };

  const filteredProducts = selectedPath 
    ? products.filter(p => p.category && p.category.startsWith(selectedPath))
    : [];

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col md:flex-row gap-6">
      {/* ДЕРЕВО */}
      <div className="w-full md:w-80 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[85vh]">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-black">Категории</h2>
          <div className="flex gap-2">
            <button onClick={handleSync} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg"><RefreshCw size={16}/></button>
            <button onClick={() => { setSelectedPath(null); setModalMode('create'); }} className="p-2 bg-blue-600 text-white rounded-lg"><Plus size={16}/></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {categories.map(cat => {
            const depth = (cat.level || 1) - 1;
            const isSelected = selectedPath === cat.path;
            const hasChildren = categories.some(c => c.parent_path === cat.path);
            const isExpanded = expandedNodes.has(cat.path);

            // Визуальная вложенность
            if (cat.parent_path && !expandedNodes.has(cat.parent_path)) return null;

            return (
              <div 
                key={cat.id}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer ${isSelected ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
                style={{ marginLeft: `${depth * 16}px` }}
                onClick={() => { setSelectedPath(cat.path); if(!isExpanded) toggleNode(cat.path); }}
              >
                <div onClick={(e) => { e.stopPropagation(); toggleNode(cat.path); }} className={`p-1 ${!hasChildren && 'opacity-0'}`}>
                  {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                </div>
                {isExpanded || isSelected ? <FolderOpen size={16} className="text-yellow-500"/> : <Folder size={16} className="text-yellow-500"/>}
                <span className="text-sm font-medium truncate">{cat.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* КОНТЕНТ */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[85vh]">
        {selectedPath ? (
          <>
            <div className="p-8 border-b">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-black">{selectedPath.split(' : ').pop()}</h1>
                  <div className="text-xs text-gray-400 mt-1">{selectedPath}</div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setModalMode('create')} className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold uppercase tracking-widest">Создать</button>
                   <button onClick={() => { setInputValue(selectedPath.split(' : ').pop() || ''); setModalMode('rename'); }} className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold uppercase tracking-widest">Имя</button>
                   <button onClick={handleDelete} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest">Удалить</button>
                </div>
              </div>
              <div className="text-sm text-gray-500 font-medium">Товаров: <b>{filteredProducts.length}</b></div>
            </div>
            <div className="flex-1 overflow-y-auto">
               <table className="w-full text-left">
                 <thead className="bg-gray-50 sticky top-0">
                   <tr>
                     <th className="p-4 text-[10px] font-black uppercase text-gray-400">Фото</th>
                     <th className="p-4 text-[10px] font-black uppercase text-gray-400">Название</th>
                     <th className="p-4 text-[10px] font-black uppercase text-gray-400 text-right">Цена</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {filteredProducts.map(p => (
                     <tr key={p.id}>
                       <td className="p-4 w-16">
                         <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                           {p.image_url ? <img src={getProxyImageUrl(p.image_url)} className="w-full h-full object-contain"/> : <Package size={16}/>}
                         </div>
                       </td>
                       <td className="p-4 font-bold text-sm">{p.name}</td>
                       <td className="p-4 text-right font-black">{p.price} ₽</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
            <FolderOpen size={64} className="mb-4 text-gray-200" />
            <p className="font-bold uppercase tracking-widest text-sm">Выберите категорию</p>
          </div>
        )}
      </div>

      {/* МОДАЛКА */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-black mb-6">{modalMode === 'create' ? 'Новая папка' : 'Имя'}</h3>
            <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} className="w-full p-4 border rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 mb-6" placeholder="Название..." autoFocus />
            <div className="flex gap-4">
              <button onClick={() => setModalMode(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Отмена</button>
              <button onClick={modalMode === 'create' ? handleCreate : handleRename} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">{modalMode === 'create' ? 'Создать' : 'Сохранить'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
