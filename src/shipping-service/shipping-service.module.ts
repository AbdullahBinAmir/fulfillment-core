import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { rabbitmqOptions } from '../order-events/rabbitmq.options';
import { ShippingConsumer } from './shipping.consumer';

// Deliberately its own connection to RabbitMQ — this represents a separate
// team's deployable, not a module folded into the main app.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: rabbitmqOptions,
    }),
  ],
  providers: [ShippingConsumer],
})
export class ShippingServiceModule {}
