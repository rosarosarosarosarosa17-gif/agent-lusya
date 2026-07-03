import 'dotenv/config';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { recall } from './memory.mjs';
import { notify } from './tg.mjs';

const MAX_AGE_MS = 10 * 60 * 1000;   // «свежесть» пульса — 10 минут
const PROCESS_NAME = 'agent-lusya';  // имя процесса в PM2 (у нас agent-lusya, не moy-agent)

// Одна проверка: жив ли агент по его heartbeat
export async function checkAgent() {
  try {
    // 1) читаем пульс из Supabase (строка agent_memory, key='heartbeat')
    const heartbeat = await recall('heartbeat');
    if (!heartbeat) {
      console.log('⚠️  heartbeat не найден в базе — пропускаю проверку');
      return;
    }

    // 2) насколько пульс старый
    const ageMs = Date.now() - new Date(heartbeat).getTime();
    const ageMin = Math.round(ageMs / 60000);

    if (ageMs > MAX_AGE_MS) {
      // 3) пульс устарел — агент завис, перезапускаем через PM2
      console.log(`⚠️  пульс устарел (${ageMin} мин назад) — перезапускаю ${PROCESS_NAME}`);
      try {
        execSync(`pm2 restart ${PROCESS_NAME}`, { stdio: 'inherit' });
      } catch (err) {
        console.error('Не удалось выполнить pm2 restart:', err.message);
      }

      // 4) уведомляем в Telegram
      try {
        await notify('⚠️ Agent Lusya завис — перезапущен автоматически');
      } catch (err) {
        console.error('Не удалось отправить уведомление в Telegram:', err.message);
      }
    } else {
      // 5) пульс свежий — всё хорошо
      console.log(`пульс в норме (обновлён ${ageMin} мин назад)`);
    }
  } catch (err) {
    // общий предохранитель — надзор сам не должен падать
    console.error('Ошибка надзора:', err.message);
  }
}

// Если файл запущен напрямую (node lib/nadzor.mjs) — выполняем одну проверку.
// Так его удобно вешать на cron: */5 * * * * node /var/www/agent-lusya/lib/nadzor.mjs
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkAgent();
}
