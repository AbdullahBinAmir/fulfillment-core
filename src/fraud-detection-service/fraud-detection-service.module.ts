import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { rabbitmqOptions } from '../order-events/rabbitmq.options';
import { FraudDetectionConsumer } from './fraud-detection.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: rabbitmqOptions,
    }),
  ],
  providers: [FraudDetectionConsumer],
})
export class FraudDetectionServiceModule {}
