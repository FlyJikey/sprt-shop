// compare_models.js
require('dotenv').config({ path: '.env.local' });
const OpenAI = require("openai");

// 1. Настройка Groq (Llama 3.3 и Mistral)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// 2. Настройка OpenRouter (DeepSeek)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Тестовый товар (сложный пример)
const product = "Мультиметр цифровой DT-830B, прозвонка, измерение hFE транзисторов";
const prompt = `У меня есть товар: "${product}". 
Придумай для него ОДНУ категорию. 
Ответ должен содержать ТОЛЬКО название категории, без лишних слов.`;

async function testLlama() {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Бесплатная мощь от Meta
      messages: [{ role: "user", content: prompt }],
    });
    console.log(`🦙 Llama 3.3 (Groq):  ${completion.choices[0].message.content}`);
  } catch (error) {
    console.error("Llama Error:", error.message);
  }
}

async function testMistral() {
  try {
    // Используем Mixtral через Groq (он там тоже бесплатен и быстрее)
    const completion = await groq.chat.completions.create({
      model: "mixtral-8x7b-32768", 
      messages: [{ role: "user", content: prompt }],
    });
    console.log(`🌪 Mistral (Groq):    ${completion.choices[0].message.content}`);
  } catch (error) {
    console.error("Mistral Error:", error.message);
  }
}

async function testDeepSeek() {
  try {
    // DeepSeek через OpenRouter
    const completion = await openrouter.chat.completions.create({
      model: "deepseek/deepseek-r1:free", // Пробуем бесплатную версию R1
      messages: [{ role: "user", content: prompt }],
    });
    console.log(`🐋 DeepSeek (OR):     ${completion.choices[0].message.content}`);
  } catch (error) {
    console.error("DeepSeek Error:", error.message);
    console.log("💡 Совет: Если DeepSeek на OpenRouter занят, попробуй модель 'mistralai/mistral-7b-instruct:free'");
  }
}

async function runTests() {
  console.log(`📦 Товар: ${product}\n`);
  await testLlama();
  await testMistral();
  await testDeepSeek();
}

runTests();