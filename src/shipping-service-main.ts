import { NestFactory } from '@nestjs/core';
import { ShippingServiceModule } from './shipping-service/shipping-service.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(ShippingServiceModule);
  console.log(`[shipping-service] started, pid=${process.pid}`);
}

void bootstrap();
