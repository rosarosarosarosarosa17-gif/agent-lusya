import { supabase } from './memory.mjs';

// Таблица усвоенных уроков
const TABLE = 'agent_lessons';

// Записать урок: ситуация + вывод, который агент из неё сделал.
// Ошибку не бросаем — логируем, чтобы сбой Supabase не ронял вызывающий код.
export async function recordLesson(situation, lesson) {
  const { error } = await supabase
    .from(TABLE)
    .insert({ situation, lesson });
  if (error) console.error('[lessons] ошибка записи:', error.message);
}

// Загрузить все уроки как массив строк-подсказок, по порядку создания.
// При ошибке возвращаем пустой массив — агент просто ответит без уроков.
export async function loadLessons() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('situation, lesson')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[lessons] ошибка загрузки:', error.message);
    return [];
  }
  return (data || []).map(
    (row) => `помни: ${row.lesson} (ситуация: ${row.situation})`
  );
}
