import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { Message } from 'primeng/message';
import { Documents, DocumentReviewStatus, PendingDocumentSummary } from '../documents';

interface StatusTag {
  label: string;
  severity: 'warn' | 'success' | 'danger';
}

const STATUS_TAGS: Record<DocumentReviewStatus, StatusTag> = {
  pending: { label: 'Pending', severity: 'warn' },
  approved: { label: 'Approved', severity: 'success' },
  rejected: { label: 'Rejected', severity: 'danger' },
};

// The submitter's own view of what they've sent for review - the
// reviewer's equivalent (all pending across every submitter, with
// approve/reject/download) is a separate component
// (ingestion-review-template), not built yet.
@Component({
  selector: 'app-ingestion-submitted-template',
  imports: [Card, Tag, Message, DatePipe],
  templateUrl: './ingestion-submitted-template.html',
  styleUrl: './ingestion-submitted-template.scss',
})
export class IngestionSubmittedTemplate {
  protected readonly submissions = signal<PendingDocumentSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor(private readonly documents: Documents) {
    this.refresh();
  }

  // Public so a sibling component (IngestionSubmissionForm, via the
  // hosting Ingest page) can trigger a reload after a successful
  // submit - otherwise this list would go stale the moment you submit
  // something new.
  refresh(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.documents.listMine().subscribe({
      next: (documents) => {
        this.isLoading.set(false);
        this.submissions.set(documents);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Could not load your submissions.');
      },
    });
  }

  protected statusTag(status: DocumentReviewStatus): StatusTag {
    return STATUS_TAGS[status];
  }
}
