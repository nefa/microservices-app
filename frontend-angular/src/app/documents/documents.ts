import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type DocumentFormat = 'pdf' | 'csv';

interface SubmitResponse {
  filesSubmitted: number;
}

// Mirrors gateway-nest's PendingDocumentSummary (documents.service.ts),
// which mirrors chatbot-rag-python's PendingDocumentSummary
// (document_review.py) - same cross-language "kept in sync by hand"
// situation as chat.ts's ChatResponse.
export interface PendingDocument {
  id: number;
  sourceFilename: string;
  format: DocumentFormat;
  submittedBy: string;
  createdAt: string;
}

interface ApproveResponse {
  chunksStored: number;
}

@Service()
export class Documents {
  private readonly http = inject(HttpClient);

  // Submits files for manager review - they land in chatbot-rag-python's
  // pending_document table, not chunked/embedded yet. That only happens
  // once a manager approves (see ARCHITECTURE.md's "Document review
  // before ingestion" section).
  submit(format: DocumentFormat, files: File[]): Observable<SubmitResponse> {
    const formData = new FormData();
    formData.append('format', format);

    // Repeating the same field name ("files") for each entry is the
    // standard way to send an array of files in one multipart request -
    // the backend framework (FastAPI/Nest) reads all of them back out
    // under that one field name, rather than needing files[0], files[1], etc.
    for (const file of files) {
      formData.append('files', file);
    }

    // Deliberately NOT setting a Content-Type header here. FormData
    // bodies need "multipart/form-data; boundary=..." - the browser
    // computes that boundary itself and sets the header automatically
    // when it sees the body is a FormData instance. Setting it manually
    // would overwrite that with a header missing the boundary, breaking
    // the upload.
    return this.http.post<SubmitResponse>(`${environment.gatewayUrl}/documents/submit`, formData);
  }

  // Manager-only on the backend (gateway-nest's ManagerGuard rejects
  // anyone else with a 403) - this service doesn't re-check the role
  // itself, same "don't duplicate an authorization decision" reasoning
  // as everywhere else this pattern shows up in this project.
  getPending(): Observable<PendingDocument[]> {
    return this.http.get<PendingDocument[]>(`${environment.gatewayUrl}/documents/pending`);
  }

  approve(id: number): Observable<ApproveResponse> {
    return this.http.post<ApproveResponse>(`${environment.gatewayUrl}/documents/${id}/approve`, {});
  }

  // No response body - gateway-nest's reject endpoint returns 204,
  // matching chatbot-rag-python's own 204 for the same action.
  reject(id: number, reason: string): Observable<void> {
    return this.http.post<void>(`${environment.gatewayUrl}/documents/${id}/reject`, { reason });
  }
}
