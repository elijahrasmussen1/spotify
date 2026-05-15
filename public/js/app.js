/* app.js – main controller */

// ─── Toast ─────────────────────────────────────────────────────────────────
const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
document.body.appendChild(toastContainer);

function showToast(message, type = 'success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ─── Navigation ─────────────────────────────────────────────────────────────
let currentView = 'home';
let navHistory = [];

function showView(name) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });
  const el = document.getElementById(`${name}-view`);
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('active');
    el.scrollTop = 0;
  }
  currentView = name;
}

async function navigateTo(view, id) {
  navHistory.push({ view: currentView });

  if (view === 'home') {
    showView('home');
    UI.renderHomeView();
    return;
  }

  if (view === 'artist') {
    showView('artist');
    try {
      const artist = await API.getArtist(id);
      UI.renderArtistView(artist);
    } catch (e) {
      showToast('Failed to load artist', 'error');
    }
    return;
  }

  if (view === 'album') {
    showView('album');
    try {
      const album = await API.getAlbum(id);
      UI.renderAlbumView(album);
    } catch (e) {
      showToast('Failed to load album', 'error');
    }
    return;
  }

  if (view === 'playlist') {
    showView('playlist');
    try {
      const playlist = await API.getPlaylist(id);
      UI.renderPlaylistView(playlist);
    } catch (e) {
      showToast('Failed to load playlist', 'error');
    }
    return;
  }
}

// ─── Modals ──────────────────────────────────────────────────────────────────
function openModal(modalName) {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  const modal = document.getElementById(`modal-${modalName}`);
  if (modal) modal.classList.remove('hidden');

  if (modalName === 'create-song') {
    UI.populateArtistDropdowns();
    UI.populateAlbumDropdowns(null);
    // Reset features
    window._selectedFeatures = [];
    document.getElementById('song-features-tags').innerHTML = '';
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  resetModalForms();
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function resetModalForms() {
  // Artist form
  document.getElementById('artist-name-input').value = '';
  document.getElementById('artist-pic-input').value = '';
  const preview = document.getElementById('artist-pic-preview');
  preview.src = '';
  preview.classList.add('hidden');
  document.getElementById('artist-pic-placeholder').classList.remove('hidden');

  // Song form
  document.getElementById('song-name-input').value = '';
  document.getElementById('song-artist-input').value = '';
  document.getElementById('song-artist-id').value = '';
  document.getElementById('song-file-input').value = '';
  document.getElementById('song-file-placeholder').textContent = 'Click to upload MP3';
  document.getElementById('cover-art-input').value = '';
  document.getElementById('song-year-input').value = '';
  const coverPreview = document.getElementById('cover-art-preview');
  coverPreview.src = '';
  coverPreview.classList.add('hidden');
  document.getElementById('cover-art-placeholder').classList.remove('hidden');
  document.querySelector('input[name="song-in-album"][value="no"]').checked = true;
  document.getElementById('album-existing-wrapper').classList.add('hidden');
  document.getElementById('album-new-wrapper').classList.add('hidden');
  document.getElementById('song-album-input').value = '';
  document.getElementById('song-album-id').value = '';
  document.getElementById('new-album-name-input').value = '';
  window._selectedFeatures = [];
  document.getElementById('song-features-tags').innerHTML = '';
  document.getElementById('song-features-input').value = '';

  // Edit playlist form
  const epName = document.getElementById('ep-name-input');
  const epDesc = document.getElementById('ep-desc-input');
  const epCoverDisplay = document.getElementById('ep-cover-display');
  const epCoverInput = document.getElementById('ep-cover-input');
  if (epName) epName.value = '';
  if (epDesc) epDesc.value = '';
  if (epCoverDisplay) epCoverDisplay.innerHTML = '';
  if (epCoverInput) epCoverInput.value = '';
  window._epCoverFile = null;
  window._editingPlaylistId = null;
}

// ─── Image preview helpers ────────────────────────────────────────────────────
function setupImagePreview(inputId, previewId, placeholderId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const placeholder = document.getElementById(placeholderId);

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result; // safe data: URL from FileReader
      preview.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  });
}

function setupFileNameDisplay(inputId, placeholderId) {
  const input = document.getElementById(inputId);
  const placeholder = document.getElementById(placeholderId);
  input.addEventListener('change', () => {
    if (input.files[0] && placeholder) {
      placeholder.textContent = input.files[0].name;
    }
  });
}

