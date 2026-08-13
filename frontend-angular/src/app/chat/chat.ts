import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Mirrors gateway-nest's ChatbotResponse (chat.service.ts), which in
// turn mirrors chatbot-rag-python's ChatResponse (chat_router.py) -
// three languages, one shape, no compiler check across any of the
// boundaries. See ARCHITECTURE.md's "Chat responses" section - same
// "keep it in sync by hand" situation as the internal API secret.
//
// Narrower than ARCHITECTURE.md's full text|table|chart|list|comparison
// union on purpose - chatbot-rag-python only has handlers for
// text/table so far, and this app only has a renderer for text so far
// (see ChatPage). Widen both together as real handlers/renderers land.
export type ChatResponseType = 'text' | 'table';

export interface ChatTableData {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface ChatSuggestion {
  label: string;
  type: string;
}

export interface ChatResponse {
  reply: string;
  type: ChatResponseType;
  data: ChatTableData | null;
  suggestions: ChatSuggestion[];
}

// NOTE: hardcoded here for learning purposes, same caveat as everywhere
// else in this project - a real app would read this from environment.ts.
const GATEWAY_URL = 'http://localhost:3000';

@Service()
export class Chat {
  private readonly http = inject(HttpClient);

  sendMessage(message: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${GATEWAY_URL}/chat`, { message });
  }
}
