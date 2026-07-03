import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// В Node < 22 нет глобального WebSocket, а supabase-js требует его при createClient.
// Подкладываем реализацию из пакета ws (на Node 22+ используется нативный).
if (!globalThis.WebSocket) {
  globalThis.WebSocket = ws;
}

// Таблица памяти в Supabase
const TABLE = 'agent_memory';

// SUPABASE_URL может быть как базовым (https://xxx.supabase.co),
// так и полным путём к REST — берём только origin (протокол + хост)
const rawUrl = process.env.SUPABASE_URL || '';
const SUPABASE_URL = rawUrl ? new URL(rawUrl).origin : '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Без ключей работать не можем — падаем сразу с понятной ошибкой
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Нет SUPABASE_URL или SUPABASE_KEY в .env');
}

// Один клиент на весь модуль (экспортируем, чтобы реюзать в других модулях)
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Сохранить запись. Если строка с таким key уже есть — обновляем её,
// иначе вставляем новую. Так дубли не плодятся и не нужен UNIQUE-индекс.
export async function remember(key, value) {
  // Есть ли уже запись с таким ключом?
  const { data: existing, error: selError } = await supabase
    .from(TABLE)
    .select('id')
    .eq('key', key)
    .maybeSingle();
  if (selError) throw selError;

  if (existing) {
    // Обновляем значение у существующей строки
    const { error } = await supabase
      .from(TABLE)
      .update({ value })
      .eq('key', key);
    if (error) throw error;
  } else {
    // Вставляем новую строку
    const { error } = await supabase
      .from(TABLE)
      .insert({ key, value });
    if (error) throw error;
  }
  return true;
}

// Вернуть value по key или null, если записи нет
export async function recall(key) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data ? data.value : null;
}
