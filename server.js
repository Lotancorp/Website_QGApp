// server.js
const express = require('express');
const cloudinary = require('cloudinary').v2;

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: 'dintq8uyxx',
  api_key: '747469656774754',
  api_secret: 'btQR3ERLCZRB0bl9v8yLXlGKNKQ'
});

const app = express();
const PORT = 3000;

// Agar file statis (HTML, CSS, JS) di folder 'public' bisa diakses
app.use(express.static('public'));

// Endpoint untuk mengambil daftar gambar di Cloudinary
app.get('/api/gallery', async (req, res) => {
  try {
    // Misal kita ingin ambil semua gambar dari folder 'QuartzGallery'
    // Ganti prefix jika kamu punya nama folder lain.
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'QuartzGallery/', 
      max_results: 100
    });

    // result.resources akan berisi daftar objek gambar.
    // Kita kirim ke front-end dalam format JSON.
    res.json(result.resources);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
