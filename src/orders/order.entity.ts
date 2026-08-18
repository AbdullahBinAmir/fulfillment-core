import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
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
