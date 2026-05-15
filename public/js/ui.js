/* ui.js – all DOM rendering */

/* SVG icon strings used throughout rendering */
const _ICO = {
  music:     `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  musicSm:   `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  mic:       `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
  micSm:     `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
  disc:      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
  discSm:    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
  phones:    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
  play:      `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  playMd:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  shuffle:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>`,
};

const UI = {
  /* ── Helpers ──────────────────────────────────────────────────────── */
  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  _songDisplayName(song) {
    if (!song.features) return this._esc(song.name);
    try {
      const feats = JSON.parse(song.features);
      if (Array.isArray(feats) && feats.length > 0) {
        return `${this._esc(song.name)} (Feat. ${feats.map(f => this._esc(f)).join(', ')})`;
      }
    } catch (_) {}
    return this._esc(song.name);
  },

  _fmt(secs) {
    if (!secs || isNaN(secs)) return '--:--';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  _fmtPlays(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  },

  _coverImg(src, cls = '', alt = '') {
    if (src) {
      return `<img src="${src}" class="${cls}" alt="${alt}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
              <div class="${cls.replace('song-cover-sm','song-cover-placeholder-sm').replace('album-card-cover','album-card-cover-placeholder').replace('recents-card-img','recents-card-placeholder').replace('rp-cover','rp-cover-placeholder').replace('np-cover','np-cover-placeholder').replace('artist-hero-img','artist-hero-placeholder').replace('album-hero-cover','album-hero-cover-placeholder')}" style="display:none">${_ICO.music}</div>`;
    }
    return `<div class="${cls.includes('circle') ? cls.replace(/\S+/g, m => m + (m.endsWith('img') ? '-placeholder circle' : '')) : cls.replace('song-cover-sm','song-cover-placeholder-sm').replace('album-card-cover','album-card-cover-placeholder').replace('recents-card-img','recents-card-placeholder').replace('rp-cover','rp-cover-placeholder').replace('np-cover','np-cover-placeholder').replace('artist-hero-img','artist-hero-placeholder').replace('album-hero-cover','album-hero-cover-placeholder')}">${_ICO.music}</div>`;
  },

  /* ── Player bar ───────────────────────────────────────────────────── */
  updatePlayerBar(song) {
    if (!song) return;
    const coverEl = document.getElementById('player-cover');
    if (song.cover_art) {
      coverEl.innerHTML = `<img src="${song.cover_art}" alt="cover" style="width:100%;height:100%;object-fit:cover">`;
    } else {
      coverEl.innerHTML = _ICO.music;
    }
    document.getElementById('player-song-name').textContent = this._songDisplayName(song);
    const artistName = song.artist ? song.artist.name : (song.artist_name || '');
    document.getElementById('player-artist-name').textContent = artistName;
  },

  /* ── Now Playing panel ────────────────────────────────────────────── */
  renderNowPlaying(song) {
    const panel = document.getElementById('now-playing-panel');
    if (!song) {
      panel.innerHTML = `<div id="now-playing-empty"><p>Nothing playing yet</p></div>`;
      return;
    }
    const artistName = song.artist ? song.artist.name : (song.artist_name || '');
    const coverHtml = song.cover_art
      ? `<img src="${song.cover_art}" class="np-cover" alt="cover">`
      : `<div class="np-cover-placeholder">${_ICO.music}</div>`;

    panel.innerHTML = `
      <div class="np-header">Now Playing</div>
      <div class="np-cover-wrapper">${coverHtml}</div>
      <div class="np-info">
        <div class="np-song-name">${this._songDisplayName(song)}</div>
        <div class="np-artist-name">${this._esc(artistName)}</div>
      </div>
    `;
  },

  /* ── Home View ────────────────────────────────────────────────────── */
  async renderHomeView() {
    const [history, artists] = await Promise.all([
      API.getHistory().catch(() => []),
      API.getArtists().catch(() => []),
    ]);
    this.renderRecentlyPlayedGrid(history, artists);
    this.renderRecents(history);
  },

  renderRecentlyPlayedGrid(history, artists) {
    const container = document.getElementById('recently-played-grid');

    // Collect unique items: first from history (artists that have been played), then fill with all artists
    const seen = new Set();
    const items = [];

    for (const h of history) {
      const artistId = h.artist_id;
      if (!seen.has('a' + artistId)) {
        seen.add('a' + artistId);
        items.push({ type: 'artist', id: artistId, name: h.artist_name, picture: h.artist_picture });
      }
      if (items.length >= 8) break;
    }

    for (const a of (artists || [])) {
      if (items.length >= 8) break;
      if (!seen.has('a' + a.id)) {
        seen.add('a' + a.id);
        items.push({ type: 'artist', id: a.id, name: a.name, picture: a.picture });
      }
    }

    if (items.length === 0) {
      container.innerHTML = '';
      // Still show 8 empty placeholder boxes
      for (let i = 0; i < 8; i++) {
        container.innerHTML += `<div class="recently-played-box">
          <div class="rp-cover-placeholder">${_ICO.music}</div>
          <span class="rp-name">Add artists...</span>
        </div>`;
      }
      return;
    }

    // Fill remaining with placeholders
    while (items.length < 8) {
      items.push(null);
    }

    container.innerHTML = items.map((item, i) => {
      if (!item) {
        return `<div class="recently-played-box">
          <div class="rp-cover-placeholder">${_ICO.music}</div>
          <span class="rp-name">–</span>
        </div>`;
      }
      const coverHtml = item.picture
        ? `<img src="${item.picture}" class="rp-cover" alt="${item.name}">`
        : `<div class="rp-cover-placeholder">${_ICO.music}</div>`;
      return `<div class="recently-played-box" data-type="${item.type}" data-id="${item.id}">
        ${coverHtml}
        <span class="rp-name">${this._esc(item.name)}</span>
        <button class="rp-play-btn" data-type="${item.type}" data-id="${item.id}">${_ICO.play}</button>
      </div>`;
    }).join('');

    // Click handlers
    container.querySelectorAll('.recently-played-box[data-id]').forEach(box => {
      box.addEventListener('click', (e) => {
        if (e.target.classList.contains('rp-play-btn')) return;
        const { type, id } = box.dataset;
        if (type === 'artist') navigateTo('artist', id);
      });
    });
    container.querySelectorAll('.rp-play-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const { type, id } = btn.dataset;
        if (type === 'artist') {
          const artist = await API.getArtist(id).catch(() => null);
          if (artist && artist.songs && artist.songs.length) {
            Player.setQueue(artist.songs, 0);
            Player.play(artist.songs[0]);
          }
        }
      });
    });
  },

  renderRecents(history) {
    const container = document.getElementById('recents-list');
    if (!history || history.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">${_ICO.music}</div>
        <div class="empty-state-text">Nothing played yet</div>
      </div>`;
      return;
    }

    container.innerHTML = history.slice(0, 20).map(song => {
      const displayName = this._songDisplayName(song);
      const coverHtml = song.cover_art
        ? `<img src="${song.cover_art}" class="recents-card-img" alt="${displayName}">`
        : `<div class="recents-card-placeholder">${_ICO.music}</div>`;
      return `<div class="recents-card" data-song-id="${song.id}">
        ${coverHtml}
        <button class="recents-card-play" data-song-id="${song.id}">${_ICO.play}</button>
        <div class="recents-card-name">${displayName}</div>
        <div class="recents-card-sub">${this._esc(song.artist_name || '')}</div>
      </div>`;
    }).join('');

    container.querySelectorAll('.recents-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('recents-card-play')) return;
        const songId = card.dataset.songId;
        const song = history.find(s => String(s.id) === songId);
        if (song) {
          Player.setQueue(history, history.indexOf(song));
          Player.play(song);
        }
      });
    });
    container.querySelectorAll('.recents-card-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const songId = btn.dataset.songId;
        const song = history.find(s => String(s.id) === songId);
        if (song) {
          Player.setQueue(history, history.indexOf(song));
          Player.play(song);
        }
      });
    });
  },

  /* ── Artist View ──────────────────────────────────────────────────── */
  renderArtistView(artist) {
    const view = document.getElementById('artist-view');
    const songs = artist.songs || [];
    const albums = artist.albums || [];

    const heroImg = artist.picture
      ? `<img src="${artist.picture}" class="artist-hero-img" alt="${artist.name}">`
      : `<div class="artist-hero-placeholder">${_ICO.mic}</div>`;

    const topSongs = [...songs].sort((a, b) => b.plays - a.plays).slice(0, 10);

    const songRows = topSongs.map((song, i) => {
      const displayName = this._songDisplayName(song);
      const coverHtml = song.cover_art
        ? `<img src="${song.cover_art}" class="song-cover-sm" alt="${displayName}">`
        : `<div class="song-cover-placeholder-sm">${_ICO.musicSm}</div>`;
      const isCurrent = Player.currentSong && Player.currentSong.id === song.id;
      return `<div class="song-list-row" data-song-id="${song.id}">
        <div class="song-rank-cell">
          <span class="song-rank ${isCurrent ? 'song-playing-indicator' : ''}">${isCurrent ? _ICO.play : i + 1}</span>
          <span class="song-play-icon">${_ICO.play}</span>
        </div>
        <div class="song-title-cell">
          ${coverHtml}
          <div>
            <div class="song-name-text ${isCurrent ? 'song-playing-indicator' : ''}">${displayName}</div>
            <div class="song-artist-text">${this._esc(song.artist ? song.artist.name : artist.name)}</div>
          </div>
        </div>
        <div class="song-plays">${this._fmtPlays(song.plays)}</div>
        <div class="song-duration">--:--</div>
      </div>`;
    }).join('');

    const albumCards = albums.map(album => {
      const coverHtml = album.cover_art
        ? `<img src="${album.cover_art}" class="album-card-cover" alt="${album.name}">`
        : `<div class="album-card-cover-placeholder">${_ICO.disc}</div>`;
      return `<div class="album-card" data-album-id="${album.id}">
        ${coverHtml}
        <button class="album-card-play">${_ICO.play}</button>
        <div class="album-card-name">${this._esc(album.name)}</div>
        <div class="album-card-sub">${this._esc(String(album.year || ''))} • Album</div>
      </div>`;
    }).join('');

    view.innerHTML = `
      <div class="artist-hero">
        <div class="artist-hero-gradient"></div>
        ${heroImg}
        <div class="artist-hero-info">
          <div class="artist-hero-type">Artist</div>
          <h1 class="artist-hero-name">${this._esc(artist.name)}</h1>
        </div>
      </div>
      <div class="artist-actions">
        <button class="btn-play-green" id="artist-play-btn">${_ICO.playMd}</button>
        <button class="btn-shuffle-outline" id="artist-shuffle-btn" title="Shuffle">${_ICO.shuffle}</button>
        <button class="btn-artist-create" id="artist-create-song-btn">+ Create Song</button>
      </div>
      <div class="artist-section">
        <h2 class="artist-section-title">Most Played</h2>
        <div class="song-list-header">
          <span>#</span><span>Title</span><span>Plays</span><span>Duration</span>
        </div>
        ${topSongs.length ? songRows : `<div class="empty-state"><div class="empty-state-icon">${_ICO.music}</div><div class="empty-state-text">No songs yet</div></div>`}
      </div>
      ${albums.length ? `
      <div class="artist-section">
        <h2 class="artist-section-title">Albums</h2>
        <div class="albums-grid">${albumCards}</div>
      </div>` : ''}
    `;

    // Apply gradient from artist picture
    if (artist.picture) {
      Player.extractDominantColor(artist.picture).then(color => {
        const grad = view.querySelector('.artist-hero-gradient');
        if (grad) grad.style.background = `linear-gradient(180deg, ${color || 'rgb(90,10,10)'} 0%, rgba(18,18,18,0) 80%)`;
      });
    }

    // Play all songs
    document.getElementById('artist-play-btn').addEventListener('click', () => {
      if (songs.length) {
        Player.setQueue(songs, 0);
        Player.play(songs[0]);
      }
    });

    // Shuffle play
    document.getElementById('artist-shuffle-btn').addEventListener('click', () => {
      if (songs.length) {
        const idx = Math.floor(Math.random() * songs.length);
        Player.setQueue(songs, idx);
        Player.isShuffled = true;
        document.getElementById('btn-shuffle').classList.add('active');
        Player.play(songs[idx]);
      }
    });

    // Create song pre-filled with this artist
    document.getElementById('artist-create-song-btn').addEventListener('click', () => {
      openModal('create-song');
      // Pre-fill artist
      setTimeout(() => {
        document.getElementById('song-artist-input').value = artist.name;
        document.getElementById('song-artist-id').value = artist.id;
      }, 50);
    });

    // Song row click
    view.querySelectorAll('.song-list-row').forEach(row => {
      row.addEventListener('click', () => {
        const songId = parseInt(row.dataset.songId);
        const song = songs.find(s => s.id === songId);
        if (song) {
          Player.setQueue(songs, songs.indexOf(song));
          Player.play(song);
        }
      });
    });

    // Album card click
    view.querySelectorAll('.album-card[data-album-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('album-card-play')) return;
        navigateTo('album', card.dataset.albumId);
      });
    });
    view.querySelectorAll('.album-card-play').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const albumId = btn.closest('.album-card').dataset.albumId;
        const album = await API.getAlbum(albumId).catch(() => null);
        if (album && album.songs && album.songs.length) {
          Player.setQueue(album.songs, 0);
          Player.play(album.songs[0]);
        }
      });
    });
  },

  /* ── Album View ───────────────────────────────────────────────────── */
  renderAlbumView(album) {
    const view = document.getElementById('album-view');
    const songs = album.songs || [];
    const artist = album.artist || {};

    const heroImg = album.cover_art
      ? `<img src="${album.cover_art}" class="album-hero-cover" alt="${album.name}">`
      : `<div class="album-hero-cover-placeholder">${_ICO.disc}</div>`;

    const trackRows = songs.map((song, i) => {
      const displayName = this._songDisplayName(song);
      const isCurrent = Player.currentSong && Player.currentSong.id === song.id;
      return `<div class="tracklist-row" data-song-id="${song.id}">
        <div class="track-number-cell">
          <span class="track-number ${isCurrent ? 'song-playing-indicator' : ''}">${isCurrent ? _ICO.play : i + 1}</span>
          <span class="track-play-icon">${_ICO.play}</span>
        </div>
        <div class="track-info">
          <div class="track-name ${isCurrent ? 'song-playing-indicator' : ''}">${displayName}</div>
          <div class="track-artist">${this._esc(song.artist ? song.artist.name : (artist.name || ''))}</div>
        </div>
        <div class="track-duration">--:--</div>
      </div>`;
    }).join('');

    const type = songs.length === 1 ? 'Single' : 'Album';
    const year = album.year || '';
    const songCount = songs.length;

    view.innerHTML = `
      <div class="album-hero">
        <div class="album-hero-gradient"></div>
        ${heroImg}
        <div class="album-hero-info">
          <div class="album-hero-type">${type}</div>
          <h1 class="album-hero-title">${this._esc(album.name)}</h1>
          <div class="album-hero-meta">
            <span class="artist-link" data-artist-id="${this._esc(String(artist.id || ''))}">${this._esc(artist.name || '')}</span>
            ${year ? `<span class="dot">•</span><span>${year}</span>` : ''}
            ${songCount ? `<span class="dot">•</span><span>${songCount} song${songCount !== 1 ? 's' : ''}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="album-actions">
        <button class="btn-play-green" id="album-play-btn">${_ICO.playMd}</button>
        <button class="btn-shuffle-outline" id="album-shuffle-btn" title="Shuffle">${_ICO.shuffle}</button>
      </div>
      <div class="album-tracklist">
        <div class="tracklist-header">
          <span>#</span><span>Title</span><span style="text-align:right">Duration</span>
        </div>
        ${songs.length ? trackRows : `<div class="empty-state"><div class="empty-state-icon">${_ICO.music}</div><div class="empty-state-text">No songs yet</div></div>`}
      </div>
      <div class="album-footer">
        ${year ? `<div>${year}</div>` : ''}
        ${artist.name ? `<div>© ${this._esc(String(year || new Date().getFullYear()))} ${this._esc(artist.name)}</div>` : ''}
      </div>
    `;

    // Apply gradient
    if (album.cover_art) {
      Player.extractDominantColor(album.cover_art).then(color => {
        const grad = view.querySelector('.album-hero-gradient');
        if (grad) grad.style.background = `linear-gradient(180deg, ${color || 'rgb(26,58,90)'} 0%, rgba(18,18,18,0) 80%)`;
      });
    }

    // Artist link
    const artistLink = view.querySelector('.artist-link[data-artist-id]');
    if (artistLink) {
      artistLink.addEventListener('click', () => navigateTo('artist', artistLink.dataset.artistId));
    }

    // Play
    document.getElementById('album-play-btn').addEventListener('click', () => {
      if (songs.length) {
        Player.setQueue(songs, 0);
        Player.play(songs[0]);
      }
    });

    document.getElementById('album-shuffle-btn').addEventListener('click', () => {
      if (songs.length) {
        const idx = Math.floor(Math.random() * songs.length);
        Player.setQueue(songs, idx);
        Player.isShuffled = true;
        document.getElementById('btn-shuffle').classList.add('active');
        Player.play(songs[idx]);
      }
    });

    // Tracklist click
    view.querySelectorAll('.tracklist-row').forEach(row => {
      row.addEventListener('click', () => {
        const songId = parseInt(row.dataset.songId);
        const song = songs.find(s => s.id === songId);
        if (song) {
          Player.setQueue(songs, songs.indexOf(song));
          Player.play(song);
        }
      });
    });
  },

  /* ── Search Results ───────────────────────────────────────────────── */
  renderSearchResults(results) {
    const container = document.getElementById('search-results');
    const { artists = [], songs = [], albums = [] } = results;

    if (!artists.length && !songs.length && !albums.length) {
      container.innerHTML = '<div class="search-no-results">No results found.</div>';
      return;
    }

    let html = '';

    if (artists.length) {
      html += `<div class="search-category">
        <div class="search-category-title">Artists</div>
        <div class="search-results-grid">
          ${artists.map(a => `
            <div class="search-result-card" data-type="artist" data-id="${this._esc(String(a.id))}">
              ${a.picture
                ? `<img src="${this._esc(a.picture)}" class="search-result-img circle" alt="${this._esc(a.name)}">`
                : `<div class="search-result-img circle" style="background:#333;display:flex;align-items:center;justify-content:center">${_ICO.mic}</div>`
              }
              <div class="search-result-name">${this._esc(a.name)}</div>
              <div class="search-result-sub">Artist</div>
            </div>`).join('')}
        </div>
      </div>`;
    }

    if (albums.length) {
      html += `<div class="search-category">
        <div class="search-category-title">Albums</div>
        <div class="search-results-grid">
          ${albums.map(al => `
            <div class="search-result-card" data-type="album" data-id="${this._esc(String(al.id))}">
              ${al.cover_art
                ? `<img src="${this._esc(al.cover_art)}" class="search-result-img" alt="${this._esc(al.name)}">`
                : `<div class="search-result-img" style="background:#333;display:flex;align-items:center;justify-content:center">${_ICO.disc}</div>`
              }
              <div class="search-result-name">${this._esc(al.name)}</div>
              <div class="search-result-sub">${this._esc(String(al.year || ''))} • Album</div>
            </div>`).join('')}
        </div>
      </div>`;
    }

    if (songs.length) {
      html += `<div class="search-category">
        <div class="search-category-title">Songs</div>
        <div class="search-results-grid">
          ${songs.map(s => `
            <div class="search-result-card" data-type="song" data-song='${JSON.stringify(s).replace(/'/g, '&#39;')}'>
              ${s.cover_art
                ? `<img src="${this._esc(s.cover_art)}" class="search-result-img" alt="${this._esc(s.name)}">`
                : `<div class="search-result-img" style="background:#333;display:flex;align-items:center;justify-content:center">${_ICO.music}</div>`
              }
              <div class="search-result-name">${this._songDisplayName(s)}</div>
              <div class="search-result-sub">${this._esc(s.artist_name || '')}</div>
            </div>`).join('')}
        </div>
      </div>`;
    }

    container.innerHTML = html;

    // Click handlers
    container.querySelectorAll('.search-result-card').forEach(card => {
      card.addEventListener('click', async () => {
        const type = card.dataset.type;
        if (type === 'artist') navigateTo('artist', card.dataset.id);
        else if (type === 'album') navigateTo('album', card.dataset.id);
        else if (type === 'song') {
          try {
            const song = JSON.parse(card.dataset.song);
            Player.setQueue([song], 0);
            Player.play(song);
          } catch (_) {}
        }
      });
    });
  },

  /* ── Sidebar Library ──────────────────────────────────────────────── */
  async renderLibrary(filter = 'artists') {
    const list = document.getElementById('library-list');
    try {
      const artists = await API.getArtists();
      if (filter === 'artists') {
        if (!artists.length) {
          list.innerHTML = `<div class="empty-state" style="padding:20px">
            <div class="empty-state-icon">${_ICO.mic}</div>
            <div class="empty-state-text" style="font-size:0.82rem">No artists yet</div>
          </div>`;
          return;
        }
        list.innerHTML = artists.map(a => `
          <div class="library-item" data-artist-id="${this._esc(String(a.id))}">
            ${a.picture
              ? `<img src="${this._esc(a.picture)}" class="library-item-img" alt="${this._esc(a.name)}">`
              : `<div class="library-item-placeholder">${_ICO.micSm}</div>`
            }
            <div class="library-item-info">
              <div class="library-item-name">${this._esc(a.name)}</div>
              <div class="library-item-sub">Artist</div>
            </div>
          </div>`).join('');

        list.querySelectorAll('.library-item[data-artist-id]').forEach(item => {
          item.addEventListener('click', () => navigateTo('artist', item.dataset.artistId));
        });
      } else {
        // Playlists placeholder
        list.innerHTML = `<div class="empty-state" style="padding:20px">
          <div class="empty-state-icon">${_ICO.phones}</div>
          <div class="empty-state-text" style="font-size:0.82rem">No playlists yet</div>
        </div>`;
      }
    } catch (e) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-text" style="font-size:0.82rem">Failed to load</div></div>`;
    }
  },

  /* ── Artist dropdown in Create Song modal ─────────────────────────── */
  async populateArtistDropdowns() {
    const artists = await API.getArtists().catch(() => []);
    const input = document.getElementById('song-artist-input');
    const dropdown = document.getElementById('song-artist-dropdown');
    const hiddenId = document.getElementById('song-artist-id');

    const render = (list) => {
      if (!list.length) {
        dropdown.innerHTML = '<div class="select-option" style="color:#888">No artists found</div>';
      } else {
        dropdown.innerHTML = list.map(a => `
          <div class="select-option" data-id="${this._esc(String(a.id))}" data-name="${this._esc(a.name)}">
            ${a.picture ? `<img src="${this._esc(a.picture)}" alt="${this._esc(a.name)}">` : `<div class="select-option-placeholder">${_ICO.micSm}</div>`}
            ${this._esc(a.name)}
          </div>`).join('');
      }
      dropdown.classList.remove('hidden');
      dropdown.querySelectorAll('.select-option[data-id]').forEach(opt => {
        opt.addEventListener('click', () => {
          input.value = opt.dataset.name;
          hiddenId.value = opt.dataset.id;
          dropdown.classList.add('hidden');
          // Load albums for this artist
          this.populateAlbumDropdowns(opt.dataset.id);
        });
      });
    };

    input.addEventListener('focus', () => render(artists));
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      render(artists.filter(a => a.name.toLowerCase().includes(q)));
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#song-artist-select-wrapper')) dropdown.classList.add('hidden');
    });

    // Features dropdown
    const featInput = document.getElementById('song-features-input');
    const featDropdown = document.getElementById('song-features-dropdown');
    const tagsContainer = document.getElementById('song-features-tags');
    const selectedFeatures = [];

    const renderFeatDropdown = (list) => {
      featDropdown.innerHTML = list.map(a => `
        <div class="select-option" data-name="${this._esc(a.name)}">
          ${a.picture ? `<img src="${this._esc(a.picture)}" alt="${this._esc(a.name)}">` : `<div class="select-option-placeholder">${_ICO.micSm}</div>`}
          ${this._esc(a.name)}
        </div>`).join('');
      featDropdown.classList.remove('hidden');
      featDropdown.querySelectorAll('.select-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const name = opt.dataset.name;
          if (!selectedFeatures.includes(name)) {
            selectedFeatures.push(name);
            renderTags();
          }
          featInput.value = '';
          featDropdown.classList.add('hidden');
        });
      });
    };

    const renderTags = () => {
      tagsContainer.innerHTML = selectedFeatures.map((name, i) => `
        <div class="feature-tag">
          ${UI._esc(name)}
          <span class="feature-tag-remove" data-index="${i}">✕</span>
        </div>`).join('');
      tagsContainer.querySelectorAll('.feature-tag-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedFeatures.splice(parseInt(btn.dataset.index), 1);
          renderTags();
        });
      });
      // Store in a global so submitCreateSong can access it
      window._selectedFeatures = selectedFeatures;
    };

    featInput.addEventListener('focus', () => renderFeatDropdown(artists));
    featInput.addEventListener('input', () => {
      const q = featInput.value.toLowerCase();
      renderFeatDropdown(artists.filter(a => a.name.toLowerCase().includes(q)));
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#song-features-wrapper')) featDropdown.classList.add('hidden');
    });

    window._selectedFeatures = selectedFeatures;
  },

  async populateAlbumDropdowns(artistId) {
    const albumInput = document.getElementById('song-album-input');
    const albumDropdown = document.getElementById('song-album-dropdown');
    const albumIdHidden = document.getElementById('song-album-id');

    let albums = [];
    if (artistId) {
      const artist = await API.getArtist(artistId).catch(() => null);
      albums = artist ? (artist.albums || []) : [];
    } else {
      albums = await API.getAlbums().catch(() => []);
    }

    const render = (list) => {
      if (!list.length) {
        albumDropdown.innerHTML = '<div class="select-option" style="color:#888">No albums found</div>';
      } else {
        albumDropdown.innerHTML = list.map(al => `
          <div class="select-option" data-id="${this._esc(String(al.id))}" data-name="${this._esc(al.name)}">
            ${al.cover_art ? `<img src="${this._esc(al.cover_art)}" alt="${this._esc(al.name)}" style="border-radius:4px">` : `<div class="select-option-placeholder">${_ICO.discSm}</div>`}
            ${this._esc(al.name)}
          </div>`).join('');
      }
      albumDropdown.classList.remove('hidden');
      albumDropdown.querySelectorAll('.select-option[data-id]').forEach(opt => {
        opt.addEventListener('click', () => {
          albumInput.value = opt.dataset.name;
          albumIdHidden.value = opt.dataset.id;
          albumDropdown.classList.add('hidden');
        });
      });
    };

    albumInput.addEventListener('focus', () => render(albums));
    albumInput.addEventListener('input', () => {
      const q = albumInput.value.toLowerCase();
      render(albums.filter(al => al.name.toLowerCase().includes(q)));
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.searchable-select')) albumDropdown.classList.add('hidden');
    });
  },
};
