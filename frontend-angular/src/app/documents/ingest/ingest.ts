import { Component, viewChild } from '@angular/core';
import { IngestionSubmissionForm } from '../ingestion-submission-form/ingestion-submission-form';
import { IngestionSubmittedTemplate } from '../ingestion-submitted-template/ingestion-submitted-template';
import { TopBar } from '../../layout/top-bar/top-bar';

// Route host for the two document-review widgets, side by side per
// ARCHITECTURE.md's "Document review before ingestion" section:
// IngestionSubmissionForm (submit) on the left,
// IngestionSubmittedTemplate (the submitter's own history) on the
// right. This component's only job is wiring one to the other -
// refreshing the list after a successful submit.
@Component({
  selector: 'app-ingest',
  imports: [IngestionSubmissionForm, IngestionSubmittedTemplate, TopBar],
  templateUrl: './ingest.html',
  styleUrl: './ingest.scss',
})
export class Ingest {
  private readonly submittedTemplate = viewChild.required(IngestionSubmittedTemplate);

  onSubmitted(): void {
    this.submittedTemplate().refresh();
  }
}
