import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { FileUpload, FileSelectEvent } from 'primeng/fileupload';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { Card } from 'primeng/card';
import { Documents, DocumentFormat } from '../documents';
import { TopBar } from '../../layout/top-bar/top-bar';

interface FormatOption {
  label: string;
  value: DocumentFormat;
}

@Component({
  selector: 'app-ingest',
  imports: [FormsModule, Select, FileUpload, Button, Message, Card, TopBar],
  templateUrl: './ingest.html',
  styleUrl: './ingest.scss',
})
export class Ingest {
  protected readonly formatOptions: FormatOption[] = [
    { label: 'PDF', value: 'pdf' },
    { label: 'CSV', value: 'csv' },
  ];

  protected readonly format = signal<DocumentFormat>('pdf');
  protected readonly selectedFiles = signal<File[]>([]);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

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

    this.documents.ingest(this.format(), files).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.successMessage.set(
          `Ingested ${response.filesIngested} file(s) - ${response.chunksStored} chunks stored.`,
        );
      },
      error: () => {
        this.isSubmitting.set(false);
        // Expected for now - /documents/ingest doesn't exist on the
        // gateway yet. This confirms the form/request itself works;
        // wiring the real backend endpoint is the next step.
        this.errorMessage.set(
          'Ingestion failed (expected for now - the gateway endpoint isn\'t built yet).',
        );
      },
    });
  }
}
