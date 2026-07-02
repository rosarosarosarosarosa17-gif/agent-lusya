import 'dotenv/config';
import OpenAI from 'openai';

// Модель, которой «думает» агент (идентификатор в формате Polza)
const MODEL = 'anthropic/claude-sonnet-4.5';

// Клиент OpenAI SDK, но направленный на Polza AI (OpenAI-совместимый API)
const client = new OpenAI({
  baseURL: 'https://api.polza.ai/api/v1',
  apiKey: process.env.POLZA_API_KEY,
});

// Отправляет текстовый запрос в модель и возвращает текст ответа
export async function ask(prompt) {
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
  });
  // Достаём текст из первого варианта ответа
  return completion.choices[0].message.content;
}
