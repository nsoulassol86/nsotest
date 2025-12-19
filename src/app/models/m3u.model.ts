/**
 * Raw parsed entry from M3U file
 */
export interface M3URawEntry {
  extinf: string;
  tvgLogo: string | null;
  tvgName: string | null;
  groupTitle: string | null;
  tvgId: string | null;
  duration: number;
  title: string;
  url: string;
}

/**
 * Parsed M3U playlist
 */
export interface M3UPlaylist {
  entries: M3URawEntry[];
  headers: Map<string, string>;
  parseDate: Date;
  sourceUrl: string;
}
