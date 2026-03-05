import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { CollectionPageComponent } from './pages/collection-page.component';
import { HomePageComponent } from './pages/home-page.component';
import { PlayPageComponent } from './pages/play-page.component';
import { ResultsPageComponent } from './pages/results-page.component';
import { SignupPageComponent } from './pages/signup-page.component';
import { StorePageComponent } from './pages/store-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'signup', component: SignupPageComponent },
  { path: 'play', component: PlayPageComponent, canActivate: [authGuard] },
  { path: 'results', component: ResultsPageComponent, canActivate: [authGuard] },
  { path: 'collection', component: CollectionPageComponent, canActivate: [authGuard] },
  { path: 'store', component: StorePageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
