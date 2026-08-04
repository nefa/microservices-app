import { Component } from '@angular/core';
import { IngestionSubmissionForm } from '../ingestion-submission-form/ingestion-submission-form';
import { TopBar } from '../../layout/top-bar/top-bar';

// Thin route host for now - the submission widget lives in
// IngestionSubmissionForm so it can sit side by side with
// IngestionSubmittedTemplate (the submitter's own-documents list) once
// that's built, per ARCHITECTURE.md's "Document review before
// ingestion" section.
@Component({
  selector: 'app-ingest',
  imports: [IngestionSubmissionForm, TopBar],
  templateUrl: './ingest.html',
  styleUrl: './ingest.scss',
})
export class Ingest {}
