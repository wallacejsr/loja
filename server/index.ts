import 'dotenv/config';
import { createStoreApiApp } from './app';

async function main() {
  const { app, config } = await createStoreApiApp();
  const server = app.listen(config.port, config.host, () => {
    console.log(`Store API running at ${config.appBaseUrl} (bind ${config.host}:${config.port})`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Closing Store API...`);
    server.close((error) => {
      if (error) {
        console.error('Failed to close HTTP server cleanly', error);
        process.exitCode = 1;
        return;
      }

      console.log('Store API stopped.');
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Failed to start store API', error);
  process.exitCode = 1;
});
