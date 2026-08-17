import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';
import { INTERNAL_API_KEY } from '../common/internal-api.constants';

export interface SubmitResponse {
  filesSubmitted: number;
}

// Mirrors chatbot-rag-python's PendingDocumentSummary (document_review.py)
// field for field - same "kept in sync by hand across the language
// boundary" situation as ChatbotResponse in chat.service.ts.
export interface PendingDocumentSummary {
  id: number;
  sourceFilename: string;
  format: string;
  submittedBy: string;
  createdAt: string;
}

export interface ApproveResponse {
  chunksStored: number;
}

// NOTE: hardcoded here for learning purposes, same caveat as every other
// hardcoded config value in this project.
const CHATBOT_BASE_URL = 'http://localhost:8001';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private readonly httpService: HttpService) {}

  async submit(
    format: string,
    files: Express.Multer.File[],
    userId: number,
  ): Promise<SubmitResponse> {
    // Re-packaging the files this gateway already received from Angular
    // into a NEW multipart request to forward to chatbot-rag-python.
    // This "form-data" package (Node's server-side multipart builder) is
    // a different thing from the browser's built-in FormData used on
    // the Angular side (Documents.ts) - same concept, different API.
    const formData = new FormData();
    formData.append('format', format);
    for (const file of files) {
      formData.append('files', file.buffer, file.originalname);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<SubmitResponse>(`${CHATBOT_BASE_URL}/documents/submit`, formData, {
          headers: {
            // Unlike the browser's native FormData (which sets its own
            // Content-Type + boundary automatically), axios does NOT
            // compute that header for a Node "form-data" instance -
            // .getHeaders() is what actually produces the correct
            // "multipart/form-data; boundary=..." header here. Omitting
            // it (the way Documents.ts deliberately does on the Angular
            // side) would break this request instead of fixing it - the
            // two environments need opposite handling.
            ...formData.getHeaders(),
            'X-Internal-Api-Key': INTERNAL_API_KEY,
            'X-User-Id': userId.toString(),
          },
        }),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Document submission call failed: ${axiosError.message}`);
      throw new HttpException(
        'Document submission service is unavailable.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // reviewerId is who's doing the reviewing, not who submitted anything -
  // a different meaning than userId carries on submit() above, forwarded
  // as the same X-User-Id header because chatbot-rag-python's
  // verify_internal_request doesn't distinguish "submitter" from
  // "reviewer" as a concept, only "whoever the gateway says this is."
  async listPending(reviewerId: number): Promise<PendingDocumentSummary[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<PendingDocumentSummary[]>(`${CHATBOT_BASE_URL}/documents/pending`, {
          headers: {
            'X-Internal-Api-Key': INTERNAL_API_KEY,
            'X-User-Id': reviewerId.toString(),
          },
        }),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`List pending documents call failed: ${axiosError.message}`);
      throw new HttpException('Document review service is unavailable.', HttpStatus.BAD_GATEWAY);
    }
  }

  async approve(documentId: number, reviewerId: number): Promise<ApproveResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<ApproveResponse>(
          `${CHATBOT_BASE_URL}/documents/${documentId}/approve`,
          {},
          {
            headers: {
              'X-Internal-Api-Key': INTERNAL_API_KEY,
              'X-User-Id': reviewerId.toString(),
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      throw this.translateReviewError(error as AxiosError);
    }
  }

  async reject(documentId: number, reviewerId: number, reason: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${CHATBOT_BASE_URL}/documents/${documentId}/reject`,
          { reason },
          {
            headers: {
              'X-Internal-Api-Key': INTERNAL_API_KEY,
              'X-User-Id': reviewerId.toString(),
            },
          },
        ),
      );
    } catch (error) {
      throw this.translateReviewError(error as AxiosError);
    }
  }

  // approve()/reject() can fail for reasons a caller actually needs to
  // distinguish (someone else already reviewed this, or it doesn't
  // exist) from "the service is unreachable" - unlike submit()/
  // listPending() above, collapsing everything into one 502 would hide
  // that difference from the frontend.
  private translateReviewError(error: AxiosError): HttpException {
    const status = error.response?.status;

    if (status === HttpStatus.NOT_FOUND) {
      return new HttpException('Pending document not found.', HttpStatus.NOT_FOUND);
    }
    if (status === HttpStatus.CONFLICT) {
      return new HttpException('Document has already been reviewed.', HttpStatus.CONFLICT);
    }

    this.logger.error(`Document review call failed: ${error.message}`);
    return new HttpException('Document review service is unavailable.', HttpStatus.BAD_GATEWAY);
  }
}
