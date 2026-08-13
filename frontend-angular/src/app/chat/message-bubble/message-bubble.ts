import { Component, computed, input } from '@angular/core';
import { Table } from 'primeng/table';
import { ChatListData, ChatMessage, ChatTableData } from '../chat';

@Component({
  selector: 'app-message-bubble',
  imports: [Table],
  templateUrl: './message-bubble.html',
  styleUrl: './message-bubble.scss',
})
export class MessageBubble {
  readonly message = input.required<ChatMessage>();

  // `@if (expr; as alias)` binds alias to expr's own value, not a
  // narrowed version of some operand inside it - a boolean-returning
  // type-guard function wouldn't work here (alias would just be `true`).
  // These computed signals return the narrowed data itself (or null),
  // so `@if (tableData(); as data)` in the template gives `data` the
  // actual ChatTableData, not a boolean. message().data's static type is
  // the union ChatTableData | ChatListData | null - nothing about
  // message().type alone lets the template narrow which arm it's in.
  protected readonly tableData = computed<ChatTableData | null>(() => {
    const data = this.message().data;
    return data && 'columns' in data ? data : null;
  });

  protected readonly listData = computed<ChatListData | null>(() => {
    const data = this.message().data;
    return data && 'items' in data ? data : null;
  });
}
