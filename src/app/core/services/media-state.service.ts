import { Injectable, inject, signal, computed } from '@angular/core';
import { M3UParserService } from './m3u-parser.service';
import { StorageService } from './storage.service';
import { MediaItem, MediaType, Category, NavigationSection, Series, Season } from '../../models';
import { M3UPlaylist, M3URawEntry } from '../../models';

@Injectable({ providedIn: 'root' })
export class MediaStateService {
  private readonly parser = inject(M3UParserService);
  private readonly storage = inject(StorageService);

  // Core state signals
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly m3uUrl = signal<string | null>(null);
  readonly playlist = signal<M3UPlaylist | null>(null);

  // Processed media signals
  readonly mediaItems = signal<MediaItem[]>([]);
  readonly sections = signal<NavigationSection[]>([]);

  // UI state signals
  readonly currentSection = signal<MediaType | null>(null);
  readonly currentCategory = signal<string | null>(null);
  readonly selectedItem = signal<MediaItem | null>(null);
  readonly isPlayerVisible = signal(false);

  // Computed signals
  readonly hasContent = computed(() => this.mediaItems().length > 0);

  readonly currentSectionData = computed(() => {
    const section = this.currentSection();
    return this.sections().find((s) => s.type === section) || null;
  });

  readonly currentCategoryItems = computed(() => {
    const section = this.currentSectionData();
    const category = this.currentCategory();
    if (!section || !category) return [];

    const cat = section.categories.find((c) => c.id === category);
    return cat?.items || [];
  });

  readonly seriesMap = computed(() => {
    const items = this.mediaItems().filter((i) => i.type === 'series');
    return this.groupIntoSeries(items);
  });

  /**
   * Initialize from saved URL
   */
  initialize(): void {
    const savedUrl = this.storage.getM3uUrl();
    if (savedUrl) {
      this.m3uUrl.set(savedUrl);
    }
  }

  /**
   * Load and process M3U playlist
   */
  loadPlaylist(url: string): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.m3uUrl.set(url);
    this.storage.saveM3uUrl(url);

