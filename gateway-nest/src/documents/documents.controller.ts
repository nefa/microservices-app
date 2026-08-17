import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { DocumentsService } from './documents.service';
import { ManagerGuard } from '../auth/manager.guard';
import { UserRole } from '../users/user.entity';

// Same shape JwtStrategy.validate() returns, attached by Passport once
// AuthGuard('jwt') succeeds - see chat.controller.ts for the original.
interface AuthenticatedRequest extends Request {
  user: { userId: number; email: string; role: UserRole };
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
  @Post('submit')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  async submit(
    @Body('format') format: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() request: AuthenticatedRequest,
  ) {
    return this.documentsService.submit(format, files, request.user.userId);
  }

  // Manager-only from here down. ManagerGuard runs after AuthGuard('jwt')
  // (the class-level guard runs before a method-level one), so
  // request.user is already populated by the time ManagerGuard checks
  // the role - see that guard's own comment.
  @Get('pending')
  @UseGuards(ManagerGuard)
  async listPending(@Req() request: AuthenticatedRequest) {
    return this.documentsService.listPending(request.user.userId);
  }

  @Post(':id/approve')
  @UseGuards(ManagerGuard)
  async approve(@Param('id', ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.documentsService.approve(id, request.user.userId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ManagerGuard)
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.documentsService.reject(id, request.user.userId, reason);
  }
}
