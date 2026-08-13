import { Component, ElementRef, afterRenderEffect, inject, signal, viewChild } from '@angular/core';
import { TopBar } from '../../layout/top-bar/top-bar';
import { ChatInput } from '../chat-input/chat-input';
import { Chat, ChatResponseType, ChatSuggestion, ChatTableData } from '../chat';

// Text-only rendering for now, even though the service already carries
// type/data/suggestions - table/list renderers are the next step, once
// this baseline (send a message, see a reply, real data from
// chatbot-rag-python's structured-query path) is working end to end.
// message.type/data/suggestions are captured anyway so nothing needs to
// be re-fetched when that rendering step lands.
interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  type?: ChatResponseType;
  data?: ChatTableData | null;
  suggestions?: ChatSuggestion[];
}

@Component({
  selector: 'app-chat-page',
  imports: [TopBar, ChatInput],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.scss',
})
export class ChatPage {
  private readonly chat = inject(Chat);

  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly isSending = signal(false);

  // Signal-based view query - Angular's current recommended pattern,
  // replacing @ViewChild. Resolves to the #messageList div once it's
  // rendered; undefined before that (nothing to scroll yet).
  private readonly messageList = viewChild<ElementRef<HTMLDivElement>>('messageList');

  constructor() {
    // Runs after Angular has actually painted the DOM - scrollHeight
    // already reflects whatever message was just added by the time this
    // fires. Reading messages() here is what makes the effect re-run on
    // every new message, the same dependency-tracking idea computed()
    // uses elsewhere in this app, just for a DOM side effect instead of
    // a derived value.
    afterRenderEffect(() => {
      this.messages();
      const el = this.messageList()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  onSend(text: string): void {
    this.messages.update((current) => [...current, { id: crypto.randomUUID(), role: 'user', text }]);
    this.isSending.set(true);

    this.chat.sendMessage(text).subscribe({
      next: (response) => {
        this.isSending.set(false);
        this.messages.update((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            text: response.reply,
            type: response.type,
            data: response.data,
            suggestions: response.suggestions,
          },
        ]);
      },
      error: () => {
        this.isSending.set(false);
        this.messages.update((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            text: 'Something went wrong reaching the chat service. Please try again.',
          },
        ]);
      },
    });
  }
}
