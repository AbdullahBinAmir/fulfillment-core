import { NestFactory } from '@nestjs/core';
import { OrderAnalyticsServiceModule } from './order-analytics-service/order-analytics-service.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(OrderAnalyticsServiceModule);
  console.log(`[order-analytics-service] started, pid=${process.pid}`);
}

void bootstrap();
