import { Component, inject, input, computed } from '@angular/core';
import { Router } from '@angular/router';
import { MediaStateService } from '../../core/services/media-state.service';
import { HeaderComponent } from '../../shared/components/header/header';
import { MediaCardComponent } from '../../shared/components/media-card/media-card';
import { MediaItem, MediaType } from '../../models';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [HeaderComponent, MediaCardComponent],
  templateUrl: './category.html',
  styleUrl: './category.scss',
})
export class CategoryComponent {
  private readonly router = inject(Router);
  protected readonly state = inject(MediaStateService);

  readonly type = input<string>('series');
  readonly categoryId = input<string>('');

  protected readonly category = computed(() => {
    const mediaType = this.type() as MediaType;
    const catId = this.categoryId();
    const section = this.state.sections().find((s) => s.type === mediaType);
    return section?.categories.find((c) => c.id === catId) || null;
  });

  protected onItemClick(item: MediaItem): void {
    this.router.navigate(['/detail', item.type, item.id]);
  }

  protected onPlayClick(item: MediaItem): void {
    this.state.playItem(item);
  }

  protected goBack(): void {
    this.router.navigate(['/browse', this.type()]);
  }
}
