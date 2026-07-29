import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type DocumentFormat = 'pdf' | 'csv';

interface IngestResponse {
  filesIngested: number;
  chunksStored: number;
}

// NOTE: hardcoded here for learning purposes, same caveat as everywhere
// else in this project - a real app would read this from environment.ts.
const GATEWAY_URL = 'http://localhost:3000';

@Service()
export class Documents {
  private readonly http = inject(HttpClient);

  // This endpoint doesn't exist on the gateway yet - we're building the
  // Angular side first, on purpose. Calling ingest() right now will fail
  // with a 404 until the corresponding gateway route is built next. The
  // request is still shaped correctly so nothing here needs to change
  // once that endpoint exists.
  ingest(format: DocumentFormat, files: File[]): Observable<IngestResponse> {
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
    return this.http.post<IngestResponse>(`${GATEWAY_URL}/documents/ingest`, formData);
  }
}
