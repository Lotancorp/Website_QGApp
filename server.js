// server.js
require('dotenv').config({ path: './cloudinary.env' }); // or .env
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors()); // allow local dev; restrict in production

const CLOUDINARY_URL = process.env.CLOUDINARY_URL;
if (!CLOUDINARY_URL) {
  console.error('Please add CLOUDINARY_URL to cloudinary.env');
  process.exit(1);
}
const m = CLOUDINARY_URL.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
if (!m) {
  console.error('CLOUDINARY_URL format invalid');
  process.exit(1);
}
const [, API_KEY, API_SECRET, CLOUD_NAME] = m;

// helper: call Cloudinary Search API to find resources in a folder
async function cloudinarySearchFolder(folderName) {
  // folderName expected like 'Future Armor' or 'Future_Armor' - we'll use exact match
  // Cloudinary Search API expression for folder: folder:"Folder Name"
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/search`;
  const auth = { username: API_KEY, password: API_SECRET };
  // expression: folder:"Future Armor"
  // Allow up to 500 results (adjust if needed)
  const body = {
    expression: `folder:"${folderName}"`,
    max_results: 500
  };
  const res = await axios.post(endpoint, body, { auth, timeout: 15000 });
  return res.data; // contains resources array
}

app.get('/api/list/:folder', async (req, res) => {
  try {
    // folder param may be underscored; decode to original folder name
    const raw = req.params.folder || '';
    const folderDecoded = raw.replace(/_/g, ' ');
    const data = await cloudinarySearchFolder(folderDecoded);
    const resources = Array.isArray(data.resources) ? data.resources : [];
    const urls = resources.map(r => r.secure_url).filter(Boolean);
    return res.json({ ok: true, count: urls.length, urls });
  } catch (err) {
    console.error('Server /api/list error:', err.response?.data || err.message);
    return res.status(500).json({ ok: false, error: String(err.response?.data || err.message) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Cloudinary proxy running on http://localhost:${PORT}`));
