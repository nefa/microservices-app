import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // register-form-angular talks to this service directly, not through
  // gateway-nest (see PROJECT-Structure-diagram.md at the repo root,
  // section 3 - registration is the one deliberate exception to the
  // gateway-only pattern), so CORS needs to allow its dev-server origin
  // specifically, not gateway-nest's :4200.
  //
  // NOTE: hardcoded here for learning purposes, same caveat as
  // gateway-nest/src/main.ts - a real deployment would read allowed
  // origins from environment config.
  app.enableCors({
    origin: 'http://localhost:4222',
  });

  // 43022, distinct from gateway-nest (3000), chatbot-rag-python (8001),
  // and frontend-angular (4200) - see INSTRUCTIONS.md's "Services at a
  // glance" table.
  await app.listen(process.env.PORT ?? 43022);
}
bootstrap();
