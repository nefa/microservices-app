import { Component } from '@angular/core';
import { TopBar } from '../../layout/top-bar/top-bar';
import { PendingDocuments } from '../pending-documents/pending-documents';

// Thin route host, same pattern as documents/ingest/ingest.ts - the
// actual widget lives in PendingDocuments. A distinct page from /ingest
// on purpose (per the ingestion-submission-form.ts comment about a
// future IngestionSubmittedTemplate) - that one would show a submitter
// their own documents' review status; this one is a manager's queue
// across every submitter, a different audience and a different guard
// (see app.routes.ts's managerGuard).
@Component({
  selector: 'app-review',
  imports: [TopBar, PendingDocuments],
  templateUrl: './review.html',
  styleUrl: './review.scss',
})
export class Review {}
