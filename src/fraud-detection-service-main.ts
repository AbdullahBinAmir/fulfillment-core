import { NestFactory } from '@nestjs/core';
import { FraudDetectionServiceModule } from './fraud-detection-service/fraud-detection-service.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(FraudDetectionServiceModule);
  console.log(`[fraud-detection] started, pid=${process.pid}`);
}

void bootstrap();
