'use server';

// Этот файл ИЗОЛИРОВАН от основного actions.ts,
// чтобы тяжёлые зависимости (@xenova/transformers, onnxruntime) НЕ попадали
// в серверные функции обычных страниц (главная, каталог, товар).

let extractor: any = null;

export async function generateSearchEmbedding(text: string) {
    try {
        const { pipeline, env } = await import('@xenova/transformers');
        // @ts-ignore
        env.token = null;
        env.allowLocalModels = false;
        env.allowRemoteModels = true;
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.wasm.simd = false;
        env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';
        env.cacheDir = './.cache';

        if (!extractor) {
            extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                // @ts-ignore
                auth_token: null
            });
        }

        const output = await extractor(text, {
            pooling: 'mean',
            normalize: true
        });

        return { success: true, vector: Array.from(output.data) };
    } catch (error: any) {
        console.error("Ошибка при генерации вектора запроса:", error);
        return { success: false, error: error.message };
    }
}
