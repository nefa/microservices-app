import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Who can review/approve a pending_document submission in
// chatbot-rag-python (see that service's README - "no endpoint a
// reviewer UI could call to approve a submission" is the gap this role
// exists to eventually close). Not enforced anywhere yet on its own -
// this column is the identity/authorization foundation the approval
// endpoints and reviewer UI will check against once they exist.
export type UserRole = 'employee' | 'manager';

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

  // Plain varchar, not a Postgres enum type - same reasoning as
  // chatbot-rag-python's PendingDocument.status: cheap to extend later
  // (e.g. an 'admin' role) without a migration, and this is a
  // single-service-owned column, not a cross-language contract that
  // needs stricter enforcement. Existing rows get 'employee' via this
  // default the moment synchronize:true adds the column - see seed.ts
  // for how bob's row actually becomes 'manager'.
  @Column({ default: 'employee' })
  role: UserRole;

  // TypeORM's equivalent of "CreatedAt = DateTime.UtcNow" - automatically
  // set to the current timestamp when a row is first inserted.
  @CreateDateColumn()
  createdAt: Date;
}
