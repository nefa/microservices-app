import { Body, Controller, Post, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { DocumentsService } from './documents.service';

// Same shape JwtStrategy.validate() returns, attached by Passport once
// AuthGuard('jwt') succeeds - see chat.controller.ts for the original.
interface AuthenticatedRequest extends Request {
  user: { userId: number; email: string };
}

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // FilesInterceptor('files', ...) matches the repeated "files" field
  // name Documents.ts (Angular) appends each File under. memoryStorage()
  // is explicit here (rather than relying on multer's default) so files
  // land in file.buffer, ready to forward immediately - not written to
  // disk on this server at all, since we're just relaying them onward.
  // "10" caps how many files one request can carry, as a basic safety
  // limit.
  @Post('ingest')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  async ingest(
    @Body('format') format: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() request: AuthenticatedRequest,
  ) {
    return this.documentsService.ingest(format, files, request.user.userId);
  }
}
