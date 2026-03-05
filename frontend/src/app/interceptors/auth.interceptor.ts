import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';

const AUTH_TOKEN_KEY = 'auth_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const appConfig = inject(AppConfigService);
  const apiBase = appConfig.apiBaseUrl;
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const isApiRequest = req.url.startsWith(`${apiBase}/api`);

  if (token && isApiRequest) {
    const authorizedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(authorizedRequest);
  }

  return next(req);
};