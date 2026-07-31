import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { DocumentsModule } from './documents/documents.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // TypeOrmModule.forRoot(...) is the NestJS equivalent of
    // builder.Services.AddDbContext<AppDbContext>(options =>
    //   options.UseNpgsql(connectionString)) in TaskApi's Program.cs -
    // it configures the actual database connection once, at the app root.
    //
    // NOTE: hardcoded here for learning purposes, same caveat as TaskApi's
    // connection string - in a real app these values would come from
    // environment variables/a secrets manager, never committed to source
    // control.
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'gatewaydb',
      entities: [User],
      // synchronize: true auto-creates/alters tables to match your entity
      // classes on every startup - no migration files, no history. It's
      // the fast, convenient option for early learning/prototyping (which
      // is why we're using it now), but it's genuinely dangerous in
      // production: it can silently alter or drop columns/data when
      // entities change, with no review step. TypeORM's own docs warn
      // against it outside development. The equivalent of TaskApi's
      // `dotnet ef migrations add` + `database update` workflow is
      // TypeORM's migration system - worth switching to once this
      // service's schema stabilizes.
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    ChatModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
