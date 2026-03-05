import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';
import { GameService } from './game.service';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  pictureUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private static readonly SSO_LOG_PREFIX = '[SSO]';

  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);
  private readonly game = inject(GameService);
  private readonly tokenState = signal<string | null>(null);
  private readonly userState = signal<AuthUser | null>(null);

  readonly token = computed(() => this.tokenState());
  readonly user = computed(() => this.userState());
  readonly isAuthenticated = computed(() => !!this.tokenState());

  constructor() {
    this.initializeFromStorage();
  }

  getApiBase(): string {
    return this.appConfig.apiBaseUrl;
  }

  getToken(): string | null {
    return this.tokenState();
  }

  loginWithGoogle(): void {
    const loginUrl = `${this.getApiBase()}/api/auth/google`;
    window.location.href = loginUrl;
  }

  logout(): void {
    this.http.post<void>(`${this.getApiBase()}/api/auth/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: (error) => {
        this.logError('logout error', error);
        this.clearSession();
      }
    });
  }

  private initializeFromStorage(): void {
    const params = new URLSearchParams(window.location.search);
    const tokenFromCallback = params.get('token');
    const nameFromCallback = params.get('name');
    const emailFromCallback = params.get('email');
    const pictureFromCallback = params.get('picture');

    if (tokenFromCallback) {
      this.setSession(tokenFromCallback);
      const callbackUser: AuthUser = {
        id: '',
        email: emailFromCallback ?? '',
        name: nameFromCallback ?? '',
        pictureUrl: pictureFromCallback ?? ''
      };
      if (callbackUser.name || callbackUser.email || callbackUser.pictureUrl) {
        this.userState.set(callbackUser);
      }

      params.delete('token');
      params.delete('name');
      params.delete('email');
      params.delete('picture');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    } else {
      const savedToken = sessionStorage.getItem('auth_token');
      if (savedToken) {
        this.tokenState.set(savedToken);
      }
    }

    if (this.tokenState()) {
      this.game.refreshReferenceData();
      this.fetchCurrentUser(!!tokenFromCallback);
    }
  }

  private fetchCurrentUser(triggerSsoUpsert: boolean): void {
    this.http.get<AuthUser>(`${this.getApiBase()}/api/auth/me`).subscribe({
      next: (user) => {
        this.userState.set(user);
        this.game.refreshReferenceData();
        if (triggerSsoUpsert) {
          this.upsertUserFromSso();
        }
      },
      error: (error) => {
        this.logError('fetchCurrentUser error', error);
        this.clearSession();
      }
    });
  }

  private upsertUserFromSso(): void {
    const endpoint = `${this.getApiBase()}/api/users/sso-upsert`;
    this.http.post(endpoint, {}).subscribe({
      error: (error) => {
        this.logError('upsertUserFromSso error', error);
      }
    });
  }

  private setSession(token: string): void {
    this.tokenState.set(token);
    sessionStorage.setItem('auth_token', token);
    this.game.refreshReferenceData();
  }

  private clearSession(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    sessionStorage.removeItem('auth_token');
    this.game.refreshReferenceData();
  }

  private logError(event: string, error: unknown): void {
    console.error(`${AuthService.SSO_LOG_PREFIX} ${event}`, this.describeHttpError(error));
  }

  private describeHttpError(error: unknown): unknown {
    if (error && typeof error === 'object') {
      const candidate = error as {
        status?: number;
        statusText?: string;
        url?: string | null;
        message?: string;
        error?: unknown;
      };
      return {
        status: candidate.status,
        statusText: candidate.statusText,
        url: candidate.url,
        message: candidate.message,
        error: candidate.error
      };
    }

    return error;
  }
}