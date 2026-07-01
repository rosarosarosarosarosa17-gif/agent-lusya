// Роутер команд: разбирает входящее сообщение и выбирает обработчик.
// Раздел 3: заглушки заменим на реальную логику (память, LLM, Telegram)

// Обработчик команды /помощь
function handleHelp() {
  return 'Доступные команды: /помощь, /статус';
}

// Обработчик команды /статус
function handleStatus() {
  return 'Агент работает нормально ✅';
}

// Обработчик обычного текста (не команда)
function handleText(msg) {
  return 'Получил сообщение: ' + msg;
}

// Главная функция: по тексту сообщения выбирает нужный обработчик
export function route(message) {
  if (message.startsWith('/помощь')) {
    return handleHelp();
  }
  if (message.startsWith('/статус')) {
    return handleStatus();
  }
  return handleText(message);
}