// ─── Submit: Create Artist ────────────────────────────────────────────────────
async function submitCreateArtist() {
  const name = document.getElementById('artist-name-input').value.trim();
  if (!name) { showToast('Artist name is required', 'error'); return; }

  const btn = document.querySelector('#modal-create-artist .btn-create');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    const fd = new FormData();
    fd.append('name', name);
    const picFile = document.getElementById('artist-pic-input').files[0];
    if (picFile) fd.append('picture', picFile);

    await API.createArtist(fd);
    showToast(`Artist "${name}" created!`);
    closeModal();
    UI.renderLibrary(document.querySelector('.filter-btn.active')?.dataset.filter || 'artists');
    // Refresh home
    if (currentView === 'home') UI.renderHomeView();
  } catch (e) {
    showToast(e.message || 'Failed to create artist', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create';
  }
}

// ─── Submit: Create Song ──────────────────────────────────────────────────────
async function submitCreateSong() {
  const artistId = document.getElementById('song-artist-id').value;
  const name = document.getElementById('song-name-input').value.trim();
  const songFile = document.getElementById('song-file-input').files[0];
  const coverFile = document.getElementById('cover-art-input').files[0];
  const year = document.getElementById('song-year-input').value;

  if (!artistId) { showToast('Please select an artist', 'error'); return; }
  if (!name) { showToast('Song name is required', 'error'); return; }
  if (!songFile) { showToast('Please upload an MP3 file', 'error'); return; }
  if (!coverFile) { showToast('Please upload cover art', 'error'); return; }
  if (!year) { showToast('Year is required', 'error'); return; }

  const albumMode = document.querySelector('input[name="song-in-album"]:checked').value;
  let albumId = '';
  let newAlbumName = '';
  if (albumMode === 'existing') albumId = document.getElementById('song-album-id').value;
  if (albumMode === 'new') newAlbumName = document.getElementById('new-album-name-input').value.trim();

  const btn = document.querySelector('#modal-create-song .btn-create');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    const fd = new FormData();
    fd.append('artistId', artistId);
    fd.append('name', name);
    fd.append('songFile', songFile);
    fd.append('coverArt', coverFile);
    fd.append('year', year);
    if (albumId) fd.append('albumId', albumId);
    if (newAlbumName) fd.append('newAlbumName', newAlbumName);

    const features = window._selectedFeatures || [];
    if (features.length) fd.append('features', JSON.stringify(features));

    await API.createSong(fd);
    showToast(`Song "${name}" created!`);
    closeModal();

    // Refresh current view if it's the artist's page
    if (currentView === 'artist') {
      const artist = await API.getArtist(artistId).catch(() => null);
      if (artist) UI.renderArtistView(artist);
    }
    if (currentView === 'home') UI.renderHomeView();
  } catch (e) {
    showToast(e.message || 'Failed to create song', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create';
  }
}

// ─── Create Playlist ──────────────────────────────────────────────────────────
async function createPlaylist() {
  document.getElementById('create-dropdown').classList.add('hidden');
  try {
    const playlist = await API.createPlaylist();
    showToast(`"${playlist.name}" created`);
    UI.renderLibrary('playlists');
    navigateTo('playlist', playlist.id);
  } catch (e) {
    showToast('Failed to create playlist', 'error');
  }
}

