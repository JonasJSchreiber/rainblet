import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';

export interface FeedbackRequest {
  feedbackType?: string;
  source?: string;
  subject?: string;
  message: string;
  pageUrl?: string;
  appVersion?: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface FeedbackResponse {
  id: number;
  status: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);

  submitFeedback(request: FeedbackRequest): Observable<FeedbackResponse> {
    return this.http.post<FeedbackResponse>(`${this.appConfig.apiBaseUrl}/api/users/me/feedback`, request);
  }
}
