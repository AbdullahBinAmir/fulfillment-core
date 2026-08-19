import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { OrderItem } from '../domain/order.entity';

@Entity('order')
export class OrderOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  customerId!: string;

  @Column()
  customerTier!: string;

  @Column('jsonb')
  items!: OrderItem[];

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  total!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
