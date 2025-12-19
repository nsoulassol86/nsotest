import { Component, input, output, signal, computed, ElementRef, viewChild, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MediaItem } from '../../../models';
import { MediaCardComponent } from '../media-card/media-card';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [MediaCardComponent, RouterLink],
  templateUrl: './carousel.html',
  styleUrl: './carousel.scss',
})
export class CarouselComponent {
  readonly title = input.required<string>();
  readonly items = input.required<MediaItem[]>();
  readonly showAllLink = input<string | null>(null);
  readonly pageSize = input<number>(20);
  readonly showEpisodeInfo = input(true);

  readonly itemClick = output<MediaItem>();
  readonly playClick = output<MediaItem>();

  protected readonly scrollPosition = signal(0);
  protected readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('container');
  protected readonly visibleCount = signal(20);

  // Items visibles (chargement progressif)
  protected readonly visibleItems = computed(() => {
    return this.items().slice(0, this.visibleCount());
  });

  // Y a-t-il plus d'items à charger?
  protected readonly hasMore = computed(() => {
    return this.visibleCount() < this.items().length;
  });

  protected readonly canScrollLeft = computed(() => this.scrollPosition() > 0);

  protected readonly canScrollRight = computed(() => {
    const container = this.containerRef()?.nativeElement;
    if (!container) return true;
    return this.scrollPosition() < container.scrollWidth - container.clientWidth - 10;
  });

  constructor() {
    // Reset visibleCount when items change
    effect(() => {
      this.items(); // Track items
      this.visibleCount.set(this.pageSize());
    });
  }

  protected scroll(direction: 'left' | 'right'): void {
    const container = this.containerRef()?.nativeElement;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    const newPosition =
      direction === 'left'
        ? Math.max(0, this.scrollPosition() - scrollAmount)
        : this.scrollPosition() + scrollAmount;

    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    this.scrollPosition.set(newPosition);
  }

  protected onScroll(): void {
    const container = this.containerRef()?.nativeElement;
    if (container) {
      this.scrollPosition.set(container.scrollLeft);
      this.checkLoadMore(container);
    }
  }

  private checkLoadMore(container: HTMLElement): void {
    // Charger plus quand on approche de la fin (200px avant)
    const scrollEnd = container.scrollWidth - container.clientWidth;
    const threshold = 200;

    if (container.scrollLeft >= scrollEnd - threshold && this.hasMore()) {
      this.loadMore();
    }
  }

  private loadMore(): void {
    const newCount = Math.min(
      this.visibleCount() + this.pageSize(),
      this.items().length
    );
    this.visibleCount.set(newCount);
  }

  protected onItemClick(item: MediaItem): void {
    this.itemClick.emit(item);
  }

  protected onPlayClick(item: MediaItem): void {
    this.playClick.emit(item);
  }
}
