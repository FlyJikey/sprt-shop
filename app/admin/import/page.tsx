'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { clearDatabase, upsertBatch, createCategoryIfNeeded } from './actions';
import { Loader2, CheckCircle, Upload, Plus, Trash2, FileWarning, AlertOctagon } from 'lucide-react';

const COL_NAME = 0;
const COL_STOCK = 5;
const COL_PRICE = 7;
const DEFAULT_CATEGORY = 'Каталог';

// Стоп-слова (строки с этими словами пропускаются молча)
const STOP_WORDS = [
  'итого', 'всего', 'сумма', 'оценка склада', 
  'номенклатура', 'ед. изм.', 'вид цены', 'параметры'
];

type LogError = {
  line: number;
  name: string;
  reason: string;
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'full' | 'append'>('full');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogError[]>([]);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'uploading' | 'done'>('idle');
  const [stats, setStats] = useState({ total: 0, valid: 0, skipped: 0 });
  const [showConfirmation, setShowConfirmation] = useState(false);

  const transliterate = (word: string) => {
    const converter: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z',
      'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
      'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ь': '', 'ы': 'y', 'ъ': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    return word.toLowerCase().split('').map(char => converter[char] || char).join('')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const parseRusNumber = (str: any) => {
    if (!str || typeof str !== 'string') return 0;
    const clean = str.replace(/\s/g, '').replace(/\u00A0/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
    setStatus('idle');
    setLogs([]);
    setProgress(0);
    setStats({ total: 0, valid: 0, skipped: 0 });
  };

  const handleStartClick = () => {
    if (!file) return;
    if (mode === 'full') {
      setShowConfirmation(true);
    } else {
      startProcess();
    }
  };

  const startProcess = () => {
    if (!file) return;
    setShowConfirmation(false);
    setLoading(true);
    setStatus('analyzing');
    setLogs([]);

    Papa.parse(file, {
      delimiter: ";",
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as string[][];
        const validProducts = [];
        const seenNames = new Map<string, number>();
        const errors: LogError[] = [];

        let startIndex = 9; 
        for(let i=0; i < Math.min(20, rows.length); i++) {
            if (rows[i][0]?.includes('Номенклатура')) {
                startIndex = i + 1;
                break;
            }
        }

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          if (row.length < 8) continue;

          let name = row[COL_NAME]?.trim();
          if (name) name = name.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
          
          const price = parseRusNumber(row[COL_PRICE]);
          const stock = parseRusNumber(row[COL_STOCK]);

          // --- 1. Фильтр мусора ---
          if (!name) continue;
          if (STOP_WORDS.some(word => name!.toLowerCase().includes(word))) continue;

          // --- 2. ГЛАВНАЯ ПРОВЕРКА ---
          
          // Если цена РАВНА 0 (или не существует) -> Пропускаем
          if (price === 0) {
            errors.push({ 
                line: i + 1, 
                name: name, 
                reason: `❌ Цена равна 0` 
            });
            continue;
          }

          if (seenNames.has(name)) {
            errors.push({ 
              line: i + 1, 
              name: name, 
              reason: `Дубликат (уже был на строке ${seenNames.get(name)})` 
            });
            continue;
          }

          seenNames.set(name, i + 1);

          validProducts.push({
            name,
            slug: transliterate(name) + '-' + Math.floor(Math.random() * 10000),
            price: Math.abs(price), // <--- ИЗМЕНЕНИЕ: Делаем цену всегда положительной
            stock: stock,           // Остаток оставляем как есть (даже минус)
            unit: 'шт',
            category: DEFAULT_CATEGORY,
            image_url: null,
            description: ''
          });
        }

        setLogs(errors);
        setStats({ 
            total: rows.length, 
            valid: validProducts.length, 
            skipped: errors.length 
        });

        if (validProducts.length === 0 && mode !== 'full') {
            setLoading(false);
            setStatus('done'); 
            return;
        }

        await uploadToDatabase(validProducts);
      }
    });
  };

  const uploadToDatabase = async (products: any[]) => {
    setStatus('uploading');
    
    try {
      await createCategoryIfNeeded(DEFAULT_CATEGORY, transliterate(DEFAULT_CATEGORY));

      if (mode === 'full') {
        await clearDatabase();
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        const { error } = await upsertBatch(batch);
        
        if (error) {
            setLogs(prev => [...prev, { line: 0, name: 'BATCH ERROR', reason: error }]);
        }
        setProgress(Math.round(((i + batch.length) / products.length) * 100));
      }

      setStatus('done');
    } catch (e: any) {
      setLogs(prev => [...prev, { line: 0, name: 'SYSTEM ERROR', reason: e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 relative">
      <h1 className="text-3xl font-bold mb-8">Импорт товаров</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        
        {/* Файл */}
        <div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
               <Upload className="text-gray-400" size={32} />
               <span className="text-blue-600 font-bold hover:underline">
                 {file ? file.name : 'Нажмите для выбора файла (.csv)'}
               </span>
            </label>
          </div>
        </div>

        {/* Режимы */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`
            flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
            ${mode === 'full' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}
          `}>
            <input type="radio" name="mode" checked={mode === 'full'} onChange={() => setMode('full')} className="hidden" />
            <div className={`p-2 rounded-full ${mode === 'full' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              <Trash2 size={20} />
            </div>
            <div>
              <div className="font-bold text-gray-900">Полная замена</div>
              <div className="text-xs text-gray-500">Удаляет всё и загружает заново.</div>
            </div>
          </label>

          <label className={`
            flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
            ${mode === 'append' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
          `}>
            <input type="radio" name="mode" checked={mode === 'append'} onChange={() => setMode('append')} className="hidden" />
            <div className={`p-2 rounded-full ${mode === 'append' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              <Plus size={20} />
            </div>
            <div>
              <div className="font-bold text-gray-900">Добавление / Обновление</div>
              <div className="text-xs text-gray-500">Добавляет новые, обновляет старые.</div>
            </div>
          </label>
        </div>

        {/* Кнопка запуска */}
        <button
          onClick={handleStartClick}
          disabled={!file || loading}
          className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2
            ${!file || loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg'}
          `}
        >
          {loading ? <Loader2 className="animate-spin" /> : status === 'done' ? <CheckCircle /> : 'Начать импорт'}
        </button>

        {loading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            <p className="text-center text-xs text-gray-500 mt-2">Обработка...</p>
          </div>
        )}
      </div>

      {status === 'done' && (
        <div className="mt-8 bg-green-50 border border-green-100 rounded-xl p-6 text-center">
            <CheckCircle className="mx-auto text-green-500 mb-2" size={48} />
            <h2 className="text-2xl font-bold text-green-700">Процесс завершен!</h2>
            <div className="flex justify-center gap-8 mt-4">
                <div>
                    <div className="text-3xl font-black text-green-600">{stats.valid}</div>
                    <div className="text-sm text-green-800">Загружено</div>
                </div>
                {stats.skipped > 0 && (
                    <div>
                        <div className="text-3xl font-black text-red-500">{stats.skipped}</div>
                        <div className="text-sm text-red-800">Пропущено (Цена = 0)</div>
                    </div>
                )}
            </div>
            {mode === 'full' && stats.valid === 0 && (
               <p className="mt-4 text-red-600 font-bold">База данных была очищена.</p>
            )}
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-8 bg-white border border-red-100 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4">
            <FileWarning />
            Отчет о пропущенных товарах ({logs.length})
          </h3>
          <div className="max-h-[300px] overflow-y-auto bg-gray-50 rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700 sticky top-0">
                <tr><th className="p-3">Строка</th><th className="p-3">Товар</th><th className="p-3">Причина пропуска</th></tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={idx} className="border-t border-gray-200 hover:bg-red-50">
                    <td className="p-3 font-mono text-gray-500">{log.line}</td>
                    <td className="p-3 font-medium">{log.name}</td>
                    <td className="p-3 text-red-600 font-bold">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модалка */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-red-100">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
                <AlertOctagon size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-900">Внимание!</h3>
              <p className="text-gray-600">
                Вы выбрали режим <span className="font-bold text-red-600">Полная замена</span>. 
                <br/><br/>
                Все текущие товары будут удалены.
              </p>
              
              <div className="grid grid-cols-2 gap-3 w-full mt-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={startProcess}
                  className="px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                >
                  Удалить и загрузить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}