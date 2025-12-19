import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError, from, switchMap } from 'rxjs';
import { M3URawEntry, M3UPlaylist } from '../../models';

@Injectable({ providedIn: 'root' })
export class M3UParserService {
  private readonly http = inject(HttpClient);

  // Liste de proxies CORS à essayer
  private readonly corsProxies = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://proxy.cors.sh/${url}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  /**
   * Fetch and parse M3U playlist from URL
   */
  parseFromUrl(url: string): Observable<M3UPlaylist> {
    const isHttpUrl = url.startsWith('http://');
    const isLocalhost = window.location.hostname === 'localhost';

    // En dev local ou URL HTTPS, utiliser directement
    if (isLocalhost && isHttpUrl) {
      return this.fetchAndParse(`/api/proxy?url=${encodeURIComponent(url)}`, url);
    }

    if (!isHttpUrl) {
      return this.fetchAndParse(url, url);
    }

    // En prod avec URL HTTP, essayer les proxies CORS un par un
    return from(this.tryProxies(url)).pipe(
      switchMap((content) => {
        try {
          return [this.parseContent(content, url)];
        } catch (e) {
          throw e;
        }
      }),
      catchError((error) => throwError(() => new Error(`Failed to load M3U: ${error.message}`)))
    );
  }

  private fetchAndParse(fetchUrl: string, originalUrl: string): Observable<M3UPlaylist> {
    return this.http.get(fetchUrl, { responseType: 'text' }).pipe(
      map((content) => this.parseContent(content, originalUrl)),
      catchError((error) => throwError(() => new Error(`Failed to load M3U: ${error.message}`)))
    );
  }

  /**
   * Try multiple CORS proxies until one works
   */
  private async tryProxies(url: string): Promise<string> {
    for (const proxyFn of this.corsProxies) {
      const proxyUrl = proxyFn(url);
      try {
        console.log('Trying proxy:', proxyUrl);
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const text = await response.text();
          // Vérifier que c'est bien un fichier M3U
          if (text.trim().startsWith('#EXTM3U')) {
            console.log('Success with proxy:', proxyUrl);
            return text;
          }
          console.log('Invalid M3U content from:', proxyUrl);
        } else {
          console.log('Proxy failed with status:', response.status);
        }
      } catch (e) {
        console.log('Proxy error:', e);
      }
    }
    throw new Error('All CORS proxies failed');
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
