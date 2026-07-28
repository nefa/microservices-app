import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// TypeORM's equivalent of TaskApi's TaskEntity/CategoryEntity: a plain
// class with decorators instead of EF Core's convention-based mapping.
// @Entity('user') plays the same role as AppDbContext's
// modelBuilder.Entity<...>().ToTable("...") - it names the actual
// Postgres table (singular, matching the convention we used there).
@Entity('user')
export class User {
  // @PrimaryGeneratedColumn is TypeORM's version of EF Core treating a
  // property named "Id" as the primary key by convention - here it's
  // explicit rather than inferred, but the effect is the same: an
  // auto-incrementing integer primary key.
  @PrimaryGeneratedColumn()
  id: number;

  // unique: true is the TypeORM equivalent of AppDbContext's
  // modelBuilder.Entity<UserEntity>().HasIndex(u => u.Username).IsUnique()
  // - it creates a real unique index in Postgres, not just an app-level
  // check, closing the same race-condition gap discussed for TaskApi's
  // UserEntity.
  @Column({ unique: true })
  email: string;

  // Same rule as TaskApi: NEVER store a plaintext password. This column
  // holds a bcrypt hash once we build the register/login endpoints.
  @Column()
  passwordHash: string;

  // TypeORM's equivalent of "CreatedAt = DateTime.UtcNow" - automatically
  // set to the current timestamp when a row is first inserted.
  @CreateDateColumn()
  createdAt: Date;
}