// ─── Submit: Edit Playlist ────────────────────────────────────────────────────
async function submitEditPlaylist() {
  const id = window._editingPlaylistId;
  if (!id) return;

  const name = document.getElementById('ep-name-input').value.trim();
  if (!name) { showToast('Playlist name is required', 'error'); return; }

  const btn = document.querySelector('#modal-edit-playlist .btn-save-ep');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', document.getElementById('ep-desc-input').value.trim());
    if (window._epCoverFile) fd.append('coverArt', window._epCoverFile);

    await API.updatePlaylist(id, fd);
    showToast('Playlist updated');
    closeModal();
    UI.renderLibrary('playlists');
    navigateTo('playlist', id);
  } catch (e) {
    showToast(e.message || 'Failed to update playlist', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  Player.init();

  // Recents list: translate vertical wheel scroll to horizontal — passive:false
  // required so we can call preventDefault() and prevent the page from scrolling
  const recentsList = document.getElementById('recents-list');
  if (recentsList) {
    recentsList.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        recentsList.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  // Initial render
  showView('home');
  UI.renderHomeView();
  UI.renderLibrary('artists');

  // Home button
  document.getElementById('nav-home-btn').addEventListener('click', () => {
    navigateTo('home');
  });

  // Library filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      UI.renderLibrary(btn.dataset.filter);
    });
  });

  // Create button dropdown toggle
  const createBtn = document.getElementById('create-btn');
  const createDropdown = document.getElementById('create-dropdown');
  createBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    createDropdown.classList.toggle('hidden');
  });
  document.addEventListener('click', () => createDropdown.classList.add('hidden'));

  // Image/file previews
  setupImagePreview('artist-pic-input', 'artist-pic-preview', 'artist-pic-placeholder');
  setupImagePreview('cover-art-input', 'cover-art-preview', 'cover-art-placeholder');
  setupFileNameDisplay('song-file-input', 'song-file-placeholder');

  // Album radio buttons
  document.querySelectorAll('input[name="song-in-album"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const val = radio.value;
      document.getElementById('album-existing-wrapper').classList.toggle('hidden', val !== 'existing');
      document.getElementById('album-new-wrapper').classList.toggle('hidden', val !== 'new');
    });
  });

  // Queue toggle button
  const queuePanel = document.getElementById('now-playing-panel');
  document.getElementById('btn-queue').addEventListener('click', () => {
    const isOpen = !queuePanel.classList.contains('hidden');
    queuePanel.classList.toggle('hidden', isOpen);
    document.getElementById('btn-queue').classList.toggle('active', !isOpen);
    if (!isOpen) UI.renderQueuePanel();
  });

  // ── Fullscreen view ────────────────────────────────────────────────
  const fsOverlay = document.getElementById('fullscreen-overlay');
  let fsIdleTimer = null;
  let fsActive = false;

  function _applyFsContent(song, animate) {
    const fsArt = document.getElementById('fs-art');
    const fsBg = document.getElementById('fs-bg');
    const fsGrad = document.getElementById('fs-gradient');
    const fsInfo = document.getElementById('fs-info');

    if (song) {
      const src = song.cover_art || '';
      if (src) {
        const escapedSrc = UI._esc(src);
        fsArt.innerHTML = `<img src="${escapedSrc}" alt="">`;
        fsBg.style.backgroundImage = `url("${escapedSrc}")`;
        Player.extractDominantColor(src).then(color => {
          if (!color) return;
          const [r, g, b] = color.match(/\d+/g).map(Number);
          fsGrad.style.background = `linear-gradient(to bottom, rgba(${r},${g},${b},0.25) 0%, rgba(${r},${g},${b},0.08) 40%, rgba(${r},${g},${b},0.55) 80%, rgba(0,0,0,0.92) 100%)`;
          fsBg.style.backgroundImage = `url("${escapedSrc}")`;
        });
      } else {
        fsArt.innerHTML = `<div class="fs-art-placeholder">${_ICO.musicMd}</div>`;
        fsBg.style.backgroundImage = 'none';
        fsGrad.style.background = '';
      }
      document.getElementById('fs-song-name').textContent = UI._rawName(song);
      document.getElementById('fs-artist-name').textContent = song.artist_name || (song.artist && song.artist.name) || '';

      const fsDotsBtn = document.getElementById('fs-dots-btn');
      fsDotsBtn.dataset.songId = song.id || '';
      fsDotsBtn.dataset.artistId = song.artist_id || '';
      fsDotsBtn.dataset.albumId = song.album_id || '';
      fsDotsBtn.dataset.inQueue = 'false';
    } else {
      fsArt.innerHTML = `<div class="fs-art-placeholder">${_ICO.musicMd}</div>`;
      fsBg.style.backgroundImage = 'none';
      fsGrad.style.background = '';
      document.getElementById('fs-song-name').textContent = 'Nothing playing';
      document.getElementById('fs-artist-name').textContent = '';
    }

    if (animate) {
      // art: slide in from right
      fsArt.classList.remove('slide-out', 'slide-in');
      void fsArt.offsetWidth; // reflow
      fsArt.classList.add('slide-in');
      fsArt.addEventListener('animationend', () => fsArt.classList.remove('slide-in'), { once: true });
      // info: fade up
      fsInfo.classList.remove('info-update');
      void fsInfo.offsetWidth;
      fsInfo.classList.add('info-update');
      fsInfo.addEventListener('animationend', () => fsInfo.classList.remove('info-update'), { once: true });
    }
  }

  function updateFullscreen(animate) {
    if (!fsActive) return;
    const song = Player.currentSong;
    _applyFsContent(song, animate);

    // Sync play/pause state
    const fsPlayBtn = document.getElementById('fs-btn-play');
    if (Player.audio && !Player.audio.paused) {
      fsPlayBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
    } else {
      fsPlayBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    }
    document.getElementById('fs-btn-shuffle').classList.toggle('active', Player.isShuffled);
    document.getElementById('fs-btn-repeat').classList.toggle('active', Player.repeatMode !== 'none');
  }

  function animateFsTransition() {
    if (!fsActive) return;
    const fsArt = document.getElementById('fs-art');
    // Slide old art out first
    fsArt.classList.remove('slide-out', 'slide-in');
    void fsArt.offsetWidth;
    fsArt.classList.add('slide-out');
    fsArt.addEventListener('animationend', () => {
      fsArt.classList.remove('slide-out');
      updateFullscreen(true);
    }, { once: true });
  }

  function resetFsIdleTimer() {
    clearTimeout(fsIdleTimer);
    fsOverlay.classList.remove('controls-hidden');
    if (fsActive) {
      fsIdleTimer = setTimeout(() => {
        if (fsActive) fsOverlay.classList.add('controls-hidden');
      }, 5000);
    }
  }

  function openFullscreen() {
    fsActive = true;
    fsOverlay.classList.remove('hidden');
    document.getElementById('btn-fullscreen').classList.add('active');
    updateFullscreen();
    resetFsIdleTimer();
  }

  function closeFullscreen() {
    fsActive = false;
    clearTimeout(fsIdleTimer);
    fsOverlay.classList.add('hidden');
    fsOverlay.classList.remove('controls-hidden');
    document.getElementById('btn-fullscreen').classList.remove('active');
  }

  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (fsActive) closeFullscreen();
    else openFullscreen();
  });

  document.getElementById('fs-exit-btn').addEventListener('click', closeFullscreen);

  fsOverlay.addEventListener('mousemove', resetFsIdleTimer);
  fsOverlay.addEventListener('click', resetFsIdleTimer);

  // Fullscreen controls
  document.getElementById('fs-btn-play').addEventListener('click', () => {
    Player.togglePlay();
    updateFullscreen();
  });
  document.getElementById('fs-btn-prev').addEventListener('click', () => Player.prev());
  document.getElementById('fs-btn-next').addEventListener('click', () => Player.next());
  document.getElementById('fs-btn-shuffle').addEventListener('click', () => {
    Player.toggleShuffle();
    document.getElementById('fs-btn-shuffle').classList.toggle('active', Player.isShuffled);
  });
  document.getElementById('fs-btn-repeat').addEventListener('click', () => {
    Player.cycleRepeat();
    document.getElementById('fs-btn-repeat').classList.toggle('active', Player.repeatMode !== 'none');
  });

  // Fullscreen progress slider
  const fsSlider = document.getElementById('fs-progress-slider');
  fsSlider.addEventListener('input', () => Player.seek(parseFloat(fsSlider.value)));

  // Sync progress in fullscreen
  document.addEventListener('fsprogress', (e) => {
    if (!fsActive) return;
    const { pct, current, total } = e.detail;
    document.getElementById('fs-progress-fill').style.width = `${pct}%`;
    fsSlider.value = pct;
    document.getElementById('fs-time-current').textContent = current;
    document.getElementById('fs-time-total').textContent = total;
  });

  // Update fullscreen when song changes
  document.addEventListener('songchange', () => {
    if (fsActive) animateFsTransition();
  });

  // ESC exits fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (fsActive) { closeFullscreen(); return; }
      closeSongCtxMenu();
    }
  });

  // Re-render queue panel when queue changes
  document.addEventListener('queuechanged', () => {
    if (!document.getElementById('now-playing-panel').classList.contains('hidden')) {
      UI.renderQueuePanel();
    }
  });

  // ── Global Song Context Menu ──────────────────────────────────────
  const ctxMenu = document.getElementById('song-ctx-menu');
  const playlistPicker = document.getElementById('playlist-picker');
  let _ctxSong = null;

  function closeSongCtxMenu() {
    ctxMenu.classList.add('hidden');
    playlistPicker.classList.add('hidden');
  }

  function openSongCtxMenu(btn) {
    const songId = parseInt(btn.dataset.songId);
    const inQueue = btn.dataset.inQueue === 'true';
    const artistId = btn.dataset.artistId;
    const albumId = btn.dataset.albumId;
    const song = (window._songDataMap && window._songDataMap.get(songId))
      || Player.queue.find(s => s.id === songId)
      || null;
    _ctxSong = song || { id: songId, artist_id: artistId, album_id: albumId };

    // Toggle items based on context
    document.getElementById('ctx-add-queue').classList.toggle('hidden', inQueue);
    document.getElementById('ctx-go-album').classList.toggle('hidden', !albumId);

    // Position menu
    closeSongCtxMenu();
    const rect = btn.getBoundingClientRect();
    const menuW = 200;
    let left = rect.right + 4;
    if (left + menuW > window.innerWidth) left = rect.left - menuW - 4;
    ctxMenu.style.left = `${left}px`;
    ctxMenu.style.top = `${Math.min(rect.bottom, window.innerHeight - 180)}px`;
    ctxMenu.classList.remove('hidden');

    // Separator visibility
    const addQueueItem = document.getElementById('ctx-add-queue');
    const divider = ctxMenu.querySelector('.ctx-divider');
    divider.classList.toggle('hidden', inQueue);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('.row-dots-btn')) {
      e.stopPropagation();
      openSongCtxMenu(e.target.closest('.row-dots-btn'));
      return;
    }
    if (!e.target.closest('#song-ctx-menu') && !e.target.closest('#playlist-picker')) {
      closeSongCtxMenu();
    }
  });

  // (ESC handler consolidated in fullscreen block above)

  // Add to queue
  document.getElementById('ctx-add-queue').addEventListener('click', () => {
    if (_ctxSong) {
      Player.addToQueue(_ctxSong);
      showToast('Added to queue');
    }
    closeSongCtxMenu();
  });

  // Go to artist
  document.getElementById('ctx-go-artist').addEventListener('click', () => {
    const artistId = _ctxSong && (_ctxSong.artist_id || (_ctxSong.artist && _ctxSong.artist.id));
    if (artistId) navigateTo('artist', artistId);
    closeSongCtxMenu();
  });

  // Go to album
  document.getElementById('ctx-go-album').addEventListener('click', () => {
    const albumId = _ctxSong && _ctxSong.album_id;
    if (albumId) navigateTo('album', albumId);
    closeSongCtxMenu();
  });

  // Add to playlist → show sub-picker
  document.getElementById('ctx-add-playlist').addEventListener('click', async (e) => {
    e.stopPropagation();
    const playlists = await API.getPlaylists().catch(() => []);
    const list = document.getElementById('playlist-picker-list');
    if (!playlists.length) {
      list.innerHTML = '<div class="ctx-picker-empty">No playlists yet</div>';
    } else {
      list.innerHTML = playlists.map(p => `
        <button class="ctx-item ctx-playlist-item" data-playlist-id="${p.id}">${UI._esc(p.name)}</button>`
      ).join('');
      list.querySelectorAll('.ctx-playlist-item').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await API.addSongToPlaylist(parseInt(btn.dataset.playlistId), _ctxSong.id);
            showToast('Added to playlist');
          } catch (err) {
            showToast(err.message === 'Song already in playlist' ? 'Already in playlist' : 'Failed to add', 'error');
          }
          closeSongCtxMenu();
        });
      });
    }
    // Position picker next to ctx menu
    const ctxRect = ctxMenu.getBoundingClientRect();
    playlistPicker.style.top = `${ctxRect.top}px`;
    playlistPicker.style.left = `${ctxRect.right + 4}px`;
    if (parseFloat(playlistPicker.style.left) + 220 > window.innerWidth) {
      playlistPicker.style.left = `${ctxRect.left - 224}px`;
    }
    playlistPicker.classList.remove('hidden');
  });

  // Search
  let searchTimeout = null;
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (!q) {
      navigateTo('home');
      return;
    }
    searchTimeout = setTimeout(async () => {
      showView('search');
      try {
        const results = await API.search(q);
        UI.renderSearchResults(results);
      } catch (e) {
        document.getElementById('search-results').innerHTML = '<div class="search-no-results">Search failed.</div>';
      }
    }, 350);
  });

  // Refresh home on song played
  document.addEventListener('songPlayed', () => {
    if (currentView === 'home') {
      UI.renderHomeView();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      Player.togglePlay();
    }
    if (e.code === 'ArrowRight') Player.next();
    if (e.code === 'ArrowLeft') Player.prev();
  });
});
