import { Component, ElementRef, afterRenderEffect, inject, signal, viewChild } from '@angular/core';
import { TopBar } from '../../layout/top-bar/top-bar';
import { ChatInput } from '../chat-input/chat-input';
import { MessageBubble } from '../message-bubble/message-bubble';
import { Chat, ChatMessage } from '../chat';

@Component({
  selector: 'app-chat-page',
  imports: [TopBar, ChatInput, MessageBubble],
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
