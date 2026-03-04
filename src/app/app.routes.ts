import { Routes } from '@angular/router';
import { CollectionPageComponent } from './pages/collection-page.component';
import { HomePageComponent } from './pages/home-page.component';
import { PlayPageComponent } from './pages/play-page.component';
import { ResultsPageComponent } from './pages/results-page.component';
import { StorePageComponent } from './pages/store-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'play', component: PlayPageComponent },
  { path: 'results', component: ResultsPageComponent },
  { path: 'collection', component: CollectionPageComponent },
  { path: 'store', component: StorePageComponent },
  { path: '**', redirectTo: '' }
];
