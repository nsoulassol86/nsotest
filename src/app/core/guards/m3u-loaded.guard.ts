import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MediaStateService } from '../services/media-state.service';
import { StorageService } from '../services/storage.service';

export const m3uLoadedGuard: CanActivateFn = () => {
  const state = inject(MediaStateService);
  const storage = inject(StorageService);
  const router = inject(Router);

  if (state.hasContent()) {
    return true;
  }

  const savedUrl = storage.getM3uUrl();
  if (savedUrl && !state.m3uUrl()) {
    state.loadPlaylist(savedUrl);
    return true;
  }

  return router.createUrlTree(['/setup']);
};
