import 'dotenv/config';
import config from './config.mjs';
import { remember, recall } from './lib/memory.mjs';
import { ask } from './lib/llm.mjs';
import { startTelegram } from './lib/tg.mjs';
import { checkAgent } from './lib/nadzor.mjs';
import { startServer } from './server.mjs';

// Читаем настройки из окружения (с значениями по умолчанию)
const AGENT_NAME = process.env.AGENT_NAME || 'Agent Lusya';
const TICK_MS = Number(process.env.TICK_MS) || 10000;
const WATCH_MS = 5 * 60 * 1000; // как часто надзор проверяет пульс — 5 минут

// Ссылки на интервалы — нужны, чтобы остановить их при выключении
let timer = null;
let watchdog = null;

// Простая очередь задач в памяти (пара примеров для теста).
// Раздел 3: сюда задачи будут приходить из Telegram / других источников
const queue = [
  '/помощь',
  '/статус',
  'просто текст',
  'запомни любимый_цвет = синий',
];

// Запуск: выполняется один раз при старте
async function init() {
  console.log(`✅ Агент запущен: ${AGENT_NAME}`);
  console.log('Запущен агент:', config.name);

  // Поднимаем HTTP-сервер агента (/health, /task)
  startServer();

  // Вспоминаем, когда агент стартовал в прошлый раз
  const lastStart = await recall('last_start');
  if (lastStart) {
    console.log('Прошлый запуск был:', lastStart);
  } else {
    console.log('Первый запуск');
  }

  // Запоминаем текущее время как момент старта
  await remember('last_start', new Date().toISOString());

  // Запускаем Telegram-бота вместе с агентом.
  // Сообщения из чата отдаём мозгу (think) и отвечаем его ответом.
  if (process.env.TELEGRAM_TOKEN) {
    startTelegram(async (text) => await think(text));
  } else {
    console.log('⚠️  TELEGRAM_TOKEN не задан — Telegram-бот не запущен');
  }
}

// Шаг 1 — СЛУШАЕМ: берём следующую задачу из очереди (или undefined, если пусто)
function listen() {
  return queue.shift();
}

// Шаг 2 — ДУМАЕМ: спрашиваем у LLM (мозг агента)
async function think(task) {
  return await ask(task);
}

// Шаг 3 — ДЕЙСТВУЕМ: выводим результат
function act(task, decision) {
  // Раздел 3: здесь ответ будет уходить в Telegram, а не в консоль
  console.log(`[${new Date().toISOString()}] ${decision}`);
}

// Одна итерация работы агента: слушаем → думаем → действуем
async function tick() {
  const t = listen();
  if (t) {
    // Пример работы с памятью: задача вида "запомни <ключ> = <значение>"
    if (t.toLowerCase().includes('запомни')) {
      const payload = t.replace(/.*запомни/i, '').trim(); // всё после слова "запомни"
      const hasSep = payload.includes('=');
      const key = hasSep ? payload.split('=')[0].trim() : 'note';
      const value = hasSep ? payload.split('=').slice(1).join('=').trim() : payload;
      await remember(key, value);
      act(t, `Запомнил: ${key} = ${value}`);
    } else {
      act(t, await think(t));
    }
  }

  // Heartbeat: отмечаем в Supabase, что агент жив (каждый тик).
  // Ошибка записи не должна ронять агента — просто логируем.
  try {
    await remember('heartbeat', new Date().toISOString());
  } catch (err) {
    console.error('Ошибка записи heartbeat:', err);
  }
}

// Основной цикл жизни агента
async function main() {
  await init();

  // Каждый TICK_MS запускаем один тик; ошибка одного тика не роняет агента
  timer = setInterval(() => {
    tick().catch((err) => console.error('Ошибка в тике:', err));
  }, TICK_MS);

  // Каждые WATCH_MS надзор проверяет пульс и при необходимости перезапускает агента
  watchdog = setInterval(() => {
    checkAgent().catch((err) => console.error('Ошибка надзора:', err));
  }, WATCH_MS);
}

// Аккуратная остановка по сигналу
function shutdown(signal) {
  if (timer) clearInterval(timer);
  if (watchdog) clearInterval(watchdog);
  console.log(`${signal} — агент останавливается...`);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Старт агента; фатальная ошибка — выходим с кодом 1
main().catch((err) => {
  console.error('Фатальная ошибка:', err);
  process.exit(1);
});
