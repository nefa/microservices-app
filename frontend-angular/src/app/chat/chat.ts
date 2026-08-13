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
// text/table/list so far. The type contract is kept accurate here even
// though ChatPage only renders `text` for now (see its comment) - the
// data is already flowing through, only the rendering step is pending.
export type ChatResponseType = 'text' | 'table' | 'list';

export interface ChatTableData {
  columns: string[];
  rows: Record<string, unknown>[];
}

// Semantic search's result shape - one item per matching document_chunk
// (title = source filename, snippet = a truncated excerpt), not a
// generated answer. See chatbot-rag-python's chat_router.py module
// docstring for why: retrieval only, no LLM synthesis yet.
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

export interface ChatResponse {
  reply: string;
  type: ChatResponseType;
  data: ChatTableData | ChatListData | null;
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
