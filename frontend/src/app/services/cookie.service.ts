import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

export interface CookieOptions {
  days?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CookieService {
  private readonly document = inject(DOCUMENT);

  get(name: string): string | null {
    const encodedName = this.encode(name);
    const cookies = this.document.cookie ? this.document.cookie.split('; ') : [];

    for (const entry of cookies) {
      const separatorIndex = entry.indexOf('=');
      const rawName = separatorIndex >= 0 ? entry.slice(0, separatorIndex) : entry;
      if (rawName !== encodedName) {
        continue;
      }

      const rawValue = separatorIndex >= 0 ? entry.slice(separatorIndex + 1) : '';
      return this.decode(rawValue);
    }

    return null;
  }

  set(name: string, value: string, options?: CookieOptions): void {
    const normalizedOptions: Required<Pick<CookieOptions, 'path' | 'sameSite'>> & CookieOptions = {
      path: options?.path ?? '/',
      sameSite: options?.sameSite ?? 'Lax',
      days: options?.days,
      secure: options?.secure ?? this.document.location.protocol === 'https:'
    };

    const segments: string[] = [this.encode(name) + '=' + this.encode(value)];
    if (typeof normalizedOptions.days === 'number') {
      const expires = new Date(Date.now() + normalizedOptions.days * 24 * 60 * 60 * 1000);
      segments.push('Expires=' + expires.toUTCString());
    }

    segments.push('Path=' + normalizedOptions.path);
    segments.push('SameSite=' + normalizedOptions.sameSite);
    if (normalizedOptions.secure) {
      segments.push('Secure');
    }

    this.document.cookie = segments.join('; ');
  }

  remove(name: string, path = '/'): void {
    this.document.cookie = this.encode(name) + '=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=' + path + '; SameSite=Lax';
  }

  private encode(value: string): string {
    return encodeURIComponent(value);
  }

  private decode(value: string): string {
    return decodeURIComponent(value);
  }
}
