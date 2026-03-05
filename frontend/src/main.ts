import { APP_INITIALIZER } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { AppConfigService } from './app/config/app-config.service';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { routes } from './app/app.routes';

function initializeAppConfig(appConfigService: AppConfigService): () => Promise<void> {
  return () => appConfigService.load();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAppConfig,
      deps: [AppConfigService],
      multi: true
    }
  ]
}).catch((error: unknown) => {
  console.error(error);
});
