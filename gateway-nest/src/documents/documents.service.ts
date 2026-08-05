import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';
import { INTERNAL_API_KEY } from '../common/internal-api.constants';

export interface SubmitResponse {
  filesSubmitted: number;
}

// Mirrors chatbot-rag-python's PendingDocumentSummary - same
// keep-in-sync-by-hand situation as INTERNAL_API_KEY.
export interface PendingDocumentSummary {
  id: number;
  sourceFilename: string;
  format: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

// NOTE: hardcoded here for learning purposes, same caveat as every other
// hardcoded config value in this project.
const CHATBOT_SUBMIT_URL = 'http://localhost:8001/documents/submit';
const CHATBOT_MINE_URL = 'http://localhost:8001/documents/mine';

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
        this.httpService.post<SubmitResponse>(CHATBOT_SUBMIT_URL, formData, {
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

  async listMine(userId: number): Promise<PendingDocumentSummary[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<PendingDocumentSummary[]>(CHATBOT_MINE_URL, {
          headers: {
            'X-Internal-Api-Key': INTERNAL_API_KEY,
            'X-User-Id': userId.toString(),
          },
        }),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(`Document list call failed: ${axiosError.message}`);
      throw new HttpException(
        'Document submission service is unavailable.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
