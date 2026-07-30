const express = require('express');
const multer = require('multer');
const Database = require('better-sqlite3');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TOP_SONGS_CACHE_SECONDS = 3600;

// ─── Ensure directories exist ───────────────────────────────────────────────
const dirs = [
  './database',
  './uploads',
  './uploads/artists',
  './uploads/songs',
  './uploads/covers',
];
dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

// ─── Database setup ──────────────────────────────────────────────────────────
const db = new Database('./database/audiohaven.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS artists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    picture TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    cover_art TEXT,
    year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES artists(id)
  );

  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_id INTEGER NOT NULL,
    album_id INTEGER,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    cover_art TEXT,
    features TEXT,
    year INTEGER,
    plays INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artist_id) REFERENCES artists(id),
    FOREIGN KEY (album_id) REFERENCES albums(id)
  );

  CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (song_id) REFERENCES songs(id)
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    cover_art TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    position INTEGER DEFAULT 0,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
  );
`);

// ─── Multer storage ──────────────────────────────────────────────────────────
function makeStorage(dest) {
  return multer.diskStorage({
    destination: dest,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, Date.now() + ext);
    },
  });
}

const uploadArtist = multer({
  storage: makeStorage('./uploads/artists'),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE.has(ext)) return cb(new Error('Invalid image file type'));
    cb(null, true);
  },
});
const uploadCover = multer({
  storage: makeStorage('./uploads/covers'),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE.has(ext)) return cb(new Error('Invalid image file type'));
    cb(null, true);
  },
});

const ALLOWED_AUDIO = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a']);
const ALLOWED_IMAGE = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

const uploadSongFields = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'songFile') cb(null, './uploads/songs');
      else cb(null, './uploads/covers');
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, Date.now() + '_' + file.fieldname + ext);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'songFile' && !ALLOWED_AUDIO.has(ext)) {
      return cb(new Error('Invalid audio file type'));
    }
    if (file.fieldname === 'coverArt' && !ALLOWED_IMAGE.has(ext)) {
      return cb(new Error('Invalid image file type'));
    }
    cb(null, true);
  },
});

const uploadAlbumFields = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, './uploads/covers');
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, Date.now() + '_' + file.fieldname + ext);
    },
  }),
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static('./public'));
app.use('/uploads', express.static('./uploads'));

// Rate limiting: 200 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// ─── Helper ───────────────────────────────────────────────────────────────────
function songWithArtist(song) {
  if (!song) return null;
  const artist = db.prepare('SELECT * FROM artists WHERE id = ?').get(song.artist_id);
  const album = song.album_id
    ? db.prepare('SELECT * FROM albums WHERE id = ?').get(song.album_id)
    : null;
  return { ...song, artist, album };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ARTIST ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/artists', (req, res) => {
  const artists = db.prepare('SELECT * FROM artists ORDER BY name ASC').all();
  res.json(artists);
});

app.post('/api/artists', uploadArtist.single('picture'), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const picture = req.file ? `/uploads/artists/${req.file.filename}` : null;
  const result = db.prepare('INSERT INTO artists (name, picture) VALUES (?, ?)').run(name, picture);
  const artist = db.prepare('SELECT * FROM artists WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(artist);
});

app.get('/api/artists/:id', (req, res) => {
  const artist = db.prepare('SELECT * FROM artists WHERE id = ?').get(req.params.id);
  if (!artist) return res.status(404).json({ error: 'Artist not found' });
  const songs = db
    .prepare('SELECT * FROM songs WHERE artist_id = ? ORDER BY plays DESC')
    .all(artist.id);
  const albums = db
    .prepare('SELECT * FROM albums WHERE artist_id = ? ORDER BY year DESC, created_at DESC')
    .all(artist.id);
  res.json({ ...artist, songs: songs.map(songWithArtist), albums });
});

app.delete('/api/artists/:id', (req, res) => {
  const artist = db.prepare('SELECT * FROM artists WHERE id = ?').get(req.params.id);
  if (!artist) return res.status(404).json({ error: 'Artist not found' });

  // Delete picture file
  if (artist.picture) {
    const p = '.' + artist.picture;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Delete songs and their files
  const songs = db.prepare('SELECT * FROM songs WHERE artist_id = ?').all(artist.id);
  songs.forEach(song => {
    if (song.file_path) {
      const p = '.' + song.file_path;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    if (song.cover_art) {
      const p = '.' + song.cover_art;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    db.prepare('DELETE FROM play_history WHERE song_id = ?').run(song.id);
  });

  db.prepare('DELETE FROM songs WHERE artist_id = ?').run(artist.id);
  db.prepare('DELETE FROM albums WHERE artist_id = ?').run(artist.id);
  db.prepare('DELETE FROM artists WHERE id = ?').run(artist.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ALBUM ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/albums', (req, res) => {
  const albums = db
    .prepare(
      `SELECT albums.*, artists.name AS artist_name, artists.picture AS artist_picture
       FROM albums JOIN artists ON albums.artist_id = artists.id
       ORDER BY albums.created_at DESC`
    )
    .all();
  res.json(albums);
});

app.post('/api/albums', uploadAlbumFields.single('coverArt'), (req, res) => {
  const { artistId, name, year } = req.body;
  if (!artistId || !name) return res.status(400).json({ error: 'artistId and name are required' });
  const cover_art = req.file ? `/uploads/covers/${req.file.filename}` : null;
  const yearInt = year ? (parseInt(year, 10) || null) : null;
  const result = db
    .prepare('INSERT INTO albums (artist_id, name, cover_art, year) VALUES (?, ?, ?, ?)')
    .run(artistId, name, cover_art, yearInt);
  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(album);
});

app.get('/api/albums/:id', (req, res) => {
  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(req.params.id);
  if (!album) return res.status(404).json({ error: 'Album not found' });
  const artist = db.prepare('SELECT * FROM artists WHERE id = ?').get(album.artist_id);
  const songs = db
    .prepare('SELECT * FROM songs WHERE album_id = ? ORDER BY created_at ASC')
    .all(album.id);
  res.json({ ...album, artist, songs: songs.map(songWithArtist) });
});

app.delete('/api/albums/:id', (req, res) => {
  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(req.params.id);
  if (!album) return res.status(404).json({ error: 'Album not found' });
  if (album.cover_art) {
    const p = '.' + album.cover_art;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.prepare('UPDATE songs SET album_id = NULL WHERE album_id = ?').run(album.id);
  db.prepare('DELETE FROM albums WHERE id = ?').run(album.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SONG ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/songs', (req, res) => {
  const songs = db
    .prepare(
      `SELECT songs.*, artists.name AS artist_name, artists.picture AS artist_picture
       FROM songs JOIN artists ON songs.artist_id = artists.id
       ORDER BY songs.created_at DESC`
    )
    .all();
  res.json(songs);
});

app.post(
  '/api/songs',
  uploadSongFields.fields([
    { name: 'songFile', maxCount: 1 },
    { name: 'coverArt', maxCount: 1 },
  ]),
  async (req, res) => {
    const { artistId, name, features, year, albumId, newAlbumName } = req.body;
    if (!artistId || !name) return res.status(400).json({ error: 'artistId and name are required' });
    if (!req.files || !req.files['songFile']) {
      return res.status(400).json({ error: 'songFile is required' });
    }

    const file_path = `/uploads/songs/${req.files['songFile'][0].filename}`;
    const cover_art = req.files['coverArt']
      ? `/uploads/covers/${req.files['coverArt'][0].filename}`
      : null;

    const yearInt = year ? (parseInt(year, 10) || null) : null;
    let resolvedAlbumId = albumId && albumId !== '' ? parseInt(albumId) : null;

    // Create new album if requested
    if (newAlbumName && newAlbumName.trim()) {
      const albumResult = db
        .prepare('INSERT INTO albums (artist_id, name, cover_art, year) VALUES (?, ?, ?, ?)')
        .run(artistId, newAlbumName.trim(), cover_art, yearInt);
      resolvedAlbumId = albumResult.lastInsertRowid;
    }

    const featuresStr = features || null;

    const result = db
      .prepare(
        'INSERT INTO songs (artist_id, album_id, name, file_path, cover_art, features, year) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(artistId, resolvedAlbumId, name, file_path, cover_art, featuresStr, yearInt);

    const song = songWithArtist(
      db.prepare('SELECT * FROM songs WHERE id = ?').get(result.lastInsertRowid)
    );
    res.status(201).json(song);
  }
);

app.get('/api/songs/:id', (req, res) => {
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });
  res.json(songWithArtist(song));
});

app.post('/api/songs/:id/play', (req, res) => {
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });
  db.prepare('UPDATE songs SET plays = plays + 1 WHERE id = ?').run(song.id);
  db.prepare('INSERT INTO play_history (song_id) VALUES (?)').run(song.id);
  const updated = db.prepare('SELECT * FROM songs WHERE id = ?').get(song.id);
  res.json(songWithArtist(updated));
});

app.delete('/api/songs/:id', (req, res) => {
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
  if (!song) return res.status(404).json({ error: 'Song not found' });
  if (song.file_path) {
    const p = '.' + song.file_path;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  if (song.cover_art) {
    const p = '.' + song.cover_art;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.prepare('DELETE FROM play_history WHERE song_id = ?').run(song.id);
  db.prepare('DELETE FROM songs WHERE id = ?').run(song.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  HISTORY & SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/history', (req, res) => {
  const rows = db
    .prepare(
      `SELECT ph.played_at, s.*, a.name AS artist_name, a.picture AS artist_picture,
              al.name AS album_name, al.cover_art AS album_cover_art
       FROM play_history ph
       JOIN songs s ON ph.song_id = s.id
       JOIN artists a ON s.artist_id = a.id
       LEFT JOIN albums al ON s.album_id = al.id
       ORDER BY ph.played_at DESC
       LIMIT 50`
    )
    .all();

  // Deduplicate by song id, keep last 20 distinct
  const seen = new Set();
  const distinct = [];
  for (const row of rows) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      distinct.push(row);
    }
    if (distinct.length >= 20) break;
  }
  res.json(distinct);
});

app.get('/api/top-songs', (req, res) => {
  const songs = db
    .prepare(
      `SELECT songs.*, artists.name AS artist_name, artists.picture AS artist_picture
       FROM songs JOIN artists ON songs.artist_id = artists.id
       WHERE songs.plays > 0
       ORDER BY songs.plays DESC
       LIMIT 10`
    )
    .all();
  res.set('Cache-Control', `public, max-age=${TOP_SONGS_CACHE_SECONDS}`);
  res.json(songs);
});

app.get('/api/search', (req, res) => {
  const q = `%${(req.query.q || '').toLowerCase()}%`;
  const artists = db
    .prepare('SELECT * FROM artists WHERE LOWER(name) LIKE ?')
    .all(q);
  const songs = db
    .prepare(
      `SELECT songs.*, artists.name AS artist_name
       FROM songs JOIN artists ON songs.artist_id = artists.id
       WHERE LOWER(songs.name) LIKE ?`
    )
    .all(q);
  const albums = db
    .prepare(
      `SELECT albums.*, artists.name AS artist_name
       FROM albums JOIN artists ON albums.artist_id = artists.id
       WHERE LOWER(albums.name) LIKE ?`
    )
    .all(q);
  res.json({ artists, songs, albums });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PLAYLIST ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/playlists', (req, res) => {
  const playlists = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all();
  res.json(playlists);
});

app.post('/api/playlists', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS c FROM playlists').get().c;
  const name = `My Playlist #${count + 1}`;
  const result = db.prepare('INSERT INTO playlists (name) VALUES (?)').run(name);
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(playlist);
});

