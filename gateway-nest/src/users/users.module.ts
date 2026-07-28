import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

// TypeOrmModule.forFeature([User]) registers the User entity's repository
// for dependency injection *within this module and anywhere that imports
// UsersModule* - this is the rough equivalent of AppDbContext exposing
// DbSet<UserEntity> Users, except here each entity gets registered
// per-feature-module rather than all living on one shared DbContext.
//
// Exporting UsersService (not just TypeOrmModule) is what lets AuthModule
// inject UsersService directly, without needing its own access to the
// raw repository.
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
