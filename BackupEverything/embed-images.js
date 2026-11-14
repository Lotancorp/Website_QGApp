// embed-images.js
// Usage: node embed-images.js
// Requires: axios (npm i axios)
// It will create a backup products.html.bak then replace the JSON inside <script id="product-data"> ... </script>

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const FILE = path.join(__dirname, 'products.html');
if (!fs.existsSync(FILE)) {
  console.error('products.html not found in current folder:', FILE);
  process.exit(1);
}

const raw = fs.readFileSync(FILE, 'utf8');

// extract JSON inside <script id="product-data" type="application/json">...</script>
const re = /<script\s+id=["']product-data["'][\s\S]*?>([\s\S]*?)<\/script>/i;
const m = raw.match(re);
if (!m) {
  console.error('product-data script tag not found.');
  process.exit(1);
}

let jsonText = m[1].trim();
let arr;
try {
  arr = JSON.parse(jsonText);
} catch (e) {
  console.error('Failed to parse JSON inside product-data:', e.message);
  process.exit(1);
}

(async () => {
  const updated = [];
  for (const p of arr) {
    const copy = Object.assign({}, p);
    if (copy.cloud_folder && (!Array.isArray(copy.images) || !copy.images.length)) {
      const folder = copy.cloud_folder;
      const proxy = `http://localhost:3000/api/list/${encodeURIComponent(folder)}`;
      console.log('Fetching images for folder', folder);
      try {
        const res = await axios.get(proxy, { timeout: 15000 });
        if (res.data && Array.isArray(res.data.urls) && res.data.urls.length) {
          copy.images = res.data.urls.slice(0, 10); // limit 10
          // optionally remove cloud_folder
          delete copy.cloud_folder;
          console.log(` -> got ${copy.images.length} images`);
        } else {
          console.warn(` -> no urls returned for ${folder}`, res.data && res.data);
        }
      } catch (err) {
        console.warn(` -> failed to fetch ${proxy}:`, err.message);
      }
    }
    updated.push(copy);
  }

  // write backup
  const bak = FILE + '.bak_' + Date.now();
  fs.writeFileSync(bak, raw, 'utf8');
  console.log('Backup written to', bak);

  // build new script tag
  const newJson = JSON.stringify(updated, null, 2);
  const newScript = `<script id="product-data" type="application/json">\n${newJson}\n</script>`;

  // replace old script with new script
  const newRaw = raw.replace(re, newScript);
  fs.writeFileSync(FILE, newRaw, 'utf8');
  console.log('products.html updated with embedded images (cloud_folder -> images).');
})();
