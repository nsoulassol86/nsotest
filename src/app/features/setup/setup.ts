import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MediaStateService } from '../../core/services/media-state.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [LoadingSpinnerComponent],
  templateUrl: './setup.html',
  styleUrl: './setup.scss',
})
export class SetupComponent {
  private readonly router = inject(Router);
  protected readonly state = inject(MediaStateService);

  protected readonly m3uUrl = signal('');

  protected onSubmit(): void {
    const url = this.m3uUrl().trim();
    if (!url) return;

    this.state.loadPlaylist(url);

    // Watch for successful load
    const checkLoaded = setInterval(() => {
      if (this.state.hasContent()) {
        clearInterval(checkLoaded);
        this.router.navigate(['/browse']);
      }
      if (this.state.error()) {
        clearInterval(checkLoaded);
      }
    }, 100);
  }

  protected onUrlChange(value: string): void {
    this.m3uUrl.set(value);
    if (this.state.error()) {
      this.state.error.set(null);
    }
  }
}
