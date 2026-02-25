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
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [batchLimit, setBatchLimit] = useState(10);
  const stopSignal = useRef(false);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 100)]);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from("ai_history")
      .select("*, products(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setHistory(data);
    setLoadingHistory(false);
  };

  React.useEffect(() => {
    loadHistory();
  }, []);

  // === 1. КАТЕГОРИЗАЦИЯ ===
  const startCategorization = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setCurrentTask("categorization");
    stopSignal.current = false;
    setLogs([]);
    addLog(`🚀 Запуск категоризации (Пакет: ${batchLimit} шт)...`);

    try {
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

        // ВАЖНО: as any решает ошибку сборки
        const p = products[i] as any;

        addLog(`📦 [${i + 1}/${products.length}] Анализ: "${p.name.slice(0, 20)}..."`);

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
      loadHistory();
    }
  };

  // === 2. ВЕКТОРЫ ===
  const startRecommendations = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setCurrentTask("embeddings");
    stopSignal.current = false;
    setLogs([]);
    addLog(`🔮 Генерация векторов (Пакет: ${batchLimit} шт)...`);

    try {
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

        // ВАЖНО: as any решает ошибку сборки
        const p = products[i] as any;

        const fullText = `Товар: ${p.name}. Категория: ${p.category || 'Разное'}. Описание: ${p.description || ''}`;

        addLog(`🧬 [${i + 1}/${products.length}] Вектор для: "${p.name.slice(0, 20)}..."`);

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
      loadHistory();
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
          <Settings size={16} className="text-gray-400" />
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
        <div className="p-6 border rounded-xl bg-white shadow-sm hover:border-[#C5A070] transition-colors">
          <Tags className="mb-2 text-[#C5A070]" size={32} />
          <h3 className="text-lg font-bold">Категоризация</h3>
          <p className="text-sm text-gray-500 mb-6">Создает структуру папок через Groq</p>
          <button
            onClick={startCategorization}
            disabled={isProcessing}
            className="w-full py-3 bg-black text-white rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-gray-800 disabled:opacity-50"
          >
            <Play size={18} /> Запустить анализ
          </button>
        </div>

        <div className="p-6 border rounded-xl bg-white shadow-sm hover:border-[#C5A070] transition-colors">
          <Sparkles className="mb-2 text-blue-500" size={32} />
          <h3 className="text-lg font-bold">Рекомендации</h3>
          <p className="text-sm text-gray-500 mb-6">Создает векторы для похожих товаров</p>
          <button
            onClick={startRecommendations}
            disabled={isProcessing}
            className="w-full py-3 bg-black text-white rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-gray-800 disabled:opacity-50"
          >
            <Play size={18} /> Создать векторы
          </button>
        </div>
      </div>

      {isProcessing && (
        <button
          onClick={handleStop}
          className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold flex justify-center gap-2"
        >
          <Square size={18} fill="currentColor" /> Остановить процесс
        </button>
      )}

      <div className="bg-[#1e1e1e] p-4 rounded-xl h-80 overflow-y-auto font-mono text-xs text-gray-300 border border-gray-800">
        <div className="flex justify-between border-b border-gray-700 pb-2 mb-2">
          <span className="font-bold text-gray-500 flex gap-2 items-center"><Terminal size={14} /> SYSTEM_LOGS</span>
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

      {/* === 3. ИСТОРИЯ ИИ === */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Terminal size={24} className="text-gray-400" />
          История работы ИИ
        </h2>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingHistory ? (
            <div className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">
              Загрузка истории...
            </div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center text-gray-400 font-bold">
              История пока пуста
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 uppercase font-black text-[10px] tracking-widest border-b border-gray-100">
                  <tr>
                    <th className="p-4">Дата / Время</th>
                    <th className="p-4">Тип</th>
                    <th className="p-4">Товар</th>
                    <th className="p-4 w-1/2">Результат ИИ</th>
                    <th className="p-4">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 whitespace-nowrap text-gray-500 font-mono text-xs">
                        {new Date(item.created_at).toLocaleString('ru-RU', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-widest ${item.action_type === 'categorize' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                          {item.action_type === 'categorize' ? 'Категории' : 'Векторы'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-900 truncate max-w-[150px]" title={item.products?.name}>
                        {item.products?.name || `ID: ${item.product_id}`}
                      </td>
                      <td className="p-4 text-gray-600 truncate max-w-[300px]" title={item.ai_result}>
                        {item.ai_result}
                      </td>
                      <td className="p-4">
                        {item.status === 'success' ? (
                          <span className="text-green-600 font-bold">Успех</span>
                        ) : (
                          <span className="text-red-500 font-bold">Ошибка</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}