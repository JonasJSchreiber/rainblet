import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(AppConfigService);
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
    window.location.href = `${this.getApiBase()}/api/auth/google`;
  }

  logout(): void {
    this.http.post<void>(`${this.getApiBase()}/api/auth/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession()
    });
  }

  private initializeFromStorage(): void {
    const params = new URLSearchParams(window.location.search);
    const tokenFromCallback = params.get('token');
    const nameFromCallback = params.get('name');

    if (tokenFromCallback) {
      this.setSession(tokenFromCallback);
      if (nameFromCallback) {
        this.userState.set({ id: '', email: '', name: nameFromCallback });
      }

      params.delete('token');
      params.delete('name');
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
      this.fetchCurrentUser();
    }
  }

  private fetchCurrentUser(): void {
    this.http.get<AuthUser>(`${this.getApiBase()}/api/auth/me`).subscribe({
      next: (user) => this.userState.set(user),
      error: () => this.clearSession()
    });
  }

  private setSession(token: string): void {
    this.tokenState.set(token);
    sessionStorage.setItem('auth_token', token);
  }

  private clearSession(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    sessionStorage.removeItem('auth_token');
  }
}
