import 'dotenv/config';
import config from './config.mjs';
import { remember, recall } from './lib/memory.mjs';
import { ask } from './lib/llm.mjs';

// Читаем настройки из окружения (с значениями по умолчанию)
const AGENT_NAME = process.env.AGENT_NAME || 'Agent Lusya';
const TICK_MS = Number(process.env.TICK_MS) || 10000;

// Ссылка на интервал — нужна, чтобы остановить агента при выключении
let timer = null;

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

  // Вспоминаем, когда агент стартовал в прошлый раз
  const lastStart = await recall('last_start');
  if (lastStart) {
    console.log('Прошлый запуск был:', lastStart);
  } else {
    console.log('Первый запуск');
  }

  // Запоминаем текущее время как момент старта
  await remember('last_start', new Date().toISOString());
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
  if (!t) return;

  // Пример работы с памятью: задача вида "запомни <ключ> = <значение>"
  if (t.toLowerCase().includes('запомни')) {
    const payload = t.replace(/.*запомни/i, '').trim(); // всё после слова "запомни"
    const hasSep = payload.includes('=');
    const key = hasSep ? payload.split('=')[0].trim() : 'note';
    const value = hasSep ? payload.split('=').slice(1).join('=').trim() : payload;
    await remember(key, value);
    act(t, `Запомнил: ${key} = ${value}`);
    return;
  }

  act(t, await think(t));
}

// Основной цикл жизни агента
async function main() {
  await init();

  // Каждый TICK_MS запускаем один тик; ошибка одного тика не роняет агента
  timer = setInterval(() => {
    tick().catch((err) => console.error('Ошибка в тике:', err));
  }, TICK_MS);
}

// Аккуратная остановка по сигналу
function shutdown(signal) {
  if (timer) clearInterval(timer);
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
