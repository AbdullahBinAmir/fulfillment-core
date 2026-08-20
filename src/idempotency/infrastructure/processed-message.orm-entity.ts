import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('processed_message')
@Unique(['eventId', 'handlerName'])
export class ProcessedMessageOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  eventId!: string;

  @Column()
  handlerName!: string;

  @CreateDateColumn()
  processedAt!: Date;
}
