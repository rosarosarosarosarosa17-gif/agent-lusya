import { supabase } from './memory.mjs';

// Таблица усвоенных уроков
const TABLE = 'agent_lessons';

// Записать урок: ситуация + вывод, который агент из неё сделал
export async function recordLesson(situation, lesson) {
  const { error } = await supabase
    .from(TABLE)
    .insert({ situation, lesson });
  if (error) throw error;
  return true;
}

// Загрузить все уроки как массив строк-подсказок, по порядку создания
export async function loadLessons() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('situation, lesson')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(
    (row) => `помни: ${row.lesson} (ситуация: ${row.situation})`
  );
}
