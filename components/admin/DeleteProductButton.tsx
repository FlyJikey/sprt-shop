'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase-client'; // ИСПРАВЛЕНО: берем из нового файла
import { useRouter } from 'next/navigation';

export default function DeleteProductButton({ id }: { id: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;

    setLoading(true);
    
    // Удаляем
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      alert('Ошибка при удалении: ' + error.message);
      console.error(error);
      setLoading(false);
    } else {
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
      title="Удалить"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
    </button>
  );
}