import { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ORDERS_EXCHANGE } from './order-events.constants';

// RabbitMQModule isn't @Global — every module that injects AmqpConnection
// re-registers forRootAsync with this SAME config. That's not wasteful:
// the library's connection manager is a static singleton underneath, so
// this shares one real AMQP connection rather than opening several.
export function rabbitmqOptions(config: ConfigService): RabbitMQConfig {
  return {
    uri: config.get<string>('RABBITMQ_URL') as string,
    exchanges: [{ name: ORDERS_EXCHANGE, type: 'topic' }],
    connectionInitOptions: { wait: true },
  };
}
