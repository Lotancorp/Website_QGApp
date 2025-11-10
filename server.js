// server.js
const express = require('express');
const cloudinary = require('./cloudinary_setup');
const app = express();
const PORT = 3000;

// Route untuk ambil daftar file di folder tertentu
app.get('/api/list/:folderName', async (req, res) => {
  const folderName = req.params.folderName;

  try {
    const result = await cloudinary.search
      .expression(`folder:${folderName}`)
      .sort_by('public_id', 'desc')
      .max_results(50)
      .execute();

    res.json(result.resources);
  } catch (err) {
    console.error('❌ Error fetching list:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
