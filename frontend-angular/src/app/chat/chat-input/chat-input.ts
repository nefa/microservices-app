import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-chat-input',
  imports: [FormsModule, InputText, Button],
  templateUrl: './chat-input.html',
  styleUrl: './chat-input.scss',
})
export class ChatInput {
  // Signal input - true while ChatPage is waiting on a response, so this
  // can't fire a second message before the first one resolves.
  readonly disabled = input(false);

  readonly send = output<string>();

  protected readonly text = signal('');

  onSubmit(): void {
    const trimmed = this.text().trim();
    if (!trimmed || this.disabled()) {
      return;
    }

    this.send.emit(trimmed);
    this.text.set('');
  }
}
