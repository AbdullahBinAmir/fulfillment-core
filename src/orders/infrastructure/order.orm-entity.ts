import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { OrderItem } from '../domain/order.entity';
import type { Region } from '../domain/order.entity';

@Entity('order')
export class OrderOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  customerId!: string;

  @Column()
  customerTier!: string;

  // `default` exists for the migration, not for app code: it backfills the
  // pre-M9 rows this NOT NULL column would otherwise break against. New
  // orders always pass region explicitly (Order.create requires it).
  @Column({ type: 'enum', enum: ['eu', 'us'], default: 'us' })
  region!: Region;

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
