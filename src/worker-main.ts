import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(WorkerModule);

  console.log(`[worker] started, pid=${process.pid}`);
  setInterval(() => {
    const { rss, heapUsed, external, arrayBuffers } = process.memoryUsage();
    const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
    console.log(
      `[worker] rss=${mb(rss)}MB heapUsed=${mb(heapUsed)}MB external=${mb(external)}MB arrayBuffers=${mb(arrayBuffers)}MB`,
    );
  }, 500);
}

void bootstrap();
