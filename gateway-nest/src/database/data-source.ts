import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';

// A standalone TypeORM connection config, separate from the
// TypeOrmModule.forRoot(...) call in app.module.ts. Nest's app module
// only exists once the whole Nest dependency-injection container boots up
// - overkill for a one-off script like seed.ts that just needs to insert
// some rows and exit. This DataSource also doubles as what TypeORM's own
// CLI would use later if/when this project switches from
// synchronize: true to real migration files (see the comment on
// synchronize in app.module.ts).
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'gatewaydb',
  entities: [User],
});
