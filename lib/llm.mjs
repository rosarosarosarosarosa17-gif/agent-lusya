import 'dotenv/config';
import OpenAI from 'openai';
import { loadLessons } from './lessons.mjs';

// Модель, которой «думает» агент (идентификатор в формате Polza)
const MODEL = 'anthropic/claude-sonnet-4.5';

// Базовый системный промпт — роль и характер агента
const BASE_SYSTEM_PROMPT =
  'Ты — Agent Lusya, дружелюбный ассистент. Отвечай кратко и по делу на русском языке.';

// Клиент OpenAI SDK, но направленный на Polza AI (OpenAI-совместимый API)
const client = new OpenAI({
  baseURL: 'https://api.polza.ai/api/v1',
  apiKey: process.env.POLZA_API_KEY,
});

// Отправляет текстовый запрос в модель и возвращает текст ответа
export async function ask(prompt) {
  // Подгружаем усвоенные уроки и добавляем их в начало системного промпта.
  // Ошибка загрузки уроков не должна ронять ответ — просто отвечаем без них.
  let systemPrompt = BASE_SYSTEM_PROMPT;
  try {
    const rules = await loadLessons();
    if (rules.length > 0) {
      systemPrompt = rules.join('\n') + '\n\n' + systemPrompt;
    }
  } catch (err) {
    console.error('Не удалось загрузить уроки:', err.message);
  }

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  });
  // Достаём текст из первого варианта ответа
  return completion.choices[0].message.content;
}

// Скачивает страницу по URL и возвращает первые 4000 символов текста (без HTML-тегов)
export async function fetchPageText(url) {
  const res = await fetch(url);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ') // выкидываем скрипты целиком
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')   // и стили
    .replace(/<[^>]+>/g, ' ')                     // убираем остальные теги
    .replace(/\s+/g, ' ')                         // схлопываем пробелы
    .trim();
  return text.slice(0, 4000);
}

// «Зрение»: отправляет картинку (base64) + вопрос и возвращает текстовый ответ модели
export async function askAboutImage(base64, prompt) {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });
  return completion.choices[0].message.content;
}
