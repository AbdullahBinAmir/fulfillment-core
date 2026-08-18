import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  productId!: string;

  @Column()
  quantity!: number;
}
