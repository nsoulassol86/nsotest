import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { M3URawEntry, M3UPlaylist } from '../../models';

@Injectable({ providedIn: 'root' })
export class M3UParserService {
  private readonly http = inject(HttpClient);

  /**
   * Fetch and parse M3U playlist from URL
   */
  parseFromUrl(url: string): Observable<M3UPlaylist> {
    // Utiliser un proxy CORS pour les URLs HTTP sur un site HTTPS
    const fetchUrl = this.getProxiedUrl(url);

    return this.http.get(fetchUrl, { responseType: 'text' }).pipe(
      map((content) => {
        // Debug: afficher les premiers caractères pour voir ce qu'on reçoit
        return this.parseContent(content, url);
      }),
      catchError((error) => throwError(() => new Error(`Failed to load M3U: ${error.message}`)))
    );
  }

  /**
   * Proxy HTTP URLs through CORS proxy to avoid CORS and mixed content errors
   */
  private getProxiedUrl(url: string): string {
    const isHttpUrl = url.startsWith('http://');
    const isLocalhost = window.location.hostname === 'localhost';

    if (!isHttpUrl) {
      return url;
    }

    // En dev local, utiliser notre serveur Express
    if (isLocalhost) {
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }

    // En prod, utiliser un proxy CORS public (requête depuis le navigateur)
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  }

  /**
   * Parse M3U content string
   */
  parseContent(content: string, sourceUrl: string): M3UPlaylist {
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines[0]?.startsWith('#EXTM3U')) {
      throw new Error('Invalid M3U file: Missing #EXTM3U header');
    }

    const headers = this.parseExtM3UHeader(lines[0]);
    const entries: M3URawEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF:')) {
        const extinfLine = lines[i];
        const urlLine = lines[i + 1];

        if (urlLine && !urlLine.startsWith('#')) {
          entries.push(this.parseExtinf(extinfLine, urlLine));
          i++;
        }
      }
    }

    return {
      entries,
      headers,
      parseDate: new Date(),
      sourceUrl,
    };
  }

  /**
   * Parse #EXTINF line with attributes
   */
  private parseExtinf(extinfLine: string, url: string): M3URawEntry {
    const durationMatch = extinfLine.match(/#EXTINF:(-?\d+)/);
    const duration = durationMatch ? parseInt(durationMatch[1], 10) : -1;

    const tvgLogo = this.extractAttribute(extinfLine, 'tvg-logo');

    const tvgName = this.extractAttribute(extinfLine, 'tvg-name');
    const groupTitle = this.extractAttribute(extinfLine, 'group-title');
    const tvgId = this.extractAttribute(extinfLine, 'tvg-id');

    const titleMatch = extinfLine.match(/,([^,]+)$/);
    const title = titleMatch ? titleMatch[1].trim() : tvgName || 'Unknown';

    return {
      extinf: extinfLine,
      tvgLogo,
      tvgName,
      groupTitle,
      tvgId,
      duration,
      title,
      url,
    };
  }

  /**
   * Extract attribute value from EXTINF line
   */
  private extractAttribute(line: string, attr: string): string | null {
    const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
    const match = line.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Parse #EXTM3U header attributes
   */
  private parseExtM3UHeader(headerLine: string): Map<string, string> {
    const headers = new Map<string, string>();
    const attrRegex = /(\w+)="([^"]*)"/g;
    let match;

    while ((match = attrRegex.exec(headerLine)) !== null) {
      headers.set(match[1], match[2]);
    }

    return headers;
  }
}
