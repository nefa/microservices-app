import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { jwtConstants } from './jwt.constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: jwtConstants.expiresIn },
    }),
  ],
  controllers: [AuthController],
  // JwtStrategy just needs to be instantiated once by Nest's DI container
  // (by being listed here) - its constructor registers itself with
  // Passport's internal strategy registry, which is what makes
  // AuthGuard('jwt') work anywhere else in the app, not just this module.
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
