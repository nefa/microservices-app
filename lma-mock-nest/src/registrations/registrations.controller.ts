import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { PublicRegistrationRecord, RegistrationsService } from './registrations.service';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  // Debug/inspection only - not part of the real LMA contract
  // register-form-angular assumes (there's no equivalent "list all
  // registrations" call in lma-api.ts). This is the local stand-in for
  // "open pgAdmin and look at the table": lma-mock-nest has no database,
  // so there's nothing for pgAdmin to connect to - hit this instead to
  // see who's registered.
  @Get()
  list(): PublicRegistrationRecord[] {
    return this.registrationsService.list();
  }

  // Matches what register-form-angular's registration-model.ts already
  // assumes (see its validateHttp comment): GET
  // .../email-availability?email=... -> { available: boolean } on 200.
  @Get('email-availability')
  checkAvailability(@Query('email') email: string): { available: boolean } {
    return { available: this.registrationsService.isAvailable(email ?? '') };
  }

  // register-form-angular's LmaApi.register() does `post<void>(...)` and
  // only cares about success vs. thrown error - 201 with an empty body.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<void> {
    await this.registrationsService.register(dto);
  }
}
