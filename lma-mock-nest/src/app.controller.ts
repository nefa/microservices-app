import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // A quick manual-verification endpoint, same pattern as
  // chatbot-rag-python's GET /health (see INSTRUCTIONS.md) - lets you
  // confirm the service booted before wiring up register-form-angular
  // against it.
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
