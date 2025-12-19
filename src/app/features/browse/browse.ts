import { Component, inject, input, effect } from '@angular/core';
import { Router } from '@angular/router';
import { MediaStateService } from '../../core/services/media-state.service';
import { HeaderComponent } from '../../shared/components/header/header';
import { CarouselComponent } from '../../shared/components/carousel/carousel';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner';
import { MediaItem, MediaType } from '../../models';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [HeaderComponent, CarouselComponent, LoadingSpinnerComponent],
  templateUrl: './browse.html',
  styleUrl: './browse.scss',
})
export class BrowseComponent {
  private readonly router = inject(Router);
  protected readonly state = inject(MediaStateService);

  readonly type = input<string>('series');

  constructor() {
    effect(() => {
      const mediaType = this.type() as MediaType;
      if (['series', 'film', 'tv'].includes(mediaType)) {
        this.state.setSection(mediaType);
      }
    });
  }

  protected onItemClick(item: MediaItem): void {
    this.router.navigate(['/detail', item.type, item.id]);
  }

  protected onPlayClick(item: MediaItem): void {
    this.state.playItem(item);
  }

  protected getCategoryLink(categoryId: string): string {
    return `/category/${this.type()}/${categoryId}`;
  }
}
