import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';

interface TVMazeShow {
  image?: {
    medium?: string;
    original?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ImageFallbackService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, string | null>();

  /**
   * Recherche une image de fallback pour une série ou un film
   */
  findImage(title: string, type: 'series' | 'film' | 'tv'): Observable<string | null> {
    const cleanTitle = this.cleanTitle(title);

    // Retourner du cache si disponible
    if (this.cache.has(cleanTitle)) {
      return of(this.cache.get(cleanTitle) ?? null);
    }

    if (type === 'series' || type === 'tv') {
      return this.searchTVMaze(cleanTitle).pipe(
        map((url) => {
          this.cache.set(cleanTitle, url);
          return url;
        })
      );
    }

    return of(null);
  }

  /**
   * Recherche sur TVMaze (gratuit, sans clé API)
   */
  private searchTVMaze(title: string): Observable<string | null> {
    const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`;

    return this.http.get<TVMazeShow>(url).pipe(
      map((show) => {
        if (show?.image?.original) {
          return show.image.original;
        }
        if (show?.image?.medium) {
          return show.image.medium;
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Nettoie le titre pour améliorer la recherche
   */
  private cleanTitle(title: string): string {
    return (
      title
        // Enlever les patterns S01E01, S01 E01, etc.
        .replace(/\s*S\d+\s*E?\d*\s*/gi, '')
        // Enlever les années entre parenthèses
        .replace(/\s*\(\d{4}\)\s*/g, '')
        // Enlever les suffixes courants
        .replace(/\s*-?\s*(vostfr|vf|fr|en|multi)\s*/gi, '')
        // Nettoyer les espaces multiples
        .replace(/\s+/g, ' ')
        .trim()
    );
  }
}
