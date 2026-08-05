import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { FileUpload, FileSelectEvent } from 'primeng/fileupload';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { Card } from 'primeng/card';
import { Documents, DocumentFormat } from '../documents';

interface FormatOption {
  label: string;
  value: DocumentFormat;
}

@Component({
  selector: 'app-ingestion-submission-form',
  imports: [FormsModule, Select, FileUpload, Button, Message, Card],
  templateUrl: './ingestion-submission-form.html',
  styleUrl: './ingestion-submission-form.scss',
})
export class IngestionSubmissionForm {
  protected readonly formatOptions: FormatOption[] = [
    { label: 'PDF', value: 'pdf' },
    { label: 'CSV', value: 'csv' },
  ];

  protected readonly format = signal<DocumentFormat>('pdf');
  protected readonly selectedFiles = signal<File[]>([]);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // Lets the hosting page refresh IngestionSubmittedTemplate's list
  // without this component needing to know that sibling exists.
  readonly submitted = output<void>();

  constructor(private readonly documents: Documents) {}

  // The native file picker filters to whichever extension matches the
  // currently selected format, so users can't accidentally pick a .csv
  // while "PDF" is selected.
  protected get acceptedFileType(): string {
    return this.format() === 'pdf' ? '.pdf' : '.csv';
  }

  onFileSelect(event: FileSelectEvent): void {
    const newFiles = event.files instanceof FileList ? Array.from(event.files) : event.files;

    // Accumulate rather than replace - clicking "Choose Files" again adds
    // to the existing selection instead of discarding it, so picking
    // files across multiple folders/dialogs works as you'd expect.
    this.selectedFiles.update((current) => [...current, ...newFiles]);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  removeFile(file: File): void {
    this.selectedFiles.update((current) => current.filter((f) => f !== file));
  }

  onSubmit(): void {
    const files = this.selectedFiles();
    if (files.length === 0) {
      this.errorMessage.set('Choose at least one file first.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    this.documents.submit(this.format(), files).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.successMessage.set(`Submitted ${response.filesSubmitted} file(s) for review.`);
        this.submitted.emit();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Submission failed. Please try again.');
      },
    });
  }
}
