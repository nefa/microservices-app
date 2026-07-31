import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    // Longer timeout than chat's (5s) - ingestion involves parsing
    // files, chunking, and embedding every chunk before the Python
    // service can respond, which reasonably takes longer than a single
    // chat echo.
    HttpModule.register({ timeout: 15000 }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
