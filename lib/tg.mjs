import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { setGlobalDispatcher, ProxyAgent } from 'undici';

// Node native fetch не читает HTTPS_PROXY сам. Если прокси задан
// (локально через VPN-клиент) — направляем весь fetch через него,
// иначе (например, на сервере) ходим напрямую.
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  console.log('🌐 Трафик через прокси:', proxyUrl);
}

// Запускает Telegram-бота в режиме polling (сам опрашивает Telegram о новых сообщениях).
// onMessage(text, chatId) — «мозг»: получает текст сообщения и id чата и возвращает ответ агента.
export function startTelegram(onMessage) {
  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

  // Реагируем на каждое входящее сообщение
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    try {
      // Отдаём сообщение мозгу агента и получаем ответ
      const answer = await onMessage(text, chatId);
      // Отправляем ответ в тот же чат
      await bot.sendMessage(chatId, answer);
    } catch (err) {
      // Один сбой не должен ронять бота — логируем и вежливо отвечаем
      console.error('Ошибка обработки сообщения Telegram:', err);
      await bot.sendMessage(chatId, 'Упс, что-то пошло не так 🙈');
    }
  });

  console.log('🤖 Telegram-бот запущен (polling)');
  return bot;
}
