/* player.js – audio engine */
const Player = {
  audio: null,
  currentSong: null,
  queue: [],
  queueIndex: 0,
  isShuffled: false,
  repeatMode: 'none', // 'none' | 'one' | 'all'
  isMuted: false,
  lastVolume: 0.8,

  init() {
    this.audio = document.getElementById('audio-element');

    this.audio.addEventListener('timeupdate', () => this._onTimeUpdate());
    this.audio.addEventListener('ended', () => this._onEnded());
    this.audio.addEventListener('loadedmetadata', () => this._onMetadata());

    // Progress slider
    const slider = document.getElementById('progress-slider');
    slider.addEventListener('input', () => {
      this.seek(parseFloat(slider.value));
    });

    // Volume
    const volSlider = document.getElementById('volume-slider');
    volSlider.value = 80;
    this.audio.volume = 0.8;
    volSlider.addEventListener('input', () => {
      this.setVolume(parseInt(volSlider.value) / 100);
    });

    // Controls
    document.getElementById('btn-play-pause').addEventListener('click', () => this.togglePlay());
    document.getElementById('btn-prev').addEventListener('click', () => this.prev());
    document.getElementById('btn-next').addEventListener('click', () => this.next());
    document.getElementById('btn-shuffle').addEventListener('click', () => this.toggleShuffle());
    document.getElementById('btn-repeat').addEventListener('click', () => this.cycleRepeat());
    document.getElementById('btn-volume').addEventListener('click', () => this.toggleMute());
  },

  setQueue(songs, startIndex = 0) {
    this.queue = [...songs];
    this.queueIndex = startIndex;
  },

  async play(song) {
    if (!song) return;
    this.currentSong = song;

    this.audio.src = song.file_path;
    this.audio.load();

    try {
      await this.audio.play();
      document.getElementById('btn-play-pause').textContent = '⏸';
    } catch (e) {
      console.warn('Playback error:', e);
    }

    // Record play
    API.playSong(song.id).then(updated => {
      // Update current song play count
      this.currentSong = { ...this.currentSong, plays: updated.plays };
      document.dispatchEvent(new CustomEvent('songPlayed', { detail: updated }));
    }).catch(() => {});

    // Update UI
    UI.updatePlayerBar(song);
    UI.renderNowPlaying(song);

    // Dynamic gradient
    if (song.cover_art) {
      this.extractDominantColor(song.cover_art).then(color => {
        this.updateGradient(color);
      });
    } else {
      this.updateGradient(null);
    }

    document.dispatchEvent(new CustomEvent('songchange', { detail: song }));
  },

  togglePlay() {
    if (!this.currentSong) return;
    if (this.audio.paused) {
      this.audio.play();
      document.getElementById('btn-play-pause').textContent = '⏸';
    } else {
      this.audio.pause();
      document.getElementById('btn-play-pause').textContent = '▶';
    }
  },

  next() {
    if (!this.queue.length) return;
    if (this.isShuffled) {
      this.queueIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      this.queueIndex = (this.queueIndex + 1) % this.queue.length;
    }
    this.play(this.queue[this.queueIndex]);
  },

  prev() {
    if (!this.queue.length) return;
    // If more than 3 seconds played, restart current
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    if (this.isShuffled) {
      this.queueIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      this.queueIndex = (this.queueIndex - 1 + this.queue.length) % this.queue.length;
    }
    this.play(this.queue[this.queueIndex]);
  },

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    const btn = document.getElementById('btn-shuffle');
    btn.classList.toggle('active', this.isShuffled);
  },

  cycleRepeat() {
    const modes = ['none', 'one', 'all'];
    const idx = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(idx + 1) % modes.length];
    const btn = document.getElementById('btn-repeat');
    btn.classList.toggle('active', this.repeatMode !== 'none');
    btn.title = `Repeat: ${this.repeatMode}`;
    if (this.repeatMode === 'one') btn.textContent = '↻¹';
    else btn.textContent = '↻';
  },

  seek(pct) {
    if (!this.audio.duration) return;
    this.audio.currentTime = (pct / 100) * this.audio.duration;
  },

  setVolume(v) {
    this.audio.volume = Math.max(0, Math.min(1, v));
    this.lastVolume = this.audio.volume;
    if (this.audio.volume === 0) {
      document.getElementById('btn-volume').textContent = '🔇';
    } else if (this.audio.volume < 0.5) {
      document.getElementById('btn-volume').textContent = '🔉';
    } else {
      document.getElementById('btn-volume').textContent = '🔊';
    }
  },

  toggleMute() {
    if (this.audio.muted || this.audio.volume === 0) {
      this.audio.muted = false;
      this.audio.volume = this.lastVolume || 0.8;
      document.getElementById('volume-slider').value = Math.round(this.audio.volume * 100);
      document.getElementById('btn-volume').textContent = '🔊';
    } else {
      this.lastVolume = this.audio.volume;
      this.audio.muted = true;
      document.getElementById('btn-volume').textContent = '🔇';
    }
  },

  _onTimeUpdate() {
    if (!this.audio.duration) return;
    const pct = (this.audio.currentTime / this.audio.duration) * 100;
    document.getElementById('progress-bar-fill').style.width = `${pct}%`;
    document.getElementById('progress-slider').value = pct;
    document.getElementById('time-current').textContent = this._fmt(this.audio.currentTime);
  },

  _onMetadata() {
    document.getElementById('time-total').textContent = this._fmt(this.audio.duration);
  },

  _onEnded() {
    document.getElementById('btn-play-pause').textContent = '▶';
    if (this.repeatMode === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
      document.getElementById('btn-play-pause').textContent = '⏸';
      return;
    }
    if (this.repeatMode === 'all' || this.queueIndex < this.queue.length - 1) {
      this.next();
    }
  },

  _fmt(secs) {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  /* ── Dominant color extraction via canvas ─────────────────────────── */
  extractDominantColor(imageUrl) {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 50;
          canvas.height = 50;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 50, 50);
          const data = ctx.getImageData(0, 0, 50, 50).data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 16) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
          // Darken the color for gradient
          r = Math.floor(r * 0.6);
          g = Math.floor(g * 0.6);
          b = Math.floor(b * 0.6);
          resolve(`rgb(${r},${g},${b})`);
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  },

  updateGradient(color) {
    const c = color || 'rgb(90,10,10)';
    const gradEl = document.getElementById('home-gradient-bg');
    if (gradEl) {
      gradEl.style.background = `linear-gradient(180deg, ${c} 0%, transparent 100%)`;
    }
    // Also update artist/album view gradient if visible
    const artistGrad = document.querySelector('.artist-hero-gradient');
    if (artistGrad) {
      artistGrad.style.background = `linear-gradient(180deg, ${c} 0%, rgba(18,18,18,0) 80%)`;
    }
    const albumGrad = document.querySelector('.album-hero-gradient');
    if (albumGrad) {
      albumGrad.style.background = `linear-gradient(180deg, ${c} 0%, rgba(18,18,18,0) 80%)`;
    }
  },
};
