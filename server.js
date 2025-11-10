// server.js (debug version)
require('dotenv').config({ path: './cloudinary.env' });
const express = require('express');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

console.log('--- START DEBUG SERVER ---');
console.log('Node version:', process.version);
console.log('cwd:', process.cwd());

// 1) Show trimmed CLOUDINARY_URL presence
console.log('CLOUDINARY_URL present:', !!process.env.CLOUDINARY_URL);
if (process.env.CLOUDINARY_URL) {
  console.log('CLOUDINARY_URL (start):', process.env.CLOUDINARY_URL.slice(0, 60) + '...');
}

// 2) Configure cloudinary (if CLOUDINARY_URL exists)
if (process.env.CLOUDINARY_URL) {
  try {
    cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL });
  } catch (e) {
    console.error('cloudinary.config() error:', e && e.message);
  }
}
console.log('cloudinary.config().cloud_name:', cloudinary.config().cloud_name);

// Helper: safe call to root_folders
async function tryRootFolders() {
  try {
    const root = await cloudinary.api.root_folders();
    console.log('root_folders OK. count:', (root.folders || []).length);
    return root.folders || [];
  } catch (err) {
    console.error('root_folders ERROR:', err && (err.message || err));
    return { error: err && err.message ? String(err.message) : String(err) };
  }
}

// ganti resourcesFor dan bagian loop di /api/folders dengan ini
async function resourcesFor(prefix) {
  try {
    const r = await cloudinary.api.resources({
      prefix,
      max_results: 100,
      resource_type: 'all',
      type: 'upload'
    });
    return { ok: true, count: (r.resources || []).length, resourcesSample: (r.resources || []).slice(0,5) };
  } catch (e) {
    // coba periksa properti error yang umum
    const details = {
      message: e.message,
      name: e.name,
      http_code: e.http_code || e.statusCode || null,
      provider_response: e.http_response && e.http_response.body ? e.http_response.body : (e.response ? e.response : null),
      raw: e
    };
    console.error('resourcesFor ERROR for prefix:', prefix, '\n', JSON.stringify(details, null, 2));
    return { ok: false, error: details };
  }
}

// di route /api/folders: gunakan juga alternatif search jika resourcesFor gagal
app.get('/api/folders', async (req, res) => {
  try {
    const cloudName = cloudinary.config().cloud_name || null;
    const root = await tryRootFolders();
    if (!Array.isArray(root)) return res.json({ cloudName, rootError: root });

    const items = [];
    for (const f of root) {
      const path = f.path || f.name;
      const prefix = path.endsWith('/') ? path : path + '/';
      const info = await resourcesFor(prefix);

      // Jika gagal, coba fallback Search API (expression) dan juga coba prefix tanpa trailing slash
      let fallback = null;
      if (!info.ok) {
        try {
          const expr = `folder:"${path}"`;
          const s = await cloudinary.search.expression(expr).max_results(100).execute();
          fallback = { method: 'search.expression', total: s.total_count, sample: (s.resources || []).slice(0,5) };
        } catch (se) {
          fallback = { method: 'search.expression', error: se.message || String(se) };
        }

        // juga coba resources with prefix without trailing slash
        try {
          const r2 = await cloudinary.api.resources({
            prefix: path, // tanpa trailing '/'
            max_results: 100,
            resource_type: 'all',
            type: 'upload'
          });
          // jika sukses, set info accordingly
          info.fallbackPrefixNoSlash = { ok: true, count: (r2.resources || []).length, sample: (r2.resources || []).slice(0,5) };
        } catch (e2) {
          info.fallbackPrefixNoSlash = { ok: false, error: e2.message || String(e2) };
        }
      }

      items.push({ name: f.name, path, resources: info, fallback });
    }

    res.json({ cloudName, folders: items });
  } catch (err) {
    console.error('UNHANDLED ERROR in /api/folders:', err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
});
// Tambahkan route ini ke server.js (sebelum app.listen)
// /api/list/:folderName (versi minimal, hanya return secure_url)
app.get('/api/list/:folderName', async (req, res) => {
  const folder = decodeURIComponent(req.params.folderName);
  console.log('Fetching secure_url list for:', folder);

  try {
    // cari pakai Search API (ini yang tadi berhasil)
    const result = await cloudinary.search
      .expression(`folder:"${folder}"`)
      .max_results(100)
      .execute();

    // ambil hanya bagian secure_url
    const urls = (result.resources || [])
      .filter(r => r.secure_url) // pastikan punya URL
      .map(r => r.secure_url);

    res.json(urls); // kirim array URL saja
  } catch (err) {
    console.error('Error fetching secure URLs:', err);
    res.status(500).json({ error: err.message });
  }
});



// Extra debug endpoint: try to upload a tiny test (comment out after use)
app.get('/api/debug-upload-test', async (req, res) => {
  try {
    // hati-hati — hanya jalankan jika kamu punya file di path ini
    // ubah ke path file lokal yang pasti ada, misal C:\\Users\\Ezio Auditore\\Desktop\\test.jpg
    const localPath = req.query.path;
    if (!localPath) return res.json({ error: 'provide path query ?path=C:\\\\path\\\\to\\\\file.jpg'});

    const up = await cloudinary.uploader.upload(localPath, {
      folder: 'Empire_Kingdom'
    });
    res.json({ ok: true, public_id: up.public_id, url: up.secure_url });
  } catch (e) {
    console.error('UPLOAD TEST ERROR:', e);
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Debug server running on http://localhost:${PORT}`);
});
