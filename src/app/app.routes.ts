import { Routes } from '@angular/router';
import { m3uLoadedGuard } from './core/guards/m3u-loaded.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'setup',
    pathMatch: 'full',
  },
  {
    path: 'setup',
    loadComponent: () => import('./features/setup/setup').then((m) => m.SetupComponent),
    title: 'IPTV - Configuration',
  },
  {
    path: 'browse',
    canActivate: [m3uLoadedGuard],
    children: [
      {
        path: '',
        redirectTo: 'series',
        pathMatch: 'full',
      },
      {
        path: ':type',
        loadComponent: () => import('./features/browse/browse').then((m) => m.BrowseComponent),
        title: 'IPTV - Parcourir',
      },
    ],
  },
  {
    path: 'category/:type/:categoryId',
    canActivate: [m3uLoadedGuard],
    loadComponent: () => import('./features/category/category').then((m) => m.CategoryComponent),
    title: 'IPTV - Catégorie',
  },
  {
    path: 'detail/:type/:id',
    canActivate: [m3uLoadedGuard],
    loadComponent: () => import('./features/detail/detail').then((m) => m.DetailComponent),
    title: 'IPTV - Détails',
  },
  {
    path: 'watch/:id',
    canActivate: [m3uLoadedGuard],
    loadComponent: () => import('./features/detail/detail').then((m) => m.DetailComponent),
    data: { autoplay: true },
    title: 'IPTV - Lecture',
  },
  {
    path: '**',
    redirectTo: 'setup',
  },
];
