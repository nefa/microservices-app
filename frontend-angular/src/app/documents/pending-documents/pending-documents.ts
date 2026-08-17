import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Table } from 'primeng/table';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Documents, PendingDocument } from '../documents';

@Component({
  selector: 'app-pending-documents',
  imports: [FormsModule, Table, Button, InputText, Message],
  templateUrl: './pending-documents.html',
  styleUrl: './pending-documents.scss',
})
export class PendingDocuments {
  private readonly documents = inject(Documents);

  protected readonly items = signal<PendingDocument[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  // Which row (by id) currently has its reject-reason field open - only
  // one at a time, so a single pair of signals covers it instead of
  // needing per-row state.
  protected readonly rejectingId = signal<number | null>(null);
  protected readonly rejectReason = signal('');

  // Which row is mid-request - scoped to one id rather than a single
  // page-wide isSubmitting flag, so clicking Approve on one row doesn't
  // visually freeze every other row's buttons too.
  protected readonly processingId = signal<number | null>(null);

  constructor() {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.documents.getPending().subscribe({
      next: (items) => {
        this.items.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Could not load pending documents.');
        this.isLoading.set(false);
      },
    });
  }

  approve(id: number): void {
    this.errorMessage.set(null);
    this.processingId.set(id);

    this.documents.approve(id).subscribe({
      next: () => {
        this.processingId.set(null);
        this.items.update((current) => current.filter((item) => item.id !== id));
      },
      error: () => {
        this.processingId.set(null);
        this.errorMessage.set('Approval failed. Please try again.');
      },
    });
  }

  startReject(id: number): void {
    this.rejectingId.set(id);
    this.rejectReason.set('');
  }

  cancelReject(): void {
    this.rejectingId.set(null);
    this.rejectReason.set('');
  }

  confirmReject(id: number): void {
    const reason = this.rejectReason().trim();
    if (!reason) {
      this.errorMessage.set('Enter a reason before rejecting.');
      return;
    }

    this.errorMessage.set(null);
    this.processingId.set(id);

    this.documents.reject(id, reason).subscribe({
      next: () => {
        this.processingId.set(null);
        this.rejectingId.set(null);
        this.items.update((current) => current.filter((item) => item.id !== id));
      },
      error: () => {
        this.processingId.set(null);
        this.errorMessage.set('Rejection failed. Please try again.');
      },
    });
  }
}
