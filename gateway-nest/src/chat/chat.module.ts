import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    // timeout guards against the chatbot service hanging forever on a
    // slow/stuck request - without it, a single bad upstream call could
    // tie up a gateway request indefinitely.
    HttpModule.register({ timeout: 5000 }),
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
