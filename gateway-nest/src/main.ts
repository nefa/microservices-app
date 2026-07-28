import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Browsers block cross-origin requests by default (the Angular dev
  // server on :4200 calling this API on :3000 counts as cross-origin,
  // even though both are "localhost") unless the server explicitly opts
  // in via CORS response headers. enableCors() is what adds those headers.
  //
  // NOTE: hardcoded origin here for learning purposes, same caveat as
  // everywhere else in this project - a real app would read the allowed
  // origin(s) from environment config, since it needs to match whatever
  // domain the deployed frontend actually runs on, not localhost.
  app.enableCors({
    origin: 'http://localhost:4200',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