    this.parser.parseFromUrl(url).subscribe({
      next: (playlist) => {
        this.playlist.set(playlist);
        this.processPlaylist(playlist);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Process M3U entries into organized media items
   */
  private processPlaylist(playlist: M3UPlaylist): void {
    const items = playlist.entries.map((entry, index) => this.convertToMediaItem(entry, index));

    this.mediaItems.set(items);
    this.sections.set(this.organizeIntoSections(items));

    if (this.sections().length > 0) {
      this.currentSection.set(this.sections()[0].type);
    }
  }

  /**
   * Convert M3U entry to MediaItem
   */
  private convertToMediaItem(entry: M3URawEntry, index: number): MediaItem {
    const type = this.detectMediaType(entry);
    const seriesInfo = type === 'series' ? this.parseSeriesInfo(entry) : null;

    return {
      id: `media-${index}`,
      title: entry.tvgName || entry.title,
      thumbnail: entry.tvgLogo || '',
      streamUrl: entry.url,
      type,
      category: entry.groupTitle || 'Uncategorized',
      seriesName: seriesInfo?.seriesName,
      seasonNumber: seriesInfo?.seasonNumber,
      episodeNumber: seriesInfo?.episodeNumber,
      episodeTitle: seriesInfo?.episodeTitle,
    };
  }

  /**
   * Detect media type from group-title
   */
  private detectMediaType(entry: M3URawEntry): MediaType {
    const group = (entry.groupTitle || '').toLowerCase();

    // Séries : contient "series", "série", "tv show"
    if (group.includes('series') || group.includes('série') || group.includes('tv show')) {
      return 'series';
    }

    // Films : contient "film", "movie", "vod" ou se termine par " fr" (ex: "ACTION FR", "COMEDIE FR")
    if (group.includes('film') || group.includes('movie') || group.includes('vod')) {
      return 'film';
    }

    // Détection films par pattern " FR" à la fin (ex: "ACTION FR", "NOUVEAUTES FR 2025")
    // Mais pas si c'est une chaîne TV (contient "tv", "channel", "live", "chaine")
    if (/\bfr\b/i.test(group) && !this.isTvChannel(group)) {
      return 'film';
    }

    return 'tv';
  }

  /**
   * Check if group-title indicates a TV channel
   */
  private isTvChannel(group: string): boolean {
    const tvKeywords = [
      'tv',
      'channel',
      'live',
      'chaine',
      'chaîne',
      'direct',
      '24/7',
      'news',
      'sport',
      'ligue',
      'football',
      'box office',
      'netflix',
      'amazon',
      'prime',
      'disney',
      'canal',
      'ocs',
      'bein',
      'rmc',
      'eurosport',
      'paramount',
      'apple',
    ];
    return tvKeywords.some((keyword) => group.includes(keyword));
  }

  /**
   * Parse series/season/episode info from title
   */
  private parseSeriesInfo(
    entry: M3URawEntry
  ): { seriesName: string; seasonNumber: number; episodeNumber: number; episodeTitle?: string } | null {
    const title = entry.tvgName || entry.title;

    // Common patterns:
    // "Game of Thrones (2011) S01 E01" - with space between S and E
    // "Show Name S01E05" - no space
    // "Show Name - Season 1 Episode 5"
    const pattern1 = /^(.+?)\s*S(\d+)\s*E(\d+)\s*(.*)$/i;
    const pattern2 = /^(.+?)\s*-?\s*Season\s*(\d+)\s*Episode\s*(\d+)\s*(.*)$/i;
    const pattern3 = /^(.+?)\s*-?\s*Saison\s*(\d+)\s*[EÉ]pisode\s*(\d+)\s*(.*)$/i;

    const match = title.match(pattern1) || title.match(pattern2) || title.match(pattern3);

    if (match) {
      return {
        seriesName: match[1].trim(),
        seasonNumber: parseInt(match[2], 10),
        episodeNumber: parseInt(match[3], 10),
        episodeTitle: match[4]?.trim() || undefined,
      };
    }

    return null;
  }

  /**
   * Organize items into navigation sections
   * For series: group by series name (one thumbnail per series)
   */
  private organizeIntoSections(items: MediaItem[]): NavigationSection[] {
    const typeLabels: Record<MediaType, string> = {
      series: 'Séries',
      film: 'Films',
      tv: 'TV',
    };

    const sections: NavigationSection[] = [];

    for (const type of ['series', 'film', 'tv'] as MediaType[]) {
      const typeItems = items.filter((i) => i.type === type);
      if (typeItems.length === 0) continue;

      const categoriesMap = new Map<string, MediaItem[]>();

      for (const item of typeItems) {
        const existing = categoriesMap.get(item.category) || [];
        existing.push(item);
        categoriesMap.set(item.category, existing);
      }

      const categories: Category[] = Array.from(categoriesMap.entries()).map(([name, catItems]) => {
        // For series: deduplicate by series name
        let displayItems: MediaItem[];
        if (type === 'series') {
          displayItems = this.deduplicateSeries(catItems);
        } else {
          displayItems = catItems;
        }

        return {
          id: this.slugify(name),
          name,
          type,
          items: displayItems, // All items - carousel handles pagination
          itemCount: displayItems.length,
        };
      });

      sections.push({
        type,
        label: typeLabels[type],
        categories,
      });
    }

    return sections;
  }

  /**
   * Deduplicate series items - keep only one item per series
   */
  private deduplicateSeries(items: MediaItem[]): MediaItem[] {
    const seriesMap = new Map<string, MediaItem>();

    for (const item of items) {
      const seriesKey = item.seriesName || item.title;

      if (!seriesMap.has(seriesKey)) {
        // Create a representative item for the series
        seriesMap.set(seriesKey, {
          ...item,
          title: item.seriesName || item.title, // Use series name as title
        });
      }
    }

    return Array.from(seriesMap.values());
  }

  /**
   * Group series items into Series/Season/Episode hierarchy
   */
  private groupIntoSeries(items: MediaItem[]): Map<string, Series> {
    const seriesMap = new Map<string, Series>();

    for (const item of items) {
      if (!item.seriesName) continue;

      const seriesId = this.slugify(item.seriesName);

      if (!seriesMap.has(seriesId)) {
        seriesMap.set(seriesId, {
          id: seriesId,
          name: item.seriesName,
          thumbnail: item.thumbnail,
          category: item.category,
          seasons: [],
        });
      }

      const series = seriesMap.get(seriesId)!;
      const seasonNum = item.seasonNumber || 1;

      let season: Season | undefined = series.seasons.find((s) => s.number === seasonNum);
      if (!season) {
        season = { number: seasonNum, episodes: [] };
        series.seasons.push(season);
      }

      season.episodes.push({
        number: item.episodeNumber || season.episodes.length + 1,
        title: item.episodeTitle || item.title,
        thumbnail: item.thumbnail,
        streamUrl: item.streamUrl,
      });
    }

    // Sort seasons and episodes
    for (const series of seriesMap.values()) {
      series.seasons.sort((a, b) => a.number - b.number);
      for (const season of series.seasons) {
        season.episodes.sort((a, b) => a.number - b.number);
      }
    }

    return seriesMap;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Public actions
  setSection(type: MediaType): void {
    this.currentSection.set(type);
    this.currentCategory.set(null);
  }

  setCategory(categoryId: string): void {
    this.currentCategory.set(categoryId);
  }

  selectItem(item: MediaItem): void {
    this.selectedItem.set(item);
  }

  playItem(item: MediaItem): void {
    this.selectedItem.set(item);
    this.isPlayerVisible.set(true);
    this.storage.saveLastPlayed(item.id);
  }

  closePlayer(): void {
    this.isPlayerVisible.set(false);
  }

  clearUrl(): void {
    this.storage.clearM3uUrl();
    this.m3uUrl.set(null);
    this.playlist.set(null);
    this.mediaItems.set([]);
    this.sections.set([]);
  }

  getItemById(id: string): MediaItem | undefined {
    return this.mediaItems().find((item) => item.id === id);
  }

  getSeriesById(id: string): Series | undefined {
    return this.seriesMap().get(id);
  }
}
