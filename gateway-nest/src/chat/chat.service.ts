import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

interface ChatbotReply {
  reply: string;
}

// NOTE: hardcoded here for learning purposes, same caveat as every other
// hardcoded config value in this project (Postgres connection, JWT
// signing key) - in a real app this URL would come from an environment
// variable, since it needs to differ between local dev, Docker Compose,
// and production.
const CHATBOT_SERVICE_URL = 'http://localhost:8001/chat';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly httpService: HttpService) {}

  async sendMessage(message: string): Promise<string> {
    try {
      // HttpService wraps axios but returns an RxJS Observable instead of
      // a Promise (Nest's HTTP client predates widespread async/await
      // adoption in the ecosystem). firstValueFrom converts that
      // Observable into a Promise so this reads like any other awaited
      // call - the same shape as awaiting an HttpClient request on the
      // .NET side.
      const response = await firstValueFrom(
        this.httpService.post<ChatbotReply>(CHATBOT_SERVICE_URL, { message }),
      );
      return response.data.reply;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Chatbot service call failed: ${axiosError.message}`);

      // 502 Bad Gateway specifically means: this server is fine, but the
      // upstream service it depends on failed or is unreachable. That's a
      // meaningfully different situation from a 500 (this server broke),
      // and matters once there's real monitoring - it tells you to go
      // check the chatbot service, not this gateway.
      throw new HttpException('Chatbot service is unavailable.', HttpStatus.BAD_GATEWAY);
    }
  }
}
