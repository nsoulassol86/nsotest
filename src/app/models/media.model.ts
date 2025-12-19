/**
 * Content type enumeration
 */
export type MediaType = 'series' | 'film' | 'tv';

/**
 * Processed media item for display
 */
export interface MediaItem {
  id: string;
  title: string;
  thumbnail: string;
  streamUrl: string;
  type: MediaType;
  category: string;
  description?: string;
  seriesName?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
}

/**
 * Series aggregate with seasons and episodes
 */
export interface Series {
  id: string;
  name: string;
  thumbnail: string;
  category: string;
  seasons: Season[];
}

export interface Season {
  number: number;
  episodes: Episode[];
}

export interface Episode {
  number: number;
  title: string;
  thumbnail: string;
  streamUrl: string;
  duration?: number;
}

/**
 * Category grouping for navigation
 */
export interface Category {
  id: string;
  name: string;
  type: MediaType;
  items: MediaItem[];
  itemCount: number;
}

/**
 * Navigation section (Series, Films, TV)
 */
export interface NavigationSection {
  type: MediaType;
  label: string;
  categories: Category[];
}
