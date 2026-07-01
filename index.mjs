import 'dotenv/config';

// Читаем настройки из окружения (с значениями по умолчанию)
const AGENT_NAME = process.env.AGENT_NAME || 'Agent Lusya';
const TICK_MS = Number(process.env.TICK_MS) || 10000;

// Ссылка на интервал — нужна, чтобы остановить агента при выключении
let timer = null;

// Запуск: выполняется один раз при старте
async function init() {
  console.log(`✅ Агент запущен: ${AGENT_NAME}`);
  // Раздел 3: здесь подключим память, мозг (LLM) и Telegram
}

// Одна итерация работы агента
async function tick() {
  console.log(`[${new Date().toISOString()}] тик — тут будет работа агента`);
  // Раздел 3: здесь агент думает, помнит и отвечает
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
