import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { AchievementsPageComponent } from './pages/achievements-page.component';
import { FeedbackPageComponent } from './pages/feedback-page.component';
import { HomePageComponent } from './pages/home-page.component';
import { PlayPageComponent } from './pages/play-page.component';
import { SignupPageComponent } from './pages/signup-page.component';
import { StickersPageComponent } from './pages/stickers-page.component';
import { StorePageComponent } from './pages/store-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'signup', component: SignupPageComponent },
  { path: 'play', component: PlayPageComponent, canActivate: [authGuard] },
  { path: 'achievements', component: AchievementsPageComponent, canActivate: [authGuard] },
  { path: 'stickers', component: StickersPageComponent, canActivate: [authGuard] },
  { path: 'feedback', component: FeedbackPageComponent, canActivate: [authGuard] },
  { path: 'collection', redirectTo: 'achievements' },
  { path: 'store', component: StorePageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
