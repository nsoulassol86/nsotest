import {
  Component,
  input,
  output,
  signal,
  computed,
  ElementRef,
  viewChild,
  OnDestroy,
  effect,
  HostListener,
} from '@angular/core';
import Hls from 'hls.js';

@Component({
  selector: 'app-video-player',
  standalone: true,
  templateUrl: './video-player.html',
  styleUrl: './video-player.scss',
})
export class VideoPlayerComponent implements OnDestroy {
  readonly streamUrl = input.required<string>();
  readonly title = input<string>('');
  readonly autoplay = input(true);

  readonly close = output<void>();
  readonly error = output<string>();

  protected readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoElement');

  protected readonly isPlaying = signal(false);
  protected readonly isFullscreen = signal(false);
  protected readonly currentTime = signal(0);
  protected readonly duration = signal(0);
  protected readonly volume = signal(1);
  protected readonly isMuted = signal(false);
  protected readonly isBuffering = signal(true);
  protected readonly showControls = signal(true);
  protected readonly hasError = signal(false);

  private controlsTimeout: ReturnType<typeof setTimeout> | null = null;
  private hls: Hls | null = null;

  protected readonly progress = computed(() => {
    const dur = this.duration();
    return dur > 0 ? (this.currentTime() / dur) * 100 : 0;
  });

  protected readonly formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));

  protected readonly formattedDuration = computed(() => this.formatTime(this.duration()));

  constructor() {
    effect(() => {
      const url = this.streamUrl();
      if (url) {
        this.setupPlayer(url);
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    switch (event.key) {
      case ' ':
        event.preventDefault();
        this.togglePlay();
        break;
      case 'ArrowLeft':
        this.seek(-10);
        break;
      case 'ArrowRight':
        this.seek(10);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.adjustVolume(0.1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.adjustVolume(-0.1);
        break;
      case 'm':
      case 'M':
        this.toggleMute();
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      case 'Escape':
        if (this.isFullscreen()) {
          this.toggleFullscreen();
        } else {
          this.onClose();
        }
        break;
    }
  }

  private setupPlayer(url: string): void {
    this.cleanupHls();
    this.hasError.set(false);
    this.isBuffering.set(true);

    // Wait for view to be ready
    setTimeout(() => {
      const video = this.videoRef()?.nativeElement;
      if (!video) return;

      if (this.isHlsStream(url)) {
        this.setupHls(video, url);
      } else {
        video.src = url;
        if (this.autoplay()) {
          this.startPlayback(video);
        }
      }
    }, 0);
  }

  private isHlsStream(url: string): boolean {
    return url.includes('.m3u8') || url.includes('m3u8');
  }

  private setupHls(video: HTMLVideoElement, url: string): void {
    if (Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      this.hls.loadSource(url);
      this.hls.attachMedia(video);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (this.autoplay()) {
          this.startPlayback(video);
        }
      });

      this.hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              this.hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              this.hls?.recoverMediaError();
              break;
            default:
              this.hasError.set(true);
              this.error.emit(`Erreur de lecture: ${data.details}`);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      if (this.autoplay()) {
        this.startPlayback(video);
      }
    } else {
      this.hasError.set(true);
      this.error.emit('HLS non supporté sur ce navigateur');
    }
  }

  private startPlayback(video: HTMLVideoElement): void {
    video.play().catch(() => {
      this.isPlaying.set(false);
    });
  }

  private cleanupHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  protected togglePlay(): void {
    const video = this.videoRef()?.nativeElement;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  protected onPlay(): void {
    this.isPlaying.set(true);
  }

  protected onPause(): void {
    this.isPlaying.set(false);
  }

  protected onTimeUpdate(): void {
    const video = this.videoRef()?.nativeElement;
    if (video) {
      this.currentTime.set(video.currentTime);
    }
  }

  protected onLoadedMetadata(): void {
    const video = this.videoRef()?.nativeElement;
    if (video) {
      this.duration.set(video.duration);
      this.isBuffering.set(false);
    }
  }

  protected onWaiting(): void {
    this.isBuffering.set(true);
  }

  protected onCanPlay(): void {
    this.isBuffering.set(false);
  }

  protected onVideoError(): void {
    this.hasError.set(true);
    this.error.emit('Erreur lors du chargement de la vidéo');
  }

  protected seekTo(event: MouseEvent, progressBar: HTMLElement): void {
    const video = this.videoRef()?.nativeElement;
    if (!video || !this.duration()) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    video.currentTime = percent * this.duration();
  }

  private seek(seconds: number): void {
    const video = this.videoRef()?.nativeElement;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, this.duration()));
    }
  }

  protected toggleMute(): void {
    const video = this.videoRef()?.nativeElement;
    if (video) {
      video.muted = !video.muted;
      this.isMuted.set(video.muted);
    }
  }

  private adjustVolume(delta: number): void {
    const video = this.videoRef()?.nativeElement;
    if (video) {
      video.volume = Math.max(0, Math.min(1, video.volume + delta));
      this.volume.set(video.volume);
      if (video.volume > 0 && video.muted) {
        video.muted = false;
        this.isMuted.set(false);
      }
    }
  }

  protected onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const video = this.videoRef()?.nativeElement;
    if (video) {
      video.volume = parseFloat(input.value);
      this.volume.set(video.volume);
    }
  }

  protected toggleFullscreen(): void {
    const container = this.videoRef()?.nativeElement?.closest('.player-wrapper') as HTMLElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        this.isFullscreen.set(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen.set(false);
      });
    }
  }

  protected onMouseMove(): void {
    this.showControls.set(true);

    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }

    this.controlsTimeout = setTimeout(() => {
      if (this.isPlaying()) {
        this.showControls.set(false);
      }
    }, 3000);
  }

  protected onClose(): void {
    this.close.emit();
  }

  private formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.cleanupHls();
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
  }
}
