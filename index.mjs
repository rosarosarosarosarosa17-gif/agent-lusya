import 'dotenv/config';

// Читаем настройки из окружения (с значениями по умолчанию)
const AGENT_NAME = process.env.AGENT_NAME || 'Agent Lusya';
const TICK_MS = Number(process.env.TICK_MS) || 10000;

// Ссылка на интервал — нужна, чтобы остановить агента при выключении
let timer = null;

// Простая очередь задач в памяти (пара примеров для теста).
// Раздел 3: сюда задачи будут приходить из Telegram / других источников
const queue = [
  { text: 'привет, агент' },
  { text: 'собрать отчёт за день' },
];

// Запуск: выполняется один раз при старте
async function init() {
  console.log(`✅ Агент запущен: ${AGENT_NAME}`);
  // Раздел 3: здесь подключим память, мозг (LLM) и Telegram
}

// Шаг 1 — СЛУШАЕМ: берём следующую задачу из очереди (или undefined, если пусто)
function listen() {
  return queue.shift();
}

// Шаг 2 — ДУМАЕМ: решаем, что ответить на задачу
function think(task) {
  // Раздел 3: здесь вместо простого правила будет мозг (LLM)
  if (task.text.toLowerCase().includes('привет')) {
    return 'Привет!';
  }
  return `Принял задачу: ${task.text}`;
}

// Шаг 3 — ДЕЙСТВУЕМ: выводим результат
function act(task, decision) {
  // Раздел 3: здесь ответ будет уходить в Telegram, а не в консоль
  console.log(`[${new Date().toISOString()}] ${decision}`);
}

// Одна итерация работы агента: слушаем → думаем → действуем
async function tick() {
  const t = listen();
  if (t) act(t, think(t));
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
