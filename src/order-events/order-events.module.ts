import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { PublishOrderPlacedHandler } from './publish-order-placed.handler';
import { rabbitmqOptions } from './rabbitmq.options';

@Module({
  imports: [
    CqrsModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: rabbitmqOptions,
    }),
  ],
  providers: [PublishOrderPlacedHandler],
})
export class OrderEventsModule {}
