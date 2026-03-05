import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';
import { GameService } from './game.service';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  pictureUrl?: string;
}

interface AuthResponse {
  token: string;
  id: string;
  email: string;
  name: string;
  pictureUrl?: string;
}

interface AuthMessagePayload {
  type: 'rainblet-auth-token';
  token: string;
  id?: string;
  email?: string;
  name?: string;
  pictureUrl?: string;
  provider?: string;
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
    window.addEventListener('message', this.handleAuthMessage);
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
    window.open(loginUrl, '_blank', 'popup=true,width=560,height=760');
  }

  loginWithEmail(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.getApiBase()}/api/auth/login`, { email, password }).pipe(
      tap((response) => this.applyAuthResponse(response))
    );
  }

  registerWithEmail(email: string, name: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.getApiBase()}/api/auth/register`, { email, name, password }).pipe(
      tap((response) => this.applyAuthResponse(response))
    );
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

  private readonly handleAuthMessage = (event: MessageEvent): void => {
    if (event.origin !== window.location.origin || !event.data || typeof event.data !== 'object') {
      return;
    }

    const payload = event.data as Partial<AuthMessagePayload>;
    if (payload.type !== 'rainblet-auth-token' || !payload.token) {
      return;
    }

    this.applyAuthResponse(
      {
        token: payload.token,
        id: payload.id ?? '',
        email: payload.email ?? '',
        name: payload.name ?? '',
        pictureUrl: payload.pictureUrl ?? ''
      },
      payload.provider === 'google'
    );
  };

  private initializeFromStorage(): void {
    const params = new URLSearchParams(window.location.search);
    const tokenFromCallback = params.get('token');
    const nameFromCallback = params.get('name');
    const emailFromCallback = params.get('email');
    const pictureFromCallback = params.get('picture');
    const providerFromCallback = params.get('provider') ?? '';

    if (tokenFromCallback) {
      if (window.opener && window.opener !== window) {
        window.opener.postMessage(
          {
            type: 'rainblet-auth-token',
            token: tokenFromCallback,
            name: nameFromCallback ?? '',
            email: emailFromCallback ?? '',
            pictureUrl: pictureFromCallback ?? '',
            provider: providerFromCallback
          } satisfies AuthMessagePayload,
          window.location.origin
        );
        window.close();
        return;
      }

      this.applyAuthResponse(
        {
          token: tokenFromCallback,
          id: '',
          email: emailFromCallback ?? '',
          name: nameFromCallback ?? '',
          pictureUrl: pictureFromCallback ?? ''
        },
        providerFromCallback === 'google'
      );

      params.delete('token');
      params.delete('name');
      params.delete('email');
      params.delete('picture');
      params.delete('provider');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
      return;
    }

    const savedToken = sessionStorage.getItem('auth_token');
    if (savedToken) {
      this.tokenState.set(savedToken);
      this.game.refreshReferenceData();
      this.fetchCurrentUser(false);
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

  private applyAuthResponse(response: AuthResponse, triggerSsoUpsert = false): void {
    this.setSession(response.token);
    this.userState.set({
      id: response.id,
      email: response.email,
      name: response.name,
      pictureUrl: response.pictureUrl ?? ''
    });

    if (triggerSsoUpsert) {
      this.upsertUserFromSso();
    }
  }

  private upsertUserFromSso(): void {
    const endpoint = `${this.getApiBase()}/api/users/sso-upsert`;
    this.http.post(endpoint, {}).subscribe({
      next: () => this.game.refreshReferenceData(),
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
