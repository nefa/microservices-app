import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { LmaExceptionFilter } from './registrations/lma-exception.filter';
import { RegistrationsModule } from './registrations/registrations.module';

@Module({
  imports: [RegistrationsModule],
  controllers: [AppController],
  providers: [
    // Applied globally rather than per-controller since every error this
    // service ever raises (today: EMAIL_TAKEN, PASSWORD_POLICY) needs the
    // same X-Error-Code-header-plus-JSON-body treatment - see
    // lma-exception.filter.ts.
    {
      provide: APP_FILTER,
      useClass: LmaExceptionFilter,
    },
  ],
})
export class AppModule {}
