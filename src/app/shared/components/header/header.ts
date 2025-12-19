import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MediaStateService } from '../../../core/services/media-state.service';
import { MediaType } from '../../../models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  protected readonly state = inject(MediaStateService);

  protected readonly navItems: { label: string; route: string; type: MediaType }[] = [
    { label: 'Séries', route: '/browse/series', type: 'series' },
    { label: 'Films', route: '/browse/film', type: 'film' },
    { label: 'TV', route: '/browse/tv', type: 'tv' },
  ];

  protected onNavClick(type: MediaType): void {
    this.state.setSection(type);
  }

  protected onSettingsClick(): void {
    this.state.clearUrl();
  }
}
