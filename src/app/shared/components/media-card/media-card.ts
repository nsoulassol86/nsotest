import { Component, input, output, signal, inject } from '@angular/core';
import { MediaItem } from '../../../models';
import { ImageFallbackService } from '../../../core/services/image-fallback.service';

@Component({
  selector: 'app-media-card',
  standalone: true,
  templateUrl: './media-card.html',
  styleUrl: './media-card.scss',
})
export class MediaCardComponent {
  private readonly imageFallback = inject(ImageFallbackService);

  readonly item = input.required<MediaItem>();
  readonly showPlayButton = input(true);
  readonly showEpisodeInfo = input(true);

  readonly cardClick = output<MediaItem>();
  readonly playClick = output<MediaItem>();

  protected readonly isHovered = signal(false);
  protected readonly imageLoaded = signal(false);
  protected readonly imageError = signal(false);
  protected readonly fallbackUrl = signal<string | null>(null);
  protected readonly fallbackLoading = signal(false);

  protected onImageLoad(): void {
    this.imageLoaded.set(true);
  }

  protected onImageError(): void {
    // Si c'est l'image de fallback qui échoue, afficher le placeholder
    if (this.fallbackUrl()) {
      this.imageError.set(true);
      return;
    }

    // Chercher une image de fallback
    if (!this.fallbackLoading()) {
      this.loadFallbackImage();
    } else {
      this.imageError.set(true);
    }
  }

  private loadFallbackImage(): void {
    this.fallbackLoading.set(true);
    const mediaItem = this.item();
    const title = mediaItem.seriesName || mediaItem.title;

    this.imageFallback.findImage(title, mediaItem.type).subscribe({
      next: (url) => {
        if (url) {
          this.fallbackUrl.set(url);
        } else {
          this.imageError.set(true);
        }
        this.fallbackLoading.set(false);
      },
      error: () => {
        this.imageError.set(true);
        this.fallbackLoading.set(false);
      },
    });
  }

  protected onClick(): void {
    this.cardClick.emit(this.item());
  }

  protected onPlay(event: Event): void {
    event.stopPropagation();
    this.playClick.emit(this.item());
  }

  protected onMouseEnter(): void {
    this.isHovered.set(true);
  }

  protected onMouseLeave(): void {
    this.isHovered.set(false);
  }
}
