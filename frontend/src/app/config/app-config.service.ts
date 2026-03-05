import { Injectable } from '@angular/core';

export interface AppConfig {
  apiBaseUrl: string;
}

declare const API_BASE_URL: string | undefined;

const resolvedApiBaseUrl = (
  (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : undefined) ??
  (globalThis as { API_BASE_URL?: string }).API_BASE_URL ??
  'http://localhost:8080'
)
  .trim()
  .replace(/\/$/, '');

const DEFAULT_CONFIG: AppConfig = {
  apiBaseUrl: resolvedApiBaseUrl
};

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config: AppConfig = DEFAULT_CONFIG;

  async load(): Promise<void> {
    try {
      const response = await fetch('/assets/app-config.json', { cache: 'no-store' });
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as Partial<AppConfig>;
      if (typeof data.apiBaseUrl === 'string' && data.apiBaseUrl.trim().length > 0) {
        this.config = {
          apiBaseUrl: data.apiBaseUrl.trim().replace(/\/$/, '')
        };
      }
    } catch {
      // Fall back to default config when file is missing or malformed.
    }
  }

  get apiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }
}