app.get('/api/playlists/:id', (req, res) => {
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  const songs = db
    .prepare(
      `SELECT s.*, a.name AS artist_name, a.picture AS artist_picture,
              ps.id AS playlist_song_id, ps.position
       FROM playlist_songs ps
       JOIN songs s ON ps.song_id = s.id
       JOIN artists a ON s.artist_id = a.id
       WHERE ps.playlist_id = ?
       ORDER BY ps.position ASC, ps.added_at ASC`
    )
    .all(playlist.id);
  res.json({ ...playlist, songs });
});

app.patch('/api/playlists/:id', uploadCover.single('coverArt'), (req, res) => {
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

  const name = req.body.name !== undefined ? req.body.name.trim() || playlist.name : playlist.name;
  const description = req.body.description !== undefined ? req.body.description : playlist.description;
  let cover_art = playlist.cover_art;

  if (req.file) {
    if (playlist.cover_art) {
      const p = '.' + playlist.cover_art;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    cover_art = `/uploads/covers/${req.file.filename}`;
  }

  db.prepare('UPDATE playlists SET name = ?, description = ?, cover_art = ? WHERE id = ?')
    .run(name, description || null, cover_art, playlist.id);
  const updated = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlist.id);
  res.json(updated);
});

app.delete('/api/playlists/:id', (req, res) => {
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  if (playlist.cover_art) {
    const p = '.' + playlist.cover_art;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ?').run(playlist.id);
  db.prepare('DELETE FROM playlists WHERE id = ?').run(playlist.id);
  res.json({ success: true });
});

app.post('/api/playlists/:id/songs', (req, res) => {
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  const { songId } = req.body;
  if (!songId) return res.status(400).json({ error: 'songId is required' });
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(songId);
  if (!song) return res.status(404).json({ error: 'Song not found' });
  const existing = db
    .prepare('SELECT id FROM playlist_songs WHERE playlist_id = ? AND song_id = ?')
    .get(playlist.id, songId);
  if (existing) return res.status(409).json({ error: 'Song already in playlist' });
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), 0) AS m FROM playlist_songs WHERE playlist_id = ?')
    .get(playlist.id).m;
  db.prepare('INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)')
    .run(playlist.id, songId, maxPos + 1);
  res.status(201).json({ success: true });
});

app.delete('/api/playlists/:id/songs/:songId', (req, res) => {
  const result = db
    .prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?')
    .run(req.params.id, req.params.songId);
  if (!result.changes) return res.status(404).json({ error: 'Song not in playlist' });
  res.json({ success: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`AudioHaven running at http://localhost:${PORT}`);
});
