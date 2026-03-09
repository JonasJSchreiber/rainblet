import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedbackRequest, FeedbackService } from '../services/feedback.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  templateUrl: './feedback-page.component.html',
  styleUrls: ['./feedback-page.component.css']
})
export class FeedbackPageComponent {
  private readonly feedbackService = inject(FeedbackService);

  readonly feedbackType = signal('general');
  readonly subject = signal('');
  readonly message = signal('');

  readonly isSubmitting = signal(false);
  readonly error = signal('');
  readonly success = signal<{ id: number; createdAt: string } | null>(null);

  readonly canSubmit = computed(() => this.message().trim().length > 0 && !this.isSubmitting());

  submit(): void {
    const message = this.message().trim();
    if (!message) {
      this.error.set('Message is required.');
      return;
    }

    this.error.set('');
    this.success.set(null);
    this.isSubmitting.set(true);

    const payload: FeedbackRequest = {
      feedbackType: this.feedbackType().trim() || 'general',
      source: 'web-app',
      message
    };

    const subject = this.valueOrUndefined(this.subject());
    if (subject) {
      payload.subject = subject;
    }

    this.feedbackService.submitFeedback(payload).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.success.set({ id: response.id, createdAt: response.createdAt });
        this.subject.set('');
        this.message.set('');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.error.set(this.readError(err, 'Unable to submit feedback.'));
      }
    });
  }

  private valueOrUndefined(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  private readError(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const payload = (error as { error?: { message?: string } }).error;
      if (payload?.message) {
        return payload.message;
      }
    }

    return fallback;
  }
}
