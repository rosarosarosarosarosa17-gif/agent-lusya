// server.mjs — HTTP-интерфейс агента
import express from 'express';

// Простая версия «мозга» для HTTP (не тянем LLM в каждый запрос)
function think(text) {
  if (text.includes('привет')) return 'Привет!';
  return 'Принял задачу: ' + text;
}

// Поднимает HTTP-сервер агента. Вызывается из init().
export function startServer() {
  const app = express();
  app.use(express.json()); // парсим JSON-тело запросов

  // Проверка «жив ли агент»
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: Date.now() });
  });

  // Приём задачи по HTTP: {"text":"..."} -> {"result": "..."}
  app.post('/task', (req, res) => {
    const text = req.body?.text ?? '';
    const result = think(text);
    res.json({ result });
  });

  const port = process.env.PORT ?? 3000;
  const server = app.listen(port, () => console.log(`[server] слушаю порт ${port}`));
  // Если порт занят — не роняем агента, а логируем (на VPS рядом другие процессы)
  server.on('error', (err) => console.error('[server] не удалось поднять HTTP-сервер:', err.message));
}
