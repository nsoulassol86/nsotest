import { Injectable } from '@angular/core';

const STORAGE_KEYS = {
  M3U_URL: 'iptv_m3u_url',
  LAST_PLAYED: 'iptv_last_played',
} as const;

@Injectable({ providedIn: 'root' })
export class StorageService {
  saveM3uUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.M3U_URL, url);
  }

  getM3uUrl(): string | null {
    return localStorage.getItem(STORAGE_KEYS.M3U_URL);
  }

  clearM3uUrl(): void {
    localStorage.removeItem(STORAGE_KEYS.M3U_URL);
  }

  saveLastPlayed(itemId: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_PLAYED, itemId);
  }

  getLastPlayed(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_PLAYED);
  }
}
