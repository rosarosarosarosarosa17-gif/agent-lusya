import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { ask, fetchPageText, askAboutImage } from './llm.mjs';

// Node native fetch не читает HTTPS_PROXY сам. Если прокси задан
// (локально через VPN-клиент) — направляем весь fetch через него.
// undici грузим ЛЕНИВО и только при наличии прокси: на сервере прокси нет,
// поэтому пакет там не загружается (его свежая версия требует новый Node).
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxyUrl) {
  const { setGlobalDispatcher, ProxyAgent } = await import('undici');
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  console.log('🌐 Трафик через прокси:', proxyUrl);
}

// Запускает Telegram-бота в режиме polling (сам опрашивает Telegram о новых сообщениях).
// onMessage(text, chatId) — «мозг»: получает текст сообщения и id чата и возвращает ответ агента.
export function startTelegram(onMessage) {
  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

  // Текстовые сообщения и ссылки (фото/документы — в отдельных обработчиках ниже)
  bot.on('message', async (msg) => {
    if (!msg.text) return; // не текст — обработают bot.on('photo') / bot.on('document')
    const chatId = msg.chat.id;
    const text = msg.text;

    try {
      let reply;
      if (text.startsWith('http://') || text.startsWith('https://')) {
        // Ссылка: скачиваем страницу и просим пересказать
        const pageText = await fetchPageText(text);
        reply = await ask('Перескажи главное из этой страницы: ' + pageText);
      } else {
        // Обычный текст — отдаём мозгу агента
        reply = await onMessage(text, chatId);
      }
      await bot.sendMessage(chatId, reply);
    } catch (err) {
      console.error('Ошибка обработки сообщения Telegram:', err);
      await bot.sendMessage(chatId, 'Упс, что-то пошло не так 🙈');
    }
  });

  // Фото — «зрение» агента
  bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    try {
      const fileId = msg.photo.at(-1).file_id;           // последний размер = лучшее качество
      const fileLink = await bot.getFileLink(fileId);    // готовая ссылка на скачивание
      const imgRes = await fetch(fileLink);
      const base64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64');
      const prompt = msg.caption || 'Опиши что на этом изображении и извлеки любые текстовые данные';
      const reply = await askAboutImage(base64, prompt);
      await bot.sendMessage(chatId, reply);
    } catch (err) {
      console.error('Ошибка обработки фото:', err);
      await bot.sendMessage(chatId, 'Не смог разобрать картинку 🙈');
    }
  });

  // Документы — .txt (как текст) и .pdf (через pdf-parse)
  bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    try {
      const doc = msg.document;
      const fileLink = await bot.getFileLink(doc.file_id);
      const buffer = Buffer.from(await (await fetch(fileLink)).arrayBuffer());
      const name = (doc.file_name || '').toLowerCase();

      let content = '';
      if (name.endsWith('.pdf')) {
        const { PDFParse } = await import('pdf-parse'); // грузим лениво, только для PDF
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        content = result.text;
      } else {
        content = buffer.toString('utf-8'); // .txt и прочий текст
      }

      const excerpt = content.slice(0, 5000);
      // Если есть подпись к файлу — используем её как вопрос, иначе просим пересказ
      const question = msg.caption
        ? msg.caption + '\n\n' + excerpt
        : 'Перескажи суть этого документа: ' + excerpt;
      const reply = await ask(question);
      await bot.sendMessage(chatId, reply);
    } catch (err) {
      console.error('Ошибка обработки документа:', err);
      await bot.sendMessage(chatId, 'Не смог прочитать документ 🙈');
    }
  });

  console.log('🤖 Telegram-бот запущен (polling)');
  return bot;
}

// Отправить разовое сообщение в Telegram (без polling — не конфликтует с ботом выше).
// Кому слать — берём из TELEGRAM_CHAT_ID. Используется для уведомлений (надзор и т.п.).
export async function notify(text) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!process.env.TELEGRAM_TOKEN || !chatId) {
    console.error('notify: нет TELEGRAM_TOKEN или TELEGRAM_CHAT_ID — сообщение не отправлено');
    return;
  }
  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: false });
  await bot.sendMessage(chatId, text);
}
