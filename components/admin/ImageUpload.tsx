'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export default function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setLoading(true);

    try {
      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Загружаем в bucket 'products'
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Получаем публичную ссылку
      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      onChange(data.publicUrl);
      
    } catch (error) {
      alert('Ошибка загрузки фото');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onRemove = () => {
    onChange(''); // Очищаем ссылку
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {value && value !== '/window.svg' ? (
          <div className="relative w-[200px] h-[200px] rounded-md overflow-hidden border border-gray-200">
            <div className="absolute top-2 right-2 z-10">
              <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <Image fill className="object-cover" alt="Image" src={value} />
          </div>
        ) : (
          <div className="w-[200px] h-[200px] bg-gray-100 rounded-md border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
             Нет фото
          </div>
        )}
      </div>
      
      <div>
        <label className={`
          flex items-center justify-center gap-2 w-full max-w-[200px]
          px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm
          text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer
          ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
          {loading ? (
             <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
             <Upload className="w-4 h-4" />
          )}
          <span>{loading ? 'Загрузка...' : 'Загрузить фото'}</span>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={onUpload} 
            disabled={disabled || loading}
          />
        </label>
        <p className="text-xs text-gray-500 mt-2">JPG, PNG до 5MB</p>
      </div>
    </div>
  );
}