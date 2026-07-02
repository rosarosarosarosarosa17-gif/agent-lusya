import { ask } from './lib/llm.mjs';

// Простой тест мозга агента: задаём промпт и печатаем ответ модели
const answer = await ask('Придумай 3 идеи для названия пекарни в японском стиле');
console.log(answer);
