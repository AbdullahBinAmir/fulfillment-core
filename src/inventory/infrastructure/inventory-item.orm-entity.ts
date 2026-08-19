import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('inventory_item')
export class InventoryItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  productId!: string;

  @Column()
  quantity!: number;
}
