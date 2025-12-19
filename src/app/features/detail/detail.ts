import { Component, inject, input, computed, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MediaStateService } from '../../core/services/media-state.service';
import { HeaderComponent } from '../../shared/components/header/header';
import { VideoPlayerComponent } from '../../shared/components/video-player/video-player';
import { MediaItem, Series, Season } from '../../models';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [HeaderComponent, VideoPlayerComponent],
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class DetailComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly state = inject(MediaStateService);

  readonly type = input<string>('');
  readonly id = input<string>('');

  protected readonly item = computed(() => this.state.getItemById(this.id()));

  protected readonly series = computed(() => {
    const mediaItem = this.item();
    if (!mediaItem?.seriesName) return null;
    const seriesId = this.slugify(mediaItem.seriesName);
    return this.state.getSeriesById(seriesId) || null;
  });

  protected readonly selectedSeason = signal<number>(1);

  protected readonly currentSeasonEpisodes = computed(() => {
    const s = this.series();
    if (!s) return [];
    const season = s.seasons.find((season) => season.number === this.selectedSeason());
    return season?.episodes || [];
  });

  ngOnInit(): void {
    const autoplay = this.route.snapshot.data['autoplay'];
    if (autoplay) {
      const mediaItem = this.item();
      if (mediaItem) {
        this.state.playItem(mediaItem);
      }
    }
  }

  protected onPlay(): void {
    const mediaItem = this.item();
    if (mediaItem) {
      this.state.playItem(mediaItem);
    }
  }

  protected onPlayEpisode(streamUrl: string): void {
    const mediaItem = this.item();
    if (mediaItem) {
      this.state.playItem({ ...mediaItem, streamUrl });
    }
  }

  protected onSeasonChange(seasonNumber: number): void {
    this.selectedSeason.set(seasonNumber);
  }

  protected goBack(): void {
    const mediaItem = this.item();
    if (mediaItem) {
      this.router.navigate(['/browse', mediaItem.type]);
    } else {
      this.router.navigate(['/browse']);
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
