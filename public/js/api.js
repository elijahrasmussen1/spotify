/* api.js – all HTTP calls to the backend */
const API = {
  async _fetch(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },

  /* ── Artists ─────────────────────────────────────────────────────── */
  getArtists() {
    return this._fetch('/api/artists');
  },
  createArtist(formData) {
    return this._fetch('/api/artists', { method: 'POST', body: formData });
  },
  getArtist(id) {
    return this._fetch(`/api/artists/${id}`);
  },
  deleteArtist(id) {
    return this._fetch(`/api/artists/${id}`, { method: 'DELETE' });
  },

  /* ── Songs ───────────────────────────────────────────────────────── */
  getSongs() {
    return this._fetch('/api/songs');
  },
  createSong(formData) {
    return this._fetch('/api/songs', { method: 'POST', body: formData });
  },
  getSong(id) {
    return this._fetch(`/api/songs/${id}`);
  },
  playSong(id) {
    return this._fetch(`/api/songs/${id}/play`, { method: 'POST' });
  },
  deleteSong(id) {
    return this._fetch(`/api/songs/${id}`, { method: 'DELETE' });
  },

  /* ── Albums ──────────────────────────────────────────────────────── */
  getAlbums() {
    return this._fetch('/api/albums');
  },
  createAlbum(formData) {
    return this._fetch('/api/albums', { method: 'POST', body: formData });
  },
  getAlbum(id) {
    return this._fetch(`/api/albums/${id}`);
  },
  deleteAlbum(id) {
    return this._fetch(`/api/albums/${id}`, { method: 'DELETE' });
  },

  /* ── Playlists ───────────────────────────────────────────────────── */
  getPlaylists() {
    return this._fetch('/api/playlists');
  },
  createPlaylist() {
    return this._fetch('/api/playlists', { method: 'POST' });
  },
  getPlaylist(id) {
    return this._fetch(`/api/playlists/${id}`);
  },
  updatePlaylist(id, formData) {
    return this._fetch(`/api/playlists/${id}`, { method: 'PATCH', body: formData });
  },
  deletePlaylist(id) {
    return this._fetch(`/api/playlists/${id}`, { method: 'DELETE' });
  },
  addSongToPlaylist(playlistId, songId) {
    return this._fetch(`/api/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId }),
    });
  },
  removeSongFromPlaylist(playlistId, songId) {
    return this._fetch(`/api/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' });
  },

  /* ── History & Search ────────────────────────────────────────────── */
  getHistory() {
    return this._fetch('/api/history');
  },
  getTopSongs() {
    return this._fetch('/api/top-songs');
  },
  search(q) {
    return this._fetch(`/api/search?q=${encodeURIComponent(q)}`);
  },
};
