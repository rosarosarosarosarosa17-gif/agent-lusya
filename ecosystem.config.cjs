module.exports = {
  apps: [
    {
      name: 'agent-lusya',         // имя процесса в PM2 (как репозиторий и путь на сервере)
      script: 'index.mjs',         // какой файл запускать
      interpreter: 'node',         // чем запускать — интерпретатор Node.js
      autorestart: true,           // перезапускать автоматически при падении
      max_memory_restart: '200M',  // перезапуск, если процесс съест больше 200 МБ
      watch: false,                // не следить за файлами (деплой идёт через git)
      env: {
        NODE_ENV: 'production',    // режим окружения — продакшн
      },
    },
  ],
};
