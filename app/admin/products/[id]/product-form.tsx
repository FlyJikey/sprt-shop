'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ImageUpload from '@/components/admin/ImageUpload';
import CategorySelector from '@/components/admin/CategorySelector';

interface ProductFormProps {
  initialData: any | null;
}

const STANDARD_UNITS = ['шт', 'пара', 'компл', 'упак', 'метр', 'кг'];

export default function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Состояние формы
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    price: initialData?.price || 0,
    stock: initialData?.stock || 0,
    category: initialData?.category || '',
    description: initialData?.description || '',
    image_url: initialData?.image_url || '',
  });

  // Логика единиц измерения
  const [selectedUnit, setSelectedUnit] = useState('шт');
  const [customUnit, setCustomUnit] = useState('');

  // При загрузке определяем: это стандартная единица или своя?
  useEffect(() => {
    if (initialData?.unit) {
      if (STANDARD_UNITS.includes(initialData.unit)) {
        setSelectedUnit(initialData.unit);
        setCustomUnit('');
      } else {
        setSelectedUnit('шт'); 
        setCustomUnit(initialData.unit);
      }
    }
  }, [initialData]);

  const title = initialData ? 'Редактировать товар' : 'Создать товар';
  const action = initialData ? 'Сохранить изменения' : 'Создать';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const finalUnit = customUnit.trim().length > 0 ? customUnit.trim() : selectedUnit;

    const dataToSave = {
      ...formData,
      unit: finalUnit,
    };

    try {
      if (initialData) {
        // ОБНОВЛЕНИЕ
        // Применяем (supabase.from('products') as any), чтобы обойти ошибку типа 'never'
        const { error } = await (supabase.from('products') as any)
          .update(dataToSave)
          .eq('id', initialData.id);

        if (error) throw error;
      } else {
        // СОЗДАНИЕ
        const slug = formData.name.toLowerCase().replace(/ /g, '-') + '-' + Date.now();
        const { error } = await (supabase.from('products') as any)
          .insert([{ ...dataToSave, slug }]);

        if (error) throw error;
      }

      router.refresh();
      router.push('/admin/products');
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/products" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        
        <button
          onClick={onSubmit}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          {action}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Левая колонка */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
             <h3 className="font-semibold text-gray-900 mb-4">Основная информация</h3>
             
             <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Название товара</label>
               <input
                 required
                 value={formData.name}
                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                 className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
               />
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">Цена (₽)</label>
                 <input
                   type="number"
                   required
                   value={formData.price}
                   onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                   className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">Остаток на складе</label>
                 <input
                   type="number"
                   required
                   value={formData.stock}
                   onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                   className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                 />
               </div>
             </div>

             <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Описание</label>
               <textarea
                 rows={6}
                 value={formData.description}
                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                 className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                 placeholder="Подробное описание товара..."
               />
             </div>
          </div>
        </div>

        {/* Правая колонка */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
             <h3 className="font-semibold text-gray-900 mb-4">Изображение</h3>
             <ImageUpload 
               value={formData.image_url} 
               onChange={(url) => setFormData({ ...formData, image_url: url })}
               disabled={loading}
             />
             <p className="text-xs text-gray-400">
               Изображения сохраняются в Supabase Storage.
             </p>
           </div>

           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
             <h3 className="font-semibold text-gray-900 mb-4">Настройки</h3>
             
             <div className="mb-4">
               <CategorySelector 
                 value={formData.category} 
                 onChange={(value) => setFormData({ ...formData, category: value })} 
               />
             </div>

             <div className="space-y-2 bg-gray-50 p-3 rounded-md border border-gray-200">
               <label className="text-sm font-medium text-gray-700 block mb-1">Единица измерения</label>
               
               <select
                 value={selectedUnit}
                 onChange={(e) => {
                    setSelectedUnit(e.target.value);
                    setCustomUnit('');
                 }}
                 className="w-full p-2 border border-gray-300 rounded-md mb-2 bg-white"
                 disabled={customUnit.length > 0}
               >
                 {STANDARD_UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                 ))}
               </select>

               <input
                 type="text"
                 value={customUnit}
                 onChange={(e) => setCustomUnit(e.target.value)}
                 placeholder="Или введите свой вариант..."
                 className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               />
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}