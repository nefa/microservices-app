import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { INTERNAL_API_KEY } from '../common/internal-api.constants';

// Mirrors chatbot-rag-python's ChatResponse (chat_router.py) field for
// field - camelCase both sides, but this is the same "no compiler check
// across the language boundary" situation as INTERNAL_API_KEY: has to be
// kept in sync by hand. `type`/`data` only grow richer (chart,
// comparison, ...) as chatbot-rag-python adds handlers for them - see
// ARCHITECTURE.md's "Chat responses" section.
export type ChatResponseType = 'text' | 'table' | 'list';

export interface ChatTableData {
  columns: string[];
  rows: Record<string, unknown>[];
}

// Semantic search's result shape (chat_router.py's ListData) - one item
// per matching document_chunk, not a generated answer (see that file's
// module docstring for why: retrieval only, no LLM synthesis yet).
export interface ChatListItem {
  title: string;
  snippet: string;
}

export interface ChatListData {
  items: ChatListItem[];
}

export interface ChatSuggestion {
  label: string;
  type: string;
}

export interface ChatbotResponse {
  reply: string;
  type: ChatResponseType;
  data: ChatTableData | ChatListData | null;
  suggestions: ChatSuggestion[];
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

  async sendMessage(message: string, userId: number): Promise<ChatbotResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<ChatbotResponse>(
          CHATBOT_SERVICE_URL,
          { message },
          {
            headers: {
              // Proves this call came from the trusted gateway, not a
              // direct hit on the Python service's port.
              'X-Internal-Api-Key': INTERNAL_API_KEY,
              // The Python service trusts this value BECAUSE it's paired
              // with the header above - it never validates a JWT itself,
              // it just trusts whoever holds the shared secret to have
              // already done that verification (which this gateway did,
              // via AuthGuard('jwt') on the controller that called us).
              'X-User-Id': userId.toString(),
            },
          },
        ),
      );
      // Pass the whole envelope through as-is - this gateway has no
      // opinion on `type`/`data`/`suggestions`, it's just the trusted
      // relay between the JWT world (frontend-angular) and the
      // internal-key world (chatbot-rag-python). Narrowing this down to
      // { reply } (the old behavior) is exactly what made those fields
      // unreachable by any real client.
      return response.data;
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
