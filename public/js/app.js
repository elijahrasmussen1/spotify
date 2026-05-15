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
}

// ─── Image preview helpers ────────────────────────────────────────────────────
function setupImagePreview(inputId, previewId, placeholderId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const placeholder = document.getElementById(placeholderId);

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    // createObjectURL always returns a blob: URL — safe to assign to src
    if (url.startsWith('blob:')) {
      preview.src = url;
    }
    preview.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
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

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  Player.init();

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
