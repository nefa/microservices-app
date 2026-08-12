import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ChatService } from './chat.service';

// Kept as a plain class for now, no validation decorators yet - this
// step is only proving the gateway-to-microservice plumbing works.
// Proper request validation (class-validator, mirroring the Data
// Annotations step on the .NET side) is a deliberate next step, not
// skipped by accident.
class ChatMessageDto {
  message: string;
}

// The shape JwtStrategy.validate() returns (see auth/jwt.strategy.ts) -
// Passport attaches it to the request as `request.user` once
// AuthGuard('jwt') has already verified the token's signature/expiry.
interface AuthenticatedRequest extends Request {
  user: { userId: number; email: string };
}

// AuthGuard('jwt') runs JwtStrategy's validation against every request to
// this controller before any handler method executes - the direct
// parallel to TaskEndpoint.cs's .RequireAuthorization() on the .NET side.
// An unauthenticated request gets a 401 automatically, no code in chat()
// itself needs to check anything.
@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatMessageDto, @Req() request: AuthenticatedRequest) {
    // Whole response passed straight through - see ChatService.sendMessage's
    // comment for why this controller no longer narrows it to { reply }.
    return this.chatService.sendMessage(dto.message, request.user.userId);
  }
}
