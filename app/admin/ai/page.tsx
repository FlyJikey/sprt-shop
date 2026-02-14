"use client";

import React, { useState, useRef } from "react";
import { 
  Sparkles, Tags, Play, Square, Terminal, Settings 
} from "lucide-react";
import { supabase } from "@/lib/supabase-client";

export default function AIPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [batchLimit, setBatchLimit] = useState(10);
  const stopSignal = useRef(false);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 100)]);
  };

  // === 1. КАТЕГОРИЗАЦИЯ (Твой Groq код) ===
  const startCategorization = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setCurrentTask("categorization");
    stopSignal.current = false;
    setLogs([]);
    addLog(`🚀 Запуск категоризации (Пакет: ${batchLimit} шт)...`);

    try {
      // Ищем товары, где категория пуста или "Каталог"
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, description')
        .or('category.is.null,category.eq."",category.eq."Каталог"')
        .limit(batchLimit);

      if (error) throw error;
      if (!products || products.length === 0) {
        addLog("✅ Все товары уже категоризированы.");
        return;
      }

      for (let i = 0; i < products.length; i++) {
        if (stopSignal.current) { addLog("🛑 Стоп по требованию."); break; }
        
        // --- ИСПРАВЛЕНИЕ: Добавлено 'as any', чтобы TypeScript не ругался ---
        const p = products[i] as any; 
        
        addLog(`📦 [${i+1}/${products.length}] Анализ: "${p.name.slice(0, 20)}..."`);

        const res = await fetch('/api/ai/categorize', {
          method: 'POST',
          body: JSON.stringify({ productId: p.id, name: p.name, description: p.description }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        
        if (res.ok) addLog(`✨ Категория: ${data.category}`);
        else addLog(`⚠️ Ошибка: ${data.error}`);
        
        await new Promise(r => setTimeout(r, 1500));
      }
      addLog("🏁 Категоризация завершена.");
    } catch (e: any) {
      addLog(`❌ Ошибка: ${e.message}`);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  // === 2. ВЕКТОРЫ (Улучшенная логика: Название + Категория + Описание) ===
  const startRecommendations = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setCurrentTask("embeddings");
    stopSignal.current = false;
    setLogs([]);
    addLog(`🔮 Генерация векторов (Пакет: ${batchLimit} шт)...`);

    try {
      // Берем товары БЕЗ векторов
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, category, description')
        .is('embedding', null)
        .limit(batchLimit);

      if (error) throw error;
      if (!products || products.length === 0) {
        addLog("✅ У всех товаров в этой выборке есть векторы.");
        return;
      }

      for (let i = 0; i < products.length; i++) {
        if (stopSignal.current) { addLog("🛑 Стоп."); break; }
        
        // --- ИСПРАВЛЕНИЕ: Добавлено 'as any' ---
        const p = products[i] as any;
        
        // МАКСИМАЛЬНЫЙ КОНТЕКСТ: Собираем всё, что знаем о товаре
        const fullText = `Товар: ${p.name}. Категория: ${p.category || 'Разное'}. Описание: ${p.description || ''}`;
        
        addLog(`🧬 [${i+1}/${products.length}] Вектор для: "${p.name.slice(0, 20)}..."`);

        const res = await fetch('/api/ai/embed', {
          method: 'POST',
          body: JSON.stringify({ productId: p.id, text: fullText }),
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) addLog(`✨ Вектор сохранен.`);
        else addLog(`⚠️ Ошибка API.`);
        
        await new Promise(r => setTimeout(r, 800));
      }
      addLog("🏁 Генерация векторов завершена.");
    } catch (e: any) {
      addLog(`❌ Ошибка: ${e.message}`);
    } finally {
      setIsProcessing(false);
      setCurrentTask(null);
    }
  };

  const handleStop = () => { stopSignal.current = true; };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI <span className="text-[#C5A070]">Manager</span></h1>
          <p className="text-gray-500 text-sm">Управление связями и категориями</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 border rounded shadow-sm">
          <Settings size={16} className="text-gray-400"/>
          <span className="text-sm font-medium">Лимит:</span>
          <input 
            type="number" 
            value={batchLimit} 
            onChange={(e) => setBatchLimit(Number(e.target.value))} 
            className="w-20 border rounded text-center font-bold" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Категории */}
        <div className="p-6 border rounded-xl bg-white shadow-sm hover:border-[#C5A070] transition-colors">
          <Tags className="mb-2 text-[#C5A070]" size={32}/>
          <h3 className="text-lg font-bold">Категоризация</h3>
          <p className="text-sm text-gray-500 mb-6">Создает структуру папок через Groq</p>
          <button 
            onClick={startCategorization} 
            disabled={isProcessing} 
            className="w-full py-3 bg-black text-white rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-gray-800 disabled:opacity-50"
          >
            <Play size={18}/> Запустить анализ
          </button>
        </div>

        {/* Векторы */}
        <div className="p-6 border rounded-xl bg-white shadow-sm hover:border-[#C5A070] transition-colors">
          <Sparkles className="mb-2 text-blue-500" size={32}/>
          <h3 className="text-lg font-bold">Рекомендации</h3>
          <p className="text-sm text-gray-500 mb-6">Создает векторы для похожих товаров</p>
          <button 
            onClick={startRecommendations} 
            disabled={isProcessing} 
            className="w-full py-3 bg-black text-white rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-gray-800 disabled:opacity-50"
          >
            <Play size={18}/> Создать векторы
          </button>
        </div>
      </div>

      {isProcessing && (
        <button 
          onClick={handleStop} 
          className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold flex justify-center gap-2"
        >
          <Square size={18} fill="currentColor"/> Остановить процесс
        </button>
      )}

      {/* Логи */}
      <div className="bg-[#1e1e1e] p-4 rounded-xl h-80 overflow-y-auto font-mono text-xs text-gray-300 border border-gray-800">
        <div className="flex justify-between border-b border-gray-700 pb-2 mb-2">
          <span className="font-bold text-gray-500 flex gap-2 items-center"><Terminal size={14}/> SYSTEM_LOGS</span>
          {logs.length > 0 && <button onClick={() => setLogs([])} className="hover:text-white underline">Clear</button>}
        </div>
        {logs.length === 0 ? (
          <div className="text-center mt-20 opacity-20">Ожидание запуска...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`mb-1 ${log.includes('❌') || log.includes('⚠️') ? 'text-red-400' : log.includes('✨') ? 'text-green-400' : ''}`}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}