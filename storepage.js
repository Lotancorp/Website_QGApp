// storepage.js (fixed)
// single-file unified init: load products, attach events, handle contact & gallery

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let products = [];
let currency = 'usd'; // default
let filtered = [];
let shortlist = []; // list ID produk yang di-shortlist
// --- Detect initial currency based on browser locale/timezone + saved pref ---
function detectInitialCurrency() {
  // 1) Kalau user sudah pernah pilih currency, hormati pilihan dia
  try {
    if (window.localStorage) {
      const saved = localStorage.getItem('qg_currency');
      if (saved === 'usd' || saved === 'idr') return saved;
    }
  } catch (e) {
    // ignore
  }

  // 2) Heuristik Indonesia
  try {
    const primaryLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    const langs = (navigator.languages || []).map(l => String(l).toLowerCase());
    const allLangs = [primaryLang, ...langs].join(' ');
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();

    const isIndonesianLang =
      primaryLang.startsWith('id') ||
      langs.some(l => l.startsWith('id')) ||
      allLangs.includes('id-id');

    const isIndonesianTz =
      tz.startsWith('asia/jakarta') ||
      tz.startsWith('asia/makassar') ||
      tz.startsWith('asia/jayapura');

    if (isIndonesianLang || isIndonesianTz) {
      return 'idr';
    }
  } catch (e) {
    // kalau gagal, biarin
  }

  // default global
  return 'usd';
}

// ----------------- load products -----------------
// ----------------- load products -----------------
async function loadProducts() {
  try {
    const res = await fetch('products.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    products = await res.json();
    window.products = products;
    console.log('Loaded from products.json:', products);
  } catch (err) {
    console.warn('Error loading products.json, fallback to inline:', err);
    // fallback jika ada <script id="product-data">
    const inline = document.getElementById('product-data');
    if (inline) {
      try {
        products = JSON.parse(inline.textContent);
        window.products = products;
      } catch (e) {
        console.error('Invalid JSON in inline product-data', e);
        products = [];
      }
    } else {
      products = [];
    }
  }
}




// ----------------- BANNER SLIDER -----------------
let banners = [];
let bannerIndex = 0;
let bannerTimer = null;
const BANNER_AUTOPLAY_MS = 4500; // interval autoplay

async function loadBanners() {
  // expect a file 'banners.html' with <script id="banner-data" type="application/json">[...]</script>
  try {
    const res = await fetch('banners.html', {cache: "no-store"});
    const txt = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(txt, 'text/html');
    const script = doc.getElementById('banner-data');
    if (!script) { banners = []; return; }
    const raw = JSON.parse(script.textContent);
    // take up to 10 and only keep those with non-empty image
    banners = (Array.isArray(raw) ? raw.slice(0,10) : []).filter(b => b && b.image && b.image.trim());
  } catch (err) {
    console.warn('Failed to load banners:', err);
    banners = [];
  }
  renderBannerSlider();
}

function renderBannerSlider() {
  const track = document.getElementById('bannerTrack');
  const indicators = document.getElementById('bannerIndicators');
  const slider = document.getElementById('bannerSlider');
  if (!track || !indicators || !slider) return;

  // empty
  track.innerHTML = '';
  indicators.innerHTML = '';

  if (!banners.length) {
    // hide slider if none
    slider.style.display = 'none';
    return;
  } else {
    slider.style.display = 'block';
  }

  banners.forEach((b, idx) => {
    const slide = document.createElement('div');
    slide.className = 'banner-slide';
    slide.setAttribute('role','listitem');
    // image
    const img = document.createElement('img');
    img.src = b.image;
    img.alt = b.alt || `Banner ${idx+1}`;
    slide.appendChild(img);
    // optional caption if provided
    if (b.caption) {
      const cap = document.createElement('div');
      cap.className = 'banner-caption';
      cap.textContent = b.caption;
      slide.appendChild(cap);
    }
    // if banner has link, wrap click to open
    if (b.link && b.link.trim()) {
      slide.style.cursor = 'pointer';
      slide.addEventListener('click', () => { window.open(b.link, '_blank'); });
    }
    track.appendChild(slide);

    // indicators
    const dot = document.createElement('button');
    dot.className = 'banner-dot';
    dot.type = 'button';
    dot.addEventListener('click', () => {
      goToBanner(idx);
      resetAutoplay();
    });
    indicators.appendChild(dot);
  });

  // initial position
  bannerIndex = 0;
  updateBannerPosition();
  startAutoplay();

  // attach prev/next
  const prev = document.getElementById('bannerPrev');
  const next = document.getElementById('bannerNext');
  if (prev) prev.onclick = () => { goToBanner(bannerIndex - 1); resetAutoplay(); };
  if (next) next.onclick = () => { goToBanner(bannerIndex + 1); resetAutoplay(); };
}

function updateBannerPosition() {
  const track = document.getElementById('bannerTrack');
  const dots = Array.from(document.querySelectorAll('.banner-dot'));
  if (!track) return;
  const offset = -bannerIndex * track.clientWidth;
  // better: use transform % (since slides are 100% width)
  track.style.transform = `translateX(-${bannerIndex * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle('active', i === bannerIndex));
}

function goToBanner(i) {
  if (!banners.length) return;
  bannerIndex = ((i % banners.length) + banners.length) % banners.length;
  updateBannerPosition();
}

function startAutoplay() {
  stopAutoplay();
  bannerTimer = setInterval(() => {
    goToBanner(bannerIndex + 1);
  }, BANNER_AUTOPLAY_MS);
}

function stopAutoplay() {
  if (bannerTimer) { clearInterval(bannerTimer); bannerTimer = null; }
}

function resetAutoplay() {
  stopAutoplay();
  startAutoplay();
}

// pause autoplay on hover
document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('bannerSlider');
  if (!slider) return;
  slider.addEventListener('mouseenter', () => stopAutoplay());
  slider.addEventListener('mouseleave', () => startAutoplay());
});

// ----------------- utilities -----------------
function formatPrice(p) {
  if (currency === 'usd') return `$${Number(p).toFixed(2)}`;
  return `Rp ${Number(p).toLocaleString('id-ID')}`;
}

function safeQuery(sel) {
  const el = document.querySelector(sel);
  return el;
}
// ---- Shortlist helpers ----
function loadShortlist() {
  try {
    const raw = localStorage.getItem('qg_shortlist');
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.map(x => String(x));
  } catch (e) {}
  return [];
}

function saveShortlist() {
  try {
    localStorage.setItem('qg_shortlist', JSON.stringify(shortlist));
  } catch (e) {}
}

function isInShortlist(id) {
  return shortlist.includes(String(id));
}

function updateShortlistBadge() {
  const el = document.getElementById('shortlistCount');
  const btn = document.getElementById('shortlistBtn');

  const mobileBadge = document.getElementById('mobileShortlistCount');
  const mobileBtn   = document.getElementById('mobileCartBtn');

  const count = shortlist.length;

  // badge di topbar (desktop)
  if (el) {
    el.textContent = count;
  }
  if (btn) {
    btn.classList.toggle('has-items', count > 0);
  }

  // badge di floating button (mobile)
  if (mobileBadge) {
    mobileBadge.textContent = count;
  }
  if (mobileBtn) {
    mobileBtn.classList.toggle('has-items', count > 0);
  }
}



function buildShortlistTextForMessage() {
  if (!shortlist.length) return '';

  const items = shortlist
    .map(id => products.find(p => String(p.id) === String(id)))
    .filter(Boolean);

  if (!items.length) return '';

  const lines = [];
  lines.push("Hi, I'm interested in these skins:");
  items.forEach((p, idx) => {
    lines.push(`${idx + 1}. [${p.id}] ${p.name}`);
  });

  const noteEl = document.getElementById('shortlistNote');
  const extra = noteEl && noteEl.value.trim();
  if (extra) {
    lines.push('', 'Note:', extra);
  }

  return lines.join('\n');
}


function openShortlistModal() {
  const modal = document.getElementById('shortlistModal');
  const listEl = document.getElementById('shortlistItems');
  if (!modal || !listEl) return;

  if (!shortlist.length) {
    listEl.innerHTML = '<p class="muted">Your cart is still empty.</p>';
  } else {
    const items = shortlist
      .map(id => products.find(p => String(p.id) === String(id)))
      .filter(Boolean);

    listEl.innerHTML = items
      .map(
        (p, idx) => `
        <div class="cart-item-row" data-id="${p.id}">
          <span class="cart-item-name">${idx + 1}. ${p.name}</span>
          <button type="button"
                  class="cart-item-remove"
                  data-id="${p.id}"
                  aria-label="Remove from cart">&times;</button>
        </div>
      `
      )
      .join('');
  }

  modal.setAttribute('aria-hidden', 'false');
}


function closeShortlistModal() {
  const modal = document.getElementById('shortlistModal');
  if (modal) modal.setAttribute('aria-hidden', 'true');
}

// Helper: pastikan URL Cloudinary pakai f_auto,q_auto (tanpa dobel)
function ensureCloudAuto(url) {
  if (!url || typeof url !== 'string') return url;
  // kalau bukan Cloudinary, jangan diutak-atik
  if (!url.includes('res.cloudinary.com')) return url;
  // kalau sudah ada f_auto atau q_auto, biarin aja
  if (url.includes('f_auto') || url.includes('q_auto')) return url;
  // sisipkan setelah /upload/
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
}
// ---------- Cloudinary / proxy image loader ----------
// Tries explicit product.images first; else calls local proxy server which in turn calls Cloudinary Search API.
// If you deploy proxy elsewhere, change PROXY_BASE.
const PROXY_BASE = 'http://localhost:3000'; // change to your deployed URL later

async function loadImagesForProduct(product) {
  if (!product) return [];

  if (Array.isArray(product.images) && product.images.length) {
    // pastikan semua URL Cloudinary sudah optimized
    return product.images.map(src => ensureCloudAuto(src));
  }

  return [];
}



// ----------------- render -----------------
function render(list) {
  const grid = $('#productGrid');
  const empty = $('#emptyState');
  if (!grid) return;
  grid.innerHTML = '';

  if (!list || !list.length) {
    if (empty) empty.hidden = false;
    return;
  } else {
    if (empty) empty.hidden = true;
  }

  list.forEach(p => {
    const el = document.createElement('article');
    el.className = 'card' + (p.featured ? ' featured' : '');

    // --- thumbnail priority logic ---
    let thumbSrc = p.thumbnail || (p.images && p.images.length ? p.images[0] : '') || 'assets/placeholder-thumb.jpg';
    thumbSrc = ensureCloudAuto(thumbSrc);
    const youtubeBtn = p.youtube
      ? `<a class="btn-outline btn-youtube" href="${p.youtube}" target="_blank" rel="noopener">YouTube</a>`
      : '';
    const inShortlist = isInShortlist(p.id);
    const cartLabel = inShortlist ? 'Remove' : 'Add to Cart';
    // build rating HTML (structured)
    //let rateHtml = '';
    // ---- Build rating using SVG with per-star fill percent (precise) ----
    const rawRate = Number(p.rate) || 0; // 4.3 etc
    const rateClamped = Math.max(0, Math.min(5, rawRate)); // clamp 0..5
    const maxStars = 5;

    // helper: svg star path (5-point) and per-star clip
    const starPath = "M12 .587l3.668 7.431 8.2 1.192-5.934 5.788 1.402 8.17L12 18.896l-7.336 3.869 1.402-8.17L.132 9.21l8.2-1.192L12 .587z";

    function starSvgWithFill(fillPercent, uid) {
      const clipId = `clip-${uid}`;
      const pFill = Math.max(0, Math.min(100, Math.round(fillPercent * 100) / 100)); // round small eps
      if (pFill === 100) {
        return `<svg class="star-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="${starPath}" fill="#FFD700"/></svg>`;
      }
      if (pFill === 0) {
        return `<svg class="star-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="${starPath}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/></svg>`;
      }
      // partial: draw empty star outline, then filled star clipped to percentage width
      return `<svg class="star-svg" viewBox="0 0 24 24" aria-hidden="true">
        <defs><clipPath id="${clipId}"><rect x="0" y="0" width="${pFill}%" height="100%"></rect></clipPath></defs>
        <path d="${starPath}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
        <path d="${starPath}" fill="#FFD700" clip-path="url(#${clipId})"/>
      </svg>`;
    }

    // build five stars with per-star fill percent
    let s = '';
    const uid = Math.random().toString(36).slice(2,9);
    for (let i = 0; i < maxStars; i++) {
      const starFill = Math.max(0, Math.min(1, rateClamped - i)); // value in [0,1]
      s += starSvgWithFill(starFill * 100, uid + '-' + i);
    }
    const displayRate = rateClamped > 0 ? `(${rateClamped.toFixed(1)}/5)` : '';
    const rateHtml = `<div class="rating-row"><div class="stars">${s}</div><div class="rate-value">${displayRate}</div></div>`;
    const catLabel = (p.cat || 'skin').toLowerCase();
    const seoAlt = `${p.name} RF Online ${catLabel} skin by Quartz Gallery`;

      el.innerHTML = `
      <div class="thumb" aria-hidden="true">
        <img class="card-thumb"
            data-thumb-id="${p.id}"
            src="${thumbSrc}"
            alt="${seoAlt}"
            loading="lazy">

      </div>
      <h4>${p.name}</h4>
      <p class="muted excerpt">${p.desc || ''}</p>

    
      <div class="price">
        <div class="badge">${p.rarity || 'Common'}</div>
    
        <!-- meta: kolom kanan yang berisi harga + rating (di-align ke kanan) -->
        <div class="meta">
          <div class="value">${formatPrice(currency === 'usd' ? p.price_usd : p.price_idr)}</div>
          ${rateHtml}
        </div>
      </div>
    
      <div class="actions">
        <button class="btn-outline btn-view" data-id="${p.id}">View</button>
        <button class="btn-cart btn-shortlist-toggle" data-id="${p.id}">${cartLabel}</button>
        ${youtubeBtn}
        <button class="btn-primary btn-contact" data-id="${p.id}">Contact Me</button>
      </div>
    `;
  
    grid.appendChild(el);
  });
}


// ----------------- filtering -----------------
function applyFilters() {
  const searchEl = $('#search');
  const minEl = $('#minPrice');
  const maxEl = $('#maxPrice');
  const catRoot = $('#categoryList');

  const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const activeCat = catRoot ? catRoot.querySelector('.active')?.dataset.cat || 'all' : 'all';
  const min = minEl ? (parseFloat(minEl.value) || 0) : 0;
  const max = maxEl ? (maxEl.value.trim() ? parseFloat(maxEl.value) : Infinity) : Infinity;

  filtered = products.filter(p => {
    const name = (p.name || '').toLowerCase();
    const desc = (p.desc || '').toLowerCase();
    const matchesQ = !q || name.includes(q) || desc.includes(q);
    const matchesCat = activeCat === 'all' || p.cat === activeCat;
    const priceCheck = (currency === 'usd') ? (p.price_usd || 0) : (p.price_idr || 0);
    const matchesPrice = (priceCheck >= min && priceCheck <= max);
    return matchesQ && matchesCat && matchesPrice;
  });

  const sortEl = $('#sortSelect');
  const sortVal = sortEl ? sortEl.value : 'relevance';
  if (sortVal === 'price-asc') filtered.sort((a, b) => ((currency === 'usd' ? (a.price_usd||0) - (b.price_usd||0) : (a.price_idr||0) - (b.price_idr||0))));
  if (sortVal === 'price-desc') filtered.sort((a, b) => ((currency === 'usd' ? (b.price_usd||0) - (a.price_usd||0) : (b.price_idr||0) - (a.price_idr||0))));

  render(filtered);
}

// ----------------- attach events & handlers -----------------
function attachEvents() {
  // CATEGORY clicks
  const catList = $('#categoryList');
  if (catList) {
    catList.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() !== 'li') return;
      catList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
      e.target.classList.add('active');
      // 🔗 Update URL agar bisa di share
      const newCat = e.target.dataset.cat;
      const url = new URL(window.location);
      url.searchParams.set('cat', newCat);
      window.history.pushState({}, '', url);
      applyFilters();
    });
  }

  // SEARCH debounce
  const searchEl = $('#search');
  if (searchEl) {
    let t;
    searchEl.addEventListener('input', () => { clearTimeout(t); t = setTimeout(applyFilters, 250); });
  }

  // SORT / PRICE
  const sortEl = $('#sortSelect');
  if (sortEl) sortEl.addEventListener('change', applyFilters);
  const applyPrice = $('#applyPrice');
  if (applyPrice) applyPrice.addEventListener('click', applyFilters);

  // CURRENCY SWITCH
  const currencySel = $('#currencySelect');
  if (currencySel) {
    currency = currencySel.value || 'usd';
    currencySel.addEventListener('change', (e) => {
      currency = e.target.value;
      // optional wallet update if element present
      const walletEl = $('#walletValue');
      if (walletEl) {
        if (currency === 'usd') walletEl.textContent = '$120.00';
        else walletEl.textContent = 'Rp ' + (1200000).toLocaleString('id-ID');
      }
      applyFilters();
    });
  }

// Delegated click for product cards: VIEW and CONTACT
document.body.addEventListener('click', async (e) => {
  // VIEW -> gallery (async: fetch images first)
  if (e.target && e.target.matches && e.target.matches('.btn-view')) {
    const id = e.target.dataset.id;
    const prod = products.find(p => String(p.id) === String(id));
    if (!prod) return;
    // load images (product.images or from cloud_folder via proxy)
    const imgs = await loadImagesForProduct(prod);
    if (!imgs || !imgs.length) {
      // fallback: no images
      showToastAt ? showToastAt('No images found for this item.', e, { type: 'error' }) : alert('No images found for this item.');
      return;
    }
    // attach fetched images to product temporarily so existing openGallery works
    prod.images = imgs; // keep first 10

    // 1) update card thumbnail (if exists) so card shows the first image
    //const cardThumb = document.querySelector(`img[data-thumb-id="${prod.id}"]`);
    //if (cardThumb && prod.images[0]) {
    //  cardThumb.src = prod.images[0];
    //  cardThumb.alt = prod.name + ' thumb';
    //}

    // 2) open gallery like before (Steam-like)
    openProductModal(prod);
    return;
  }
  // SHORTLIST toggle
  if (e.target && e.target.matches && e.target.matches('.btn-shortlist-toggle')) {
    const id = e.target.dataset.id;
    const sid = String(id);
    const idx = shortlist.indexOf(sid);

    if (idx === -1) {
      shortlist.push(sid);
      e.target.textContent = 'Remove';
    } else {
      shortlist.splice(idx, 1);
      e.target.textContent = 'Add to Cart';
    }

    saveShortlist();
    updateShortlistBadge();
    return;
  }

  // CONTACT (card) -> open contact modal with prefill
  if (e.target && e.target.matches && e.target.matches('.btn-contact')) {
    const id = e.target.dataset.id;
    const prod = products.find(p => String(p.id) === String(id));
    if (prod) {
      // store last selected product info (used by WhatsApp and Copy Link)
      window.lastSelectedProductId = prod.id;
      window.lastSelectedProductName = prod.name;
      openContact({ name: '', message: `I'm interested in "${prod.name}" (ID:${prod.id}). Please share price & availability.` });
    }
    return;
  }

  // other delegated cases remain unchanged below if any...
});


  // ----------------- CONTACT modal + social handlers -----------------
  const contactBtnMain = $('#contactBtn');
  const contactModal = $('#contactModal');
  const closeModalBtn = $('#closeModal');
  const contactForm = $('#contactForm');
  const mailtoBtn = $('#mailtoBtn');
  const whatsappBtn = $('#whatsappBtn');
  const facebookBtn = $('#facebookBtn');
  const instagramBtn = $('#instagramBtn');
  const copyLinkBtn = $('#copyLinkBtn'); 

  // CHANGE THESE to your real accounts
  const MY_WHATSAPP_NUMBER = '+6281294648329'; // international, with + (will be normalized)
  const MY_FACEBOOK_URL = 'https://facebook.com/uchihadaybringer';
  const MY_INSTAGRAM_URL = 'https://instagram.com/taufanquartz';
  const MY_EMAIL = 'lotancorp@gmail.com';
  const closeModalBottom = $('#closeModalBottom');
  if (closeModalBottom) closeModalBottom.addEventListener('click', closeContact);
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const name = window.lastSelectedProductName || 'your skin';
      const msg = encodeURIComponent(`I'm interested in your ${name}`);
      const normalized = (MY_WHATSAPP_NUMBER || '').replace(/[^\d+]/g, '');
      const waNumber = normalized.startsWith('+') ? normalized.slice(1) : normalized;
      const waUrl = `https://wa.me/${waNumber}?text=${msg}`;
      window.open(waUrl, '_blank');
    });
    // ---- Shortlist modal controls ----
    const shortlistBtn = document.getElementById('shortlistBtn');
    const shortlistModal = document.getElementById('shortlistModal');
    const closeShortlistBtn = document.getElementById('closeShortlistModal');
    const shortlistCopyBtn = document.getElementById('shortlistCopyBtn');
    const shortlistWhatsAppBtn = document.getElementById('shortlistWhatsAppBtn');
    const mobileCartBtn = document.getElementById('mobileCartBtn');
    if (shortlistBtn) {
      shortlistBtn.addEventListener('click', openShortlistModal);
    }
    if (mobileCartBtn) {
      mobileCartBtn.addEventListener('click', openShortlistModal);
    }
    if (closeShortlistBtn) {
      closeShortlistBtn.addEventListener('click', closeShortlistModal);
    }
    if (shortlistModal) {
      shortlistModal.addEventListener('click', (ev) => {
        if (ev.target === shortlistModal) closeShortlistModal();
      }
    );
    }
  // remove single item from cart when clicking "×"
    document.addEventListener('click', (ev) => {
      const btn = ev.target;
      if (!btn || !btn.classList || !btn.classList.contains('cart-item-remove')) return;

      const id = btn.dataset.id;
      const sid = String(id);
      const idx = shortlist.indexOf(sid);
      if (idx === -1) return;

      // remove from shortlist array
      shortlist.splice(idx, 1);
      saveShortlist();
      updateShortlistBadge();

      // update cart list UI
      openShortlistModal();

      // sync label di card & modal product kalau kebuka
      const cardBtn = document.querySelector(`.btn-shortlist-toggle[data-id="${sid}"]`);
      if (cardBtn) {
        cardBtn.textContent = 'Add to Cart';
      }
      const productCartBtn = document.getElementById('productCartBtn');
      if (productCartBtn && window.currentProductId && String(window.currentProductId) === sid) {
        productCartBtn.textContent = 'Add to Cart';
        productCartBtn.classList.remove('remove');
      }
    });

    if (shortlistCopyBtn) {
      shortlistCopyBtn.addEventListener('click', () => {
        const text = buildShortlistTextForMessage();
        if (!text) {
          // cart kosong → toast kecil, bukan alert
          showToastAt('Your cart is empty.', shortlistCopyBtn, {
            type: 'info',
            duration: 2600,
            offsetY: -40
          });
          return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            // sukses copy → toast hijau
            showToastAt('List copied to clipboard.', shortlistCopyBtn, {
              type: 'success',
              duration: 2600,
              offsetY: -40
            });
          }).catch(() => {
            // gagal copy → toast merah
            showToastAt('Failed to copy text.', shortlistCopyBtn, {
              type: 'error',
              duration: 3000,
              offsetY: -40
            });
          });
        } else {
          // fallback primitif kalau Clipboard API ga ada
          prompt('Copy this text:', text);
        }
      });
    }

    
    if (shortlistWhatsAppBtn) {
      shortlistWhatsAppBtn.addEventListener('click', () => {
        const text = buildShortlistTextForMessage();
        if (!text) {
          showToastAt('Your cart is empty.', shortlistWhatsAppBtn, {
            type: 'info',
            duration: 2600,
            offsetY: -40
          });
          return;
        }
        const normalized = (MY_WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
        const url = `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      });
    }

    
  
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      const id = window.lastSelectedProductId;
  
      let url;
      if (id) {
        const u = new URL(window.location.href);
        u.searchParams.set('product', id);
        url = u.toString();
      } else {
        url = window.location.href;
      }
  
      try {
        await navigator.clipboard.writeText(url);
        showToastAt('Link copied to clipboard!', copyLinkBtn, {
          type: 'success',
          duration: 2800,
          offsetY: -36
        });
      } catch (err) {
        prompt('Copy this link', url);
        showToastAt('Could not auto-copy — please copy manually.', null, {
          type: 'error',
          duration: 3500
        });
      }
    });
  }
  


  if (facebookBtn) facebookBtn.href = MY_FACEBOOK_URL;
  if (instagramBtn) instagramBtn.href = MY_INSTAGRAM_URL;

  function openContact(prefill) {
    if (!contactModal) return;
  
    // pastikan contact modal berada di body sebagai last child sehingga berada di atas
    // (berguna kalau ada stacking context yang aneh)
    if (contactModal.parentNode !== document.body) document.body.appendChild(contactModal);
  
    // Set z-index eksplisit supaya selalu lebih tinggi dari product modal
    contactModal.style.zIndex = 11050;            // contact modal on top
    if (productModal) productModal.style.zIndex = 11000; // product modal slightly below
  
    contactModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  
    if (contactForm) {
      if (prefill && typeof prefill === 'object') {
        contactForm.name.value = prefill.name || '';
        contactForm.message.value = prefill.message || '';
        contactForm.email.value = '';
      } else {
        contactForm.reset();
      }
    }
  
    // fokus ke elemen pertama agar keyboard dapat mengakses modal
    setTimeout(() => {
      const focusEl = contactModal.querySelector('button, [href], input, textarea, select');
      if (focusEl) focusEl.focus();
    }, 60);
  }
  
  function closeContact() {
    if (!contactModal) return;
  
    contactModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  
    // restore z-index (jika product modal masih terbuka, pastikan ia kembali di depan)
    if (productModal && productModal.getAttribute('aria-hidden') === 'false') {
      productModal.style.zIndex = 11050;
    } else {
      // default reset (kosongkan agar CSS mengambil alih)
      if (productModal) productModal.style.zIndex = '';
    }
    // reset contact modal z-index agar CSS kembali menjadi sumber kebenaran
    contactModal.style.zIndex = '';
  }
   
  const aboutBtnMain = document.getElementById('aboutBtn');
  const aboutModal = document.createElement('div');
  aboutModal.className = 'modal';
  aboutModal.id = 'aboutModal';
  
  // 🔹 start dalam keadaan tersembunyi
  aboutModal.setAttribute('aria-hidden', 'true');
  aboutModal.innerHTML = `
    <div class="modal-panel">
      <button class="modal-close" id="closeAboutModal">&times;</button>
      <div class="about-wrap">
        <div class="about-inner">
          <div class="about-media">
            <img src="https://res.cloudinary.com/do1nbyqv0/image/upload/v1762764250/QG_wbkhpe.png" alt="Quartz Gallery Logo">
          </div>
          <div class="about-content">
            <h1>WELCOME !</h1>
            <h3>A Note from the Unknown</h3>
            <div class="about-text">
              <p><strong>Quartz Gallery (QG)</strong> is a freelance graphic design studio dedicated to creativity and innovation. 
              Although I may not be a widely recognized name, my work is driven by passion and a commitment to quality, 
              proving that true artistry often comes from humble beginnings.</p>
  
              <p>At QG, we have developed powerful software tools specifically designed to modify RF Online files. 
              These tools not only streamline the game development process but also assist in configuring and enhancing 
              game skins. Whether you’re a developer or a game enthusiast, our software is built to bring your creative ideas to life.</p>
  
              <p>We proudly provide a broad spectrum of skin design services—from original creations and complete overhauls 
              to fine-tuned color adjustments. Every project is crafted to reflect your vision, combining fresh ideas 
              with a personal touch that makes each skin truly your own.</p>
  
              <p>We may be modest in scale, yet our passion knows no limits. 
              I am here to support you in transforming your game concepts into vivid, tangible realities 
              that resonate with players and elevate your game’s visual appeal.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(aboutModal);
  
  aboutBtnMain.addEventListener('click', () => {
    aboutModal.setAttribute('aria-hidden', 'false');
  });
  
  document.body.addEventListener('click', (e) => {
    if (e.target.id === 'closeAboutModal' || e.target.id === 'aboutModal') {
      aboutModal.setAttribute('aria-hidden', 'true');
    }
  });
  
 // sidebar contact button (opens modal)
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeContact);
  if (contactModal) {
    contactModal.addEventListener('click', (ev) => { if (ev.target === contactModal) closeContact(); });
  }

  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const msg = encodeURIComponent((contactForm?.message?.value) || 'Hello, I am interested in your skins.');
      const normalized = (MY_WHATSAPP_NUMBER || '').replace(/[^\d+]/g, '');
      const waNumber = normalized.startsWith('+') ? normalized.slice(1) : normalized;
      const waUrl = `https://wa.me/${waNumber}?text=${msg}`;
      window.open(waUrl, '_blank');
    });
  }

  if (mailtoBtn) {
    mailtoBtn.addEventListener('click', () => {
      const subject = encodeURIComponent('Skin Inquiry');
      const body = encodeURIComponent((contactForm?.message?.value || '') + '\n\n- from: ' + (contactForm?.name?.value || 'Anon'));
      window.location.href = `mailto:${MY_EMAIL}?subject=${subject}&body=${body}`;
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Message sent (simulation). To send an actual email, use "Open Email" button.');
      closeContact();
    });
  }

  // ----------------- GALLERY modal -----------------
  const galleryModal = $('#galleryModal');
  const galleryImage = $('#galleryImage');
  const galleryThumbs = $('#galleryThumbs');
  const galleryCaption = $('#galleryCaption');
  const galleryPrev = $('#galleryPrev');
  const galleryNext = $('#galleryNext');
  const closeGalleryBtn = $('#closeGallery');

  let galleryList = [];
  let galleryIndex = 0;

  function showGalleryAt(i) {
    if (!galleryList || !galleryList.length) return;
    galleryIndex = ((i % galleryList.length) + galleryList.length) % galleryList.length;
    if (galleryImage) galleryImage.src = galleryList[galleryIndex];
    // thumbs highlight
    if (galleryThumbs) {
      Array.from(galleryThumbs.children).forEach((img, idx) => img.classList.toggle('active', idx === galleryIndex));
    }
    if (galleryCaption) galleryCaption.textContent = `${galleryIndex + 1} / ${galleryList.length}`;
  }
  // --- New: Product modal (steam-like) ---
  const productModal = $('#productModal');
  const productMainImage = $('#productMainImage');
  const productThumbs = $('#productThumbs');
  const productCaption = $('#productCaption');
  const productTitle = $('#productTitle');
  const productDesc = $('#productDesc');
  const productPrice = $('#productPrice');
  const productRelease = $('#productRelease');
  const productRarity = $('#productRarity');
  const productSKU = $('#productSKU');
  const productRate = $('#productRate');
  const productYoutube = $('#productYoutube');
  const productContactBtn = $('#productContactBtn');
  const productCartBtn = $('#productCartBtn');
  const closeProductModalBtn = $('#closeProductModal');
  const productPrev = $('#productPrev');
  const productNext = $('#productNext');
  const productPrevItem = $('#productPrevItem');   // tombol prev item (kanan)
  const productNextItem = $('#productNextItem');   // tombol next item (kanan)
  
  function extractYouTubeId(url) {
    if (!url) return null;
    // menangani: youtu.be/ID, v=ID, /embed/ID, /shorts/ID, juga query params
    const m = url.match(
      /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|v=)([A-Za-z0-9_-]{6,})/
    );
    return m ? m[1] : null;
  }
  function normalizeYoutubeField(yt) {
    if (!yt) return { primary: null, extras: [] };
  
    if (Array.isArray(yt)) {
      const cleaned = yt
        .map(u => (u || '').trim())
        .filter(Boolean);
      return {
        primary: cleaned[0] || null,
        extras: cleaned.slice(1)
      };
    }
  
    if (typeof yt === 'string') {
      const v = yt.trim();
      return { primary: v || null, extras: [] };
    }
  
    return { primary: null, extras: [] };
  }
  

  let productMedia = []; // array of {type:'video'|'image', src:..., thumb:...}
  let productIndex = 0;
  let currentOpenProduct = null;
  let currentProductId = null; 
  //let productImages = [];
  //let productIndex = 0;
  //let currentOpenProduct = null;
  // simple Cloudinary-friendly thumb helper (naive replace)
  function cloudThumb(src, width = 320) {
    try {
      if (!src || !src.includes('res.cloudinary.com')) return src || '';
      // insert transformations after /upload/
      return src.replace('/upload/', `/upload/w_${width},f_auto,q_auto/`);
    } catch (e) {
      return src || '';
    }
  }

  // helper lazy loader (call once)
  function setupLazyObserver() {
    if (window.__lazyObserver) return window.__lazyObserver;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        const img = e.target;
        if (e.isIntersecting) {
          const ds = img.dataset && img.dataset.src;
          if (ds) img.src = ds;
          // img.removeAttribute('data-src') // optional
          img.setAttribute('loading', 'lazy');
          obs.unobserve(img);
        }
      });
    }, { root: null, rootMargin: '200px', threshold: 0.01 });
    window.__lazyObserver = obs;
    return obs;
  }

  function showProductAt(i) {
    if (!productMedia || !productMedia.length) return;
    productIndex = ((i % productMedia.length) + productMedia.length) % productMedia.length;
    const item = productMedia[productIndex];
  
    const videoWrap = document.getElementById('productVideoWrap');
    const videoFrame = document.getElementById('productVideo'); // iframe
    const mainImg = document.getElementById('productMainImage'); // <img>
  
    // hide both first, then show whichever type
    if (videoWrap) {
      videoWrap.style.display = 'none';
      // reset inline sizing to avoid leftover styles
      videoWrap.style.position = '';
      videoWrap.style.width = '';
      videoWrap.style.height = '';
    }
    if (videoFrame) {
      // always stop previous video by clearing src, then clear style attrs too
      try { videoFrame.src = ''; } catch(e){}
      videoFrame.removeAttribute('width');
      videoFrame.removeAttribute('height');
      videoFrame.style.width = '';
      videoFrame.style.height = '';
      videoFrame.style.position = '';
      videoFrame.style.inset = '';
    }
    if (mainImg) {
      mainImg.style.display = 'none';
      mainImg.src = '';
      mainImg.style.width = '';
      mainImg.style.height = '';
      mainImg.style.objectFit = '';
    }
  
    // Helper: force-fill iframe into its wrapper (aggressive but reliable)
    function forceFillVideoWrapper() {
      if (!videoWrap || !videoFrame) return;
      // ensure wrapper occupies space and is relative for absolute children
      videoWrap.style.position = 'relative';
      // set wrapper dimension to match container (100% of its parent's content area)
      videoWrap.style.width = '100%';
      // set a sensible min-height on desktop to avoid very narrow box
      videoWrap.style.minHeight = (window.innerWidth > 980) ? '360px' : '200px';
      videoWrap.style.height = 'auto';
  
      // apply absolute fill to iframe so it always fills wrapper
      videoFrame.style.position = 'absolute';
      videoFrame.style.inset = '0'; // top:0; right:0; bottom:0; left:0
      videoFrame.style.width = '100%';
      videoFrame.style.height = '100%';
      videoFrame.style.maxWidth = 'none';
      videoFrame.style.maxHeight = 'none';
      videoFrame.style.border = '0';
    }
  
    if (item.type === 'video') {
      if (videoWrap && videoFrame) {
        // remove inline width/height attributes just in case embed library added them
        videoFrame.removeAttribute('width');
        videoFrame.removeAttribute('height');
  
        // build embed url and assign (stop previous first)
        // add autoplay param only if you want autoplay
        videoFrame.src = item.src + '?rel=0&showinfo=0';
        // ensure allow attributes for fullscreen & autoplay
        videoFrame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen');
  
        // Force-fill so it won't remain small due to other CSS
        forceFillVideoWrapper();
  
        // finally show wrapper
        videoWrap.style.display = 'block';
      }
    } else {
      // image
      if (mainImg) {
        mainImg.src = item.src || '';
        mainImg.style.display = 'block';
        // ensure it can shrink/grow nicely in flex/grid containers
        mainImg.style.width = '100%';
        mainImg.style.height = '100%';
        mainImg.style.objectFit = 'contain';
        mainImg.style.maxWidth = '100%';
        mainImg.style.maxHeight = '100%';
        // fallback on error
        mainImg.onerror = () => { mainImg.onerror = null; mainImg.src = 'assets/placeholder-thumb.jpg'; };
      }
    }
  
    // update thumbs active state
    if (productThumbs) {
      Array.from(productThumbs.children).forEach((imgEl, idx) => {
        imgEl.classList.toggle('active', idx === productIndex);
      });
    }
  
    // update caption / counter
    if (productCaption) productCaption.textContent = `${productIndex + 1} / ${productMedia.length}`;
  }
  
  
  function openProductModal(prod) {
    if (!productModal) return;
    currentOpenProduct = prod;
    currentProductId = prod.id; 
    // 🔹 SIMPAN ID PRODUK AKTIF KE GLOBAL
    window.currentProductId = prod.id;
    // 🔹 Normalisasi field youtube: bisa string atau array
    const ytInfo = normalizeYoutubeField(prod.youtube);
    const primaryYoutube = ytInfo.primary;
    const extraYoutubes = ytInfo.extras;
    productMedia = [];
  
    // video utama (untuk slide pertama)
    if (primaryYoutube) {
      const yid = extractYouTubeId(primaryYoutube);
      if (yid) {
        const embed = `https://www.youtube.com/embed/${yid}`;
        const thumb = `https://img.youtube.com/vi/${yid}/hqdefault.jpg`;
        productMedia.push({ type: 'video', src: embed, thumb });
      }
    }

    // video tambahan hanya untuk gallery (preview)
    if (extraYoutubes && extraYoutubes.length) {
      extraYoutubes.forEach(url => {
        const yid = extractYouTubeId(url);
        if (!yid) return;
        const embed = `https://www.youtube.com/embed/${yid}`;
        const thumb = `https://img.youtube.com/vi/${yid}/hqdefault.jpg`;
        productMedia.push({ type: 'video', src: embed, thumb });
      });
    }

    // sekarang gambar-gambar seperti biasa
    (Array.isArray(prod.images) ? prod.images : []).forEach(src => {
      if (src && src.trim()) {
        productMedia.push({ type: 'image', src: src.trim(), thumb: src.trim() });
      }
    });

    // fallback kalau bener-bener gak ada media
    if (!productMedia.length) {
      const placeholder = 'assets/placeholder-thumb.jpg';
      productMedia.push({
        type: 'image',
        src: prod.thumbnail || placeholder,
        thumb: prod.thumbnail || placeholder
      });
    }
      // dedup: buang media dengan src/type yang sama persis
    const seen = new Set();
    productMedia = productMedia.filter(m => {
      const key = `${m.type}:${m.src}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
 
    // --- RIGHT THUMB (sidebar) logic (keep as before) ---
    const rightThumbEl = document.getElementById('productRightThumb');
    const placeholder = 'assets/placeholder-thumb.jpg';
    const rightSrc = (prod && prod.thumbnail && prod.thumbnail.trim()) ? prod.thumbnail.trim()
                  : (productMedia.length ? (productMedia.find(m => m.type === 'image')?.src || productMedia[0].src) : '');
    if (rightThumbEl) {
      if (rightSrc) {
        rightThumbEl.src = rightSrc;
        rightThumbEl.style.display = 'block';
        rightThumbEl.onerror = () => { rightThumbEl.onerror = null; rightThumbEl.src = placeholder; rightThumbEl.style.display = 'block'; };
      } else {
        rightThumbEl.src = placeholder;
        rightThumbEl.style.display = 'block';
      }
    }
  

    // build thumbs (left gallery) — replacement
    if (productThumbs) productThumbs.innerHTML = '';
    const lazyObs = setupLazyObserver();
    productMedia.forEach((m, idx) => {
      const t = document.createElement('img');
      t.className = 'product-thumb-mini';
      t.dataset.index = idx;
      t.dataset.type = m.type; // 'image' or 'video'
      // show tiny placeholder first for fast paint
      t.src = 'assets/placeholder-thumb.jpg';
      // actual optimized thumb will be loaded lazily
      t.dataset.src = (m.type === 'video') ? (m.thumb || cloudThumb(m.src || '', 320)) : cloudThumb(m.src || m.thumb || '', 320);
      t.loading = 'lazy';
      t.alt = (m.type === 'video') ? `${prod.name} - video preview` : `${prod.name} - thumb ${idx+1}`;

      // click opens media at index
      t.addEventListener('click', () => { showProductAt(idx); });

      // on error fallback
      t.onerror = () => { t.onerror = null; t.src = 'assets/placeholder-thumb.jpg'; };

      // when actual thumb loads, mark as loaded (for blur-to-sharp effect if CSS used)
      t.addEventListener('load', () => { t.classList.add('loaded'); }, { once: true });

      productThumbs.appendChild(t);
      // observe for lazy loading
      lazyObs.observe(t);
    });

  
    // set metadata (title, desc, price, etc.)
    productTitle.textContent = prod.name || 'Unknown';
    productDesc.textContent = prod.desc || '';
    if (productRelease) productRelease.textContent = prod.release_date ? `Release: ${prod.release_date}` : 'Release: -';
    if (productRarity) productRarity.textContent = prod.rarity || '';
    if (productPrice) productPrice.textContent = formatPrice(currency === 'usd' ? prod.price_usd : prod.price_idr);
    if (productSKU) productSKU.textContent = prod.id || '-';
  
    // rating (keep existing logic)
    if (prod.rate) {
      const maxStars = 5;
      const fullStars = Math.floor(prod.rate);
      const halfStar = prod.rate % 1 >= 0.5;
      const emptyStars = maxStars - fullStars - (halfStar ? 1 : 0);
  
      let starsHTML = '<div class="star-rating">';
      starsHTML += '★'.repeat(fullStars);
      if (halfStar) starsHTML += '<span class="half-star">★</span>';
      starsHTML += '☆'.repeat(emptyStars);
      starsHTML += ` <span class="rate-value">(${prod.rate.toFixed(1)}/${maxStars})</span>`;
      starsHTML += '</div>';
  
      productRate.innerHTML = starsHTML;
    } else {
      productRate.innerHTML = '<div class="star-rating muted">No rating</div>';
    }
  
    // tags as before
    const tagWrap = document.getElementById('productTags');
    if (tagWrap) {
      tagWrap.innerHTML = '';
      if (Array.isArray(prod.tags) && prod.tags.length) {
        prod.tags.forEach(tg => {
          const el = document.createElement('span');
          el.className = 'product-tag';
          el.textContent = tg;
          tagWrap.appendChild(el);
        });
        tagWrap.style.display = 'flex';
      } else {
        tagWrap.style.display = 'none';
      }
    }
  
    // youtube external button (ke kanan) - tetap ada
    if (primaryYoutube) {
      productYoutube.href = primaryYoutube;
      productYoutube.style.display = 'inline-flex';
    } else {
      productYoutube.style.display = 'none';
    }
  
    // contact button
    productContactBtn.onclick = () => {
      window.lastSelectedProductId = prod.id;
      window.lastSelectedProductName = prod.name;
      openContact({ name:'', message:`I'm interested in "${prod.name}" (ID:${prod.id}). Please share price & availability.` });
    };
    // cart button (add/remove from cart)
    if (productCartBtn) {
      const inCart = isInShortlist(prod.id);
      productCartBtn.textContent = inCart ? 'Remove from Cart' : 'Add to Cart';

      productCartBtn.onclick = () => {
        const sid = String(prod.id);
        const idx = shortlist.indexOf(sid);
        let nowInCart;

        if (idx === -1) {
          shortlist.push(sid);
          nowInCart = true;
        } else {
          shortlist.splice(idx, 1);
          nowInCart = false;
        }

        saveShortlist();
        updateShortlistBadge();

        // update label in modal
        productCartBtn.textContent = nowInCart ? 'Remove from Cart' : 'Add to Cart';

        // sync label di card utama (kalau kelihatan)
        const cardBtn = document.querySelector(`.btn-shortlist-toggle[data-id="${prod.id}"]`);
        if (cardBtn) {
          cardBtn.textContent = nowInCart ? 'Remove' : 'Add to Cart';
        }
      };
    }
    
    renderSimilarProducts(prod);
    productModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  
    // show first media (video if present will be first)
    showProductAt(0);
  }
  window.openProductModal = openProductModal;
  function renderSimilarProducts(prod) {
    const wrap = $('#similarProducts');
    const container = $('#similarWrapper');
    if (!wrap || !container) return;
  
    // reset dulu
    container.innerHTML = '';
  
    // ambil kategori & tags
    const cat = prod.cat;
    const tags = Array.isArray(prod.tags) ? prod.tags : [];
  
    // cari yang mirip
    const sims = products
      .filter(p => p.id !== prod.id) // jangan masukin diri sendiri
      .filter(p => p.cat === cat)    // prioritas: kategori sama
      .filter(p => {
        // cek tumpang tindih tag
        if (!Array.isArray(p.tags) || !tags.length) return true;
        return p.tags.some(t => tags.includes(t));
      })
      .slice(0, 4); // maksimal 4
  
    // kalau tidak ada → sembunyikan
    if (!sims.length) {
      wrap.style.display = 'none';
      return;
    }
  
    // tampilkan
    wrap.style.display = '';
    sims.forEach(p => {
      const thumb = p.thumbnail || (p.images && p.images.length ? p.images[0] : '');
      const card = document.createElement('div');
      card.className = 'similar-card';
      card.innerHTML = `
        <img src="${thumb}" alt="${p.name}">
        <p style="font-size:13px;margin-top:6px;">${p.name}</p>
      `;
      card.addEventListener('click', () => openProductModal(p));
      container.appendChild(card);
    });
  }
  
  function closeProductModal() {
    if (!productModal) return;
    productModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  
    // stop video if playing
    const videoFrame = document.getElementById('productVideo');
    if (videoFrame) videoFrame.src = '';
  
    if (productThumbs) productThumbs.innerHTML = '';
    if (productMainImage) productMainImage.src = '';
    currentOpenProduct = null;
  }
  

  if (closeProductModalBtn) closeProductModalBtn.addEventListener('click', closeProductModal);
  if (productPrev) productPrev.addEventListener('click', () => showProductAt(productIndex - 1));
  if (productNext) productNext.addEventListener('click', () => showProductAt(productIndex + 1));
  if (productPrevItem) {
    productPrevItem.addEventListener('click', () => openSiblingProduct(-1));
  }
  if (productNextItem) {
    productNextItem.addEventListener('click', () => openSiblingProduct(1));
  }
  
  if (productModal) productModal.addEventListener('click', (ev) => { if (ev.target === productModal) closeProductModal(); });

  // keyboard nav
  window.addEventListener('keydown', (ev) => {
    if (productModal && productModal.getAttribute('aria-hidden') === 'false') {
      if (ev.key === 'ArrowLeft') showProductAt(productIndex - 1);
      if (ev.key === 'ArrowRight') showProductAt(productIndex + 1);
      if (ev.key === 'Escape') closeProductModal();
    }
  });

  function openGallery(prod) {
    const images = prod.images || [];
    const modal = document.getElementById('galleryModal');
    const gm = document.getElementById('galleryImage');
    const gt = document.getElementById('galleryThumbs');
    const cap = document.getElementById('galleryCaption');
    if (!modal || !gm || !gt) return;
  
    gt.innerHTML = '';
    if (!images.length) return;
  
    gm.src = images[0];
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  
    images.forEach((src, i) => {
      const t = document.createElement('img');
      t.src = src;
      t.className = 'gallery-thumb';
      t.dataset.index = i;
      t.addEventListener('click', () => {
        gm.src = src;
        cap.textContent = `${i + 1} / ${images.length}`;
      });
      gt.appendChild(t);
    });
  
    cap.textContent = `1 / ${images.length}`;
  }
  

  function closeGallery() {
    if (!galleryModal) return;
    galleryModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (galleryImage) galleryImage.src = '';
    if (galleryThumbs) galleryThumbs.innerHTML = '';
  }

  if (closeGalleryBtn) closeGalleryBtn.addEventListener('click', closeGallery);
  if (galleryPrev) galleryPrev.addEventListener('click', () => showGalleryAt(galleryIndex - 1));
  if (galleryNext) galleryNext.addEventListener('click', () => showGalleryAt(galleryIndex + 1));
  if (galleryModal) galleryModal.addEventListener('click', (ev) => { if (ev.target === galleryModal) closeGallery(); });

  // keyboard handlers (global)
  window.addEventListener('keydown', (ev) => {
    // gallery navigation
    if (galleryModal && galleryModal.getAttribute('aria-hidden') === 'false') {
      if (ev.key === 'ArrowLeft') showGalleryAt(galleryIndex - 1);
      if (ev.key === 'ArrowRight') showGalleryAt(galleryIndex + 1);
      if (ev.key === 'Escape') closeGallery();
    }
    // contact modal close with ESC
    if (contactModal && contactModal.getAttribute('aria-hidden') === 'false') {
      if (ev.key === 'Escape') closeContact();
    }
  });
}
  // PRICE modal logic
  const priceBtn = $('#priceBtn');
  const priceModal = $('#priceModal');
  const closePriceModal = $('#closePriceModal');
  const closePriceBtn = $('#closePriceBtn');
  const priceContent = $('#priceContent');
  const priceCurrencyLabel = $('#priceCurrencyLabel');

  // price table (use values from your images; edit if perlu)
  const PRICE_TABLE = {
    usd: {
      "Armor": "$100",
      "Weapon": "$50 (10 Pcs) / $90 (17 Pcs)",
      "Shield": "$7",
      "Booster": "$18",
      "Mask": "$18",
      "Unit (MAU)": "$60",
      "Unit (Siege Kit)": "$30",
      "Unit (Animus // 4 Animus)": "$120",
      "Monster": "$15 – $30 (Depending on difficulty)",
      "NPC": "$15 – $30 (Depending on difficulty)",
      "Armor Revamp": "$30 – $40",
      "Weapon Revamp": "$30 – $50"
    },
    idr: {
      "Armor": "Rp 1.500.000",
      "Weapon": "Rp 800.000 (10 Pcs) / Rp 1.300.000 (17 Pcs)",
      "Shield": "Rp 80.000 – Rp 110.000",
      "Booster": "Rp 275.000",
      "Mask": "Rp 275.000",
      "Unit (MAU)": "Rp 600.000 (2 MAU)",
      "Unit (Siege Kit)": "Rp 150.000 – Rp 400.000",
      "Unit (Animus // 4 Animus)": "Rp 800.000",
      "Monster": "Rp 150.000 – Rp 300.000",
      "NPC": "Rp 150.000 – Rp 300.000",
      "Armor Revamp": "Rp 500.000 – Rp 750.000",
      "Weapon Revamp": "Rp 500.000 – Rp 1.000.000"
    }
  };

  function renderPriceModal() {
    if (!priceContent) return;
    const cur = currency === 'usd' ? 'usd' : 'idr';
    if (priceCurrencyLabel) priceCurrencyLabel.textContent = cur.toUpperCase();
    const table = PRICE_TABLE[cur];
    let html = `<div class="price-table">`;
    for (const [label, val] of Object.entries(table)) {
      html += `<div class="price-row"><div class="label">${label}</div><div class="value">${val}</div></div>`;
    }
    html += `</div>`;
    priceContent.innerHTML = html;
  }

  if (priceBtn) {
    priceBtn.addEventListener('click', () => {
      renderPriceModal();
      if (priceModal) {
        priceModal.setAttribute('aria-hidden','false');
        document.body.style.overflow = 'hidden';
      }
    });
  }

  if (closePriceModal) closePriceModal.addEventListener('click', () => {
    if (priceModal) { priceModal.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; }
  });
  if (closePriceBtn) closePriceBtn.addEventListener('click', () => {
    if (priceModal) { priceModal.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; }
  });

  if (priceModal) {
    priceModal.addEventListener('click', (ev) => { if (ev.target === priceModal) { priceModal.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; }});
  }

  // ensure that when currency changes, if price modal is open, content updates
  const currencySel = $('#currencySelect');
  if (currencySel) {
    currencySel.addEventListener('change', (e) => {
      currency = e.target.value;
      // update wallet if present
      const walletEl = $('#walletValue');
      if (walletEl) {
        if (currency === 'usd') walletEl.textContent = '$120.00';
        else walletEl.textContent = 'Rp ' + (1200000).toLocaleString('id-ID');
      }
      // if price modal open, re-render
      if (priceModal && priceModal.getAttribute('aria-hidden') === 'false') renderPriceModal();
      applyFilters();
    });
  }
// ---- Toast notification ----
// ---- Dynamic toast: show near element or click event ----
function showToastAt(message, elOrEvent = null, opts = {}) {
  // opts: { type: 'success'|'error'|'info', duration: ms, offsetY: px }
  const type = opts.type || 'success';
  const duration = typeof opts.duration === 'number' ? opts.duration : 3000;
  const offsetY = typeof opts.offsetY === 'number' ? opts.offsetY : -18; // lift above click

  // ensure toast container exists in DOM
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }

  // set content (icon + text)
  toast.innerHTML = `<div class="icon">${type==='success' ? '✔' : (type==='error' ? '⌧' : 'i')}</div><div class="msg">${message}</div>`;

  // compute position: prefer element center or event coords
  let x = window.innerWidth - 120; // fallback bottom-right-ish
  let y = window.innerHeight - 80;

  if (elOrEvent) {
    if (elOrEvent instanceof Event && typeof elOrEvent.clientX === 'number') {
      x = elOrEvent.clientX;
      y = elOrEvent.clientY;
    } else if (elOrEvent instanceof Element) {
      const rect = elOrEvent.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    } else if (typeof elOrEvent === 'object' && elOrEvent.x && elOrEvent.y) {
      x = elOrEvent.x; y = elOrEvent.y;
    }
  }

  // prefer to show above the point, so shift Y
  let top = y + offsetY;
  let left = x;

  // clamp to viewport with padding
  const pad = 12;
  const estimatedWidth = 300; // conservative
  if (left < pad) left = pad;
  if (left + estimatedWidth / 2 > window.innerWidth - pad) left = window.innerWidth - pad - estimatedWidth / 2;
  if (top < pad) top = pad;
  if (top > window.innerHeight - pad) top = window.innerHeight - pad;

  // apply style
  toast.style.left = `${left}px`;
  toast.style.top = `${top}px`;
  toast.className = `toast show ${type}`;

  // clear previous timer
  if (window.__toastTimer) { clearTimeout(window.__toastTimer); window.__toastTimer = null; }

  // auto-hide
  window.__toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    // leave DOM for reuse
  }, duration);
}
// --- Grid view toggle (compact = ~5, large = ~3) ---
function setGridView(view, save=true){
  const grid = document.getElementById('productGrid');
  if(!grid) return;
  grid.classList.remove('view-compact','view-large');
  if(view === 'large') grid.classList.add('view-large');
  else grid.classList.add('view-compact');
  const sel = document.getElementById('gridViewSelect');
  if(sel && sel.value !== view) sel.value = view;
  if(save && window.localStorage) localStorage.setItem('qg_grid_view', view);
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = (window.localStorage && localStorage.getItem('qg_grid_view')) || null;
  const initial = saved || 'large';
  setGridView(initial, false);

  const sel = document.getElementById('gridViewSelect');
  if(sel) {
    sel.value = initial;
    sel.addEventListener('change', (e) => {
      setGridView(e.target.value, true);
      setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 120);
    });
  }
});
function openSiblingProduct(direction) {
  // direction: -1 (previous), +1 (next)

  // 🔹 pastikan ada list filtered
  if (!Array.isArray(filtered) || !filtered.length) return;

  // 🔹 ambil ID produk aktif dari window
  const currentId = window.currentProductId;
  if (!currentId) return;

  // 🔹 cari index produk aktif di filtered[]
  const idx = filtered.findIndex(p => String(p.id) === String(currentId));
  if (idx === -1) return;

  const nextIdx = idx + direction;

  // 🔹 jangan keluar batas (awal/akhir list)
  if (nextIdx < 0 || nextIdx >= filtered.length) {
    // opsional: di sini boleh kasih toast "no more item"
    return;
  }

  const nextProd = filtered[nextIdx];

  // update global + info buat WhatsApp / Copy link
  window.currentProductId = nextProd.id;
  window.lastSelectedProductId = nextProd.id;
  window.lastSelectedProductName = nextProd.name;

  // 🔹 buka modal dengan produk berikutnya
  openProductModal(nextProd);
}


// --- Deep link: buka modal produk dari ?product=ID di URL ---
async function openProductFromUrlQuery() {
  const params = new URLSearchParams(window.location.search);
  const pid = params.get('product');
  if (!pid) return;
  if (!Array.isArray(products) || !products.length) return;

  const prod = products.find(p => String(p.id) === String(pid));
  if (!prod) return;

  // load images kalau perlu
  try {
    const imgs = await loadImagesForProduct(prod);
    if (imgs && imgs.length) {
      prod.images = imgs;
    }
  } catch (e) {
    console.warn('Failed loading images for deep-linked product', e);
  }

  // simpan last selected — supaya WhatsApp / Copy Link dll tetap relevan
  window.lastSelectedProductId = prod.id;
  window.lastSelectedProductName = prod.name;

  // optional: scroll ke card di grid (kalau ada)
  const cardBtn = document.querySelector(`.btn-view[data-id="${prod.id}"]`);
  if (cardBtn) {
    const card = cardBtn.closest('.card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // buka modal produk
  if (typeof openProductModal === 'function') {
    openProductModal(prod);
  }
}




// ----------------- INIT -----------------
async function init() {
  // 1) load data dulu
  await loadProducts();

  // 2) tentukan currency awal
  const initialCurrency = detectInitialCurrency();

  const currencySel = $('#currencySelect');              // desktop
  const currencySelMobile = $('#currencySelectMobile');  // kalau ada di mobile panel

  currency = initialCurrency;

  if (currencySel) currencySel.value = initialCurrency;
  if (currencySelMobile) currencySelMobile.value = initialCurrency;

  // optional: update wallet display kalau kamu pakai
  const walletEl = $('#walletValue');
  if (walletEl) {
    if (currency === 'usd') walletEl.textContent = '$120.00';
    else walletEl.textContent = 'Rp ' + (1200000).toLocaleString('id-ID');
  }

  // 3) load banner & pasang event handler
  await loadBanners();
  // 🔹 load shortlist dari localStorage
  shortlist = loadShortlist();
  updateShortlistBadge();
  attachEvents();

  // 4) set tahun footer
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 5) render grid awal dengan currency yang sudah diset
  applyFilters();

  // 6) SETELAH grid siap → cek apakah URL punya ?product=ID
  openProductFromUrlQuery();
}

document.addEventListener('DOMContentLoaded', init);


// --- Mobile filter sync: search + categories + selects (mobile -> desktop) ---
// --- Mobile controls: slide-in panel (only for small screens) ---
(function(){
  const panel = document.getElementById('mobileControlsPanel');
  const overlay = document.getElementById('mobileOverlay');
  const toggle = document.getElementById('mobileControlsToggle');
  const closeBtn = document.getElementById('mobileControlsClose');
  const handle = document.getElementById('mobileHandle');

  function openPanel() {
    if(!panel) return;
    panel.classList.add('open');
    overlay.classList.add('show');
    panel.setAttribute('aria-hidden','false');
    if(toggle) toggle.setAttribute('aria-expanded','true');
    document.body.style.overflow = 'hidden';
  }
  function closePanel() {
    if(!panel) return;
    panel.classList.remove('open');
    overlay.classList.remove('show');
    panel.setAttribute('aria-hidden','true');
    if(toggle) toggle.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
  }

  if(toggle) toggle.addEventListener('click', openPanel);
  if(closeBtn) closeBtn.addEventListener('click', closePanel);
  if(overlay) overlay.addEventListener('click', closePanel);
  if(handle) {
    // hanya tampilkan handle pada layar kecil
    if (window.innerWidth <= 980) {
      handle.style.display = 'block';
    } else {
      handle.style.display = 'none';
    }
    handle.addEventListener('click', openPanel);
  }
  // update handle visibility on resize
  window.addEventListener('resize', () => {
    if (!handle) return;
    handle.style.display = (window.innerWidth <= 980) ? 'block' : 'none';
  });


  // sync mobile selects with desktop logic (if desktop selects exist, copy their values)
  const sortMobile = document.getElementById('sortSelectMobile');
  const viewMobile = document.getElementById('gridViewSelectMobile');
  const currencyMobile = document.getElementById('currencySelectMobile');

  // helper to copy value from desktop -> mobile and vice versa
  function syncValues() {
    const desktopSort = document.getElementById('sortSelect');
    const desktopView = document.getElementById('gridViewSelect');
    const desktopCurrency = document.getElementById('currencySelect');

    if(desktopSort && sortMobile) sortMobile.value = desktopSort.value;
    if(desktopView && viewMobile) viewMobile.value = desktopView.value;
    if(desktopCurrency && currencyMobile) currencyMobile.value = desktopCurrency.value;
  }

  // initial sync on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    syncValues();
    // also set mobile select handlers to trigger desktop handlers
    if(sortMobile) sortMobile.addEventListener('change', (e) => {
      const desktop = document.getElementById('sortSelect');
      if(desktop) { desktop.value = e.target.value; desktop.dispatchEvent(new Event('change')); }
      applyFilters();
    });
    if(viewMobile) viewMobile.addEventListener('change', (e) => {
      const val = e.target.value;
      setGridView(val);
      const desktop = document.getElementById('gridViewSelect');
      if(desktop) desktop.value = val;
    });
    if(currencyMobile) currencyMobile.addEventListener('change', (e) => {
      const val = e.target.value;
      const desktop = document.getElementById('currencySelect');
      if(desktop) { desktop.value = val; desktop.dispatchEvent(new Event('change')); }
      // applyFilters called by desktop change handler
    });
  });

  // optional: close panel on orientation change or width > 980
  window.addEventListener('resize', () => {
    if(window.innerWidth > 980) closePanel();
  });
})();

(function(){
  // elements
  const panel = document.getElementById('mobileControlsPanel');
  const overlay = document.getElementById('mobileOverlay');
  const toggle = document.getElementById('mobileControlsToggle');
  const closeBtn = document.getElementById('mobileControlsClose');

  // mobile controls
  const searchMobile = document.getElementById('searchMobile');
  const categoryListMobile = document.getElementById('categoryListMobile');
  const sortMobile = document.getElementById('sortSelectMobile');
  const viewMobile = document.getElementById('gridViewSelectMobile');
  const currencyMobile = document.getElementById('currencySelectMobile');

  function openPanel(){ if(panel){ panel.classList.add('open'); overlay.classList.add('show'); panel.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; } }
  function closePanel(){ if(panel){ panel.classList.remove('open'); overlay.classList.remove('show'); panel.setAttribute('aria-hidden','true'); document.body.style.overflow=''; } }

  if(toggle) toggle.addEventListener('click', openPanel);
  if(closeBtn) closeBtn.addEventListener('click', closePanel);
  if(overlay) overlay.addEventListener('click', closePanel);
  window.addEventListener('resize', () => { if(window.innerWidth > 980) closePanel(); });

  // Sync initial values from desktop -> mobile
  function syncDesktopToMobile(){
    const desktopSearch = document.getElementById('search');
    const desktopSort = document.getElementById('sortSelect');
    const desktopView = document.getElementById('gridViewSelect');
    const desktopCurrency = document.getElementById('currencySelect');

    if(desktopSearch && searchMobile) searchMobile.value = desktopSearch.value || '';
    if(desktopSort && sortMobile) sortMobile.value = desktopSort.value;
    if(desktopView && viewMobile) viewMobile.value = desktopView.value;
    if(desktopCurrency && currencyMobile) currencyMobile.value = desktopCurrency.value;

    // sync selected category: find active li in desktop categoryList
    const desktopCat = document.querySelector('#categoryList li.active');
    if(desktopCat && categoryListMobile){
      const cat = desktopCat.dataset.cat;
      Array.from(categoryListMobile.children).forEach(li => li.classList.toggle('active', li.dataset.cat === cat));
    }
  }

  // Sync mobile -> desktop when mobile inputs change
  function syncMobileToDesktop(){
    const desktopSearch = document.getElementById('search');
    const desktopSort = document.getElementById('sortSelect');
    const desktopView = document.getElementById('gridViewSelect');
    const desktopCurrency = document.getElementById('currencySelect');

    if(desktopSearch && searchMobile){ desktopSearch.value = searchMobile.value; desktopSearch.dispatchEvent(new Event('input')); }
    if(desktopSort && sortMobile){ desktopSort.value = sortMobile.value; desktopSort.dispatchEvent(new Event('change')); }
    if(desktopView && viewMobile){ desktopView.value = viewMobile.value; desktopView.dispatchEvent(new Event('change')); }
    if(desktopCurrency && currencyMobile){ desktopCurrency.value = currencyMobile.value; desktopCurrency.dispatchEvent(new Event('change')); }
  }

  // search sync (debounced)
  if(searchMobile){
    let t;
    searchMobile.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        syncMobileToDesktop();
        applyFilters();
      }, 220);
    });
  }

  // category click handler on mobile
  if(categoryListMobile){
    categoryListMobile.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if(!li) return;
      // mark active in mobile
      Array.from(categoryListMobile.children).forEach(i => i.classList.remove('active'));
      li.classList.add('active');
      const cat = li.dataset.cat;

      // also set active in desktop category list (if exists)
      const desktopList = document.getElementById('categoryList');
      if(desktopList){
        desktopList.querySelectorAll('li').forEach(x => x.classList.toggle('active', x.dataset.cat === cat));
      }

      // set desktop search/category state and filter
      // (ensure we update any hidden inputs)
      syncMobileToDesktop();
      applyFilters();
    });
  }

  // selects change => sync
  if(sortMobile) sortMobile.addEventListener('change', () => { syncMobileToDesktop(); applyFilters(); });
  if(viewMobile) viewMobile.addEventListener('change', () => { syncMobileToDesktop(); });
  if(currencyMobile) currencyMobile.addEventListener('change', () => { syncMobileToDesktop(); applyFilters(); });

  // On open, refresh mobile controls from desktop
  if(toggle){
    toggle.addEventListener('click', () => { setTimeout(syncDesktopToMobile, 50); });
  }

  // initial sync on load
  document.addEventListener('DOMContentLoaded', () => {
    syncDesktopToMobile();
  });
})();
// --- Mobile filter sync: search + categories + selects (mobile -> desktop) ---
// --- Mobile categories: clone desktop categories and keep them in sync ---
document.addEventListener('DOMContentLoaded', () => {
  const desktopList = document.getElementById('categoryList');
  const mobileList = document.getElementById('categoryListMobile');

  if (!desktopList || !mobileList) return;

  // clone all li nodes (preserve data-cat attr)
  mobileList.innerHTML = ''; // clear any existing
  desktopList.querySelectorAll('li').forEach(li => {
    const clone = li.cloneNode(true);
    // remove desktop-only classes to use mobile styling if needed
    clone.classList.remove('active');
    clone.classList.add('mobile-cat');
    mobileList.appendChild(clone);
  });

  // when user clicks mobile category -> activate desktop category & applyFilters
  mobileList.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const cat = li.dataset.cat;
    // set active on mobile
    mobileList.querySelectorAll('li').forEach(x => x.classList.remove('active'));
    li.classList.add('active');

    // find matching desktop li and trigger click (keeps existing desktop logic)
    const desktopTarget = Array.from(desktopList.querySelectorAll('li')).find(x => x.dataset.cat === cat);
    if (desktopTarget) {
      desktopList.querySelectorAll('li').forEach(x => x.classList.remove('active'));
      desktopTarget.classList.add('active');
    }

    // run filters
    applyFilters();
  });

  // if desktop category is clicked (normal desktop), propagate active state to mobile
  desktopList.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const cat = li.dataset.cat;
    // mirror to mobile
    mobileList.querySelectorAll('li').forEach(x => x.classList.toggle('active', x.dataset.cat === cat));
  });

  // initial mirror of active state
  const activeDesktop = desktopList.querySelector('li.active')?.dataset.cat;
  if (activeDesktop) {
    mobileList.querySelectorAll('li').forEach(x => x.classList.toggle('active', x.dataset.cat === activeDesktop));
  }
});
/* ========== Mobile buttons glue (paste di akhir storepage.js) ========== */
(function(){
  // helper: simulate desktop button click if handler exists there
  function hookByClick(mobileId, desktopId) {
    const m = document.getElementById(mobileId);
    const d = document.getElementById(desktopId);
    if (!m) return;
    if (d) {
      m.addEventListener('click', function(e){
        e.preventDefault();
        // if desktop button is a real element, trigger click to reuse its handler
        d.click();
        // close mobile panel if present (nice UX)
        const mobilePanel = document.getElementById('mobileControlsPanel');
        if (mobilePanel) mobilePanel.setAttribute('aria-hidden','true');
        const mobileToggle = document.getElementById('mobileControlsToggle');
        if (mobileToggle) mobileToggle.setAttribute('aria-expanded','false');
      }, {passive: true});
    } else {
      // fallback: if desktop handler is exposed as function, try call it
      const fnName = 'openPriceModal'; // common name used by many patterns
      if (typeof window[fnName] === 'function') {
        m.addEventListener('click', function(e){
          e.preventDefault();
          window[fnName]();
          const mobilePanel = document.getElementById('mobileControlsPanel');
          if (mobilePanel) mobilePanel.setAttribute('aria-hidden','true');
        }, {passive: true});
      }
    }
  }

  // Connect mobile Price button to desktop Price button
  hookByClick('priceBtnMobile', 'priceBtn');

  // Connect mobile About button (mobile panel) to desktop About handler
  // Note: there are two elements that may use id="aboutBtn" — desktop and mobile.
  // We attempt to map the one inside the mobile panel (if exists) to trigger desktop about.
  const aboutMobileInPanel = document.querySelector('#mobileControlsPanel #aboutBtn');
  if (aboutMobileInPanel) {
    aboutMobileInPanel.addEventListener('click', function(e){
      e.preventDefault();
      const desktopAbout = document.getElementById('aboutBtn');
      if (desktopAbout && desktopAbout !== aboutMobileInPanel) {
        desktopAbout.click();
      } else {
        // fallback: open about page if desktop handler missing
        window.location.href = 'about.html';
      }
      const mobilePanel = document.getElementById('mobileControlsPanel');
      if (mobilePanel) mobilePanel.setAttribute('aria-hidden','true');
    }, {passive: true});
  }

  // softwareBtn: ensure it behaves like a button on mobile and closes the panel after click
  const softwareBtn = document.getElementById('softwareBtn');
  if (softwareBtn) {
    softwareBtn.addEventListener('click', function(){
      // Close mobile controls panel (if open) to avoid stuck overlay
      const mobilePanel = document.getElementById('mobileControlsPanel');
      if (mobilePanel) mobilePanel.setAttribute('aria-hidden','true');
      const mobileToggle = document.getElementById('mobileControlsToggle');
      if (mobileToggle) mobileToggle.setAttribute('aria-expanded','false');
      // allow the link to navigate
    }, {passive: true});
  }

})();
document.addEventListener('DOMContentLoaded', function initStickyRecs(){
  const recsEl = document.getElementById('stickyRecs');
  if (!recsEl) return; // safety

  const track = document.getElementById('recsTrack');
  const prevBtn = recsEl.querySelector('.recs-nav.prev');
  const nextBtn = recsEl.querySelector('.recs-nav.next');
  const closeBtn = document.getElementById('recsClose');
// === Sticky recommendations (inject) ===
(function initStickyRecs(){
  const recsEl = document.getElementById('stickyRecs');
  if (!recsEl) return; // safety

  const track = document.getElementById('recsTrack');
  const prevBtn = recsEl.querySelector('.recs-nav.prev');
  const nextBtn = recsEl.querySelector('.recs-nav.next');
  const closeBtn = document.getElementById('recsClose');

  // contoh data; ganti dengan produk/video nyata (gunakan products[] jika mau)
  const recsData = (window.products && window.products.slice(0,12)) || [
    { id:'v1', title:'Rekomendasi Video', subtitle:'Video', img:'https://via.placeholder.com/320x180?text=Video' , url:'#'},
    { id:'p1', title:'Skin Alpha', subtitle:'Weapon', img:'https://via.placeholder.com/320x180?text=Skin+1' , url:'#'},
    { id:'p2', title:'Skin Beta', subtitle:'Armor', img:'https://via.placeholder.com/320x180?text=Skin+2' , url:'#'},
    // ...
  ];

  // build items
  recsData.forEach(item => {
    const it = document.createElement('div');
    it.className = 'recs-item';
    it.innerHTML = `
      <img src="${item.img}" alt="${(item.title||'')}" loading="lazy">
      <div class="label">${item.title}</div>
      <div class="muted">${item.subtitle || ''}</div>
    `;
    it.addEventListener('click', (e) => {
      // klik: buka url (produk, video, detail modal)
      if (item.url && item.url.startsWith('#') === false) {
        window.open(item.url, '_blank');
      } else {
        // jika id produk, buka product modal (jika ada)
        const prod = products && products.find(p => String(p.id) === String(item.id));
        if (prod) {
          openProductModal(prod);
        } else {
          // fallback: jika url '#', do nothing or show contact
          window.location.href = item.url || '#';
        }
      }
    });
    track.appendChild(it);
  });

  // simple slide state (pixel-wise)
  let x = 0;
  function clampX(val) {
    const trackWidth = track.scrollWidth;
    const viewport = track.parentElement.clientWidth;
    const max = Math.max(0, trackWidth - viewport);
    return Math.max(0, Math.min(max, val));
  }

  function scrollToX(val) {
    x = clampX(val);
    track.style.transform = `translateX(-${x}px)`;
  }

  // prev/next scroll by viewport width
  if (prevBtn) prevBtn.addEventListener('click', () => {
    const viewport = track.parentElement.clientWidth;
    scrollToX(x - (viewport * 0.75));
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    const viewport = track.parentElement.clientWidth;
    scrollToX(x + (viewport * 0.75));
  });

  // touch drag support - basic
  let startX = 0, startTranslate = 0, dragging = false;
  track.parentElement.addEventListener('pointerdown', (ev) => {
    dragging = true;
    startX = ev.clientX;
    // compute current translateX from style
    const m = track.style.transform.match(/translateX\(-?([\d.]+)px\)/);
    startTranslate = m ? parseFloat(m[1]) : x;
    track.style.transition = 'none';
    ev.target.setPointerCapture && ev.target.setPointerCapture(ev.pointerId);
  });
  window.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const dx = ev.clientX - startX;
    scrollToX(startTranslate - dx);
  });
  window.addEventListener('pointerup', (ev) => {
    if (!dragging) return;
    dragging = false;
    track.style.transition = ''; // restore CSS transition
  });

  // close button
  if (closeBtn) closeBtn.addEventListener('click', () => {
    recsEl.style.display = 'none';
  });

  // autoplay (optional) — scroll slowly
  let autoTimer = setInterval(() => {
    const viewport = track.parentElement.clientWidth;
    const trackWidth = track.scrollWidth;
    const max = Math.max(0, trackWidth - viewport);
    if (x >= max) {
      // reset to start
      scrollToX(0);
    } else {
      scrollToX(x + 160);
    }
  }, 2600);

  // pause on hover/touch
  recsEl.addEventListener('mouseenter', () => clearInterval(autoTimer));
  recsEl.addEventListener('mouseleave', () => {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      const viewport = track.parentElement.clientWidth;
      const trackWidth = track.scrollWidth;
      const max = Math.max(0, trackWidth - viewport);
      if (x >= max) scrollToX(0); else scrollToX(x + 160);
    }, 2600);
  });

})();
});
// pastikan element sticky sudah ada
(function ensureContentSpacingForSticky(){
  const sticky = document.getElementById('stickyRecs');
  if (!sticky) return;

  // cari target layout utama; ubah selector jika projectmu pakai lain
  const mainTarget = document.querySelector('.app') || document.querySelector('#app') || document.body;

  function applyPadding() {
    // dapatkan tinggi total sticky + gap
    const rect = sticky.getBoundingClientRect();
    const height = Math.ceil(rect.height) + 8; // 8px safety
    // terapkan padding-bottom hanya jika lebih besar dari padding sekarang
    const current = parseInt(getComputedStyle(mainTarget).paddingBottom) || 0;
    if (current < height) {
      mainTarget.style.paddingBottom = height + 'px';
    }
  }

  // jalankan sekali dan ketika resize/zoom berubah
  applyPadding();
  window.addEventListener('resize', applyPadding);
  // jika sticky bisa ditutup, reset padding ketika disembunyikan
  const closeBtn = document.getElementById('recsClose');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    // jangan hilangkan padding kalau elemen masih ada tapi display none
    if (sticky.style.display === 'none' || getComputedStyle(sticky).display === 'none') {
      // reset ke nilai semula (kosongkan agar mengikuti CSS default)
      mainTarget.style.paddingBottom = '';
    }
  });
})();
// collapsible behavior
(function stickyCollapseToggle(){
  const sticky = document.getElementById('stickyRecs');
  if (!sticky) return;
  // default collapsed
  sticky.classList.add('collapsed');

  // jika ada tombol untuk expand/collapse (opsional)
  sticky.addEventListener('dblclick', () => { // double-click toggles
    sticky.classList.toggle('collapsed');
  });
})();
(function addTopPaddingForSticky(){
  const sticky = document.getElementById('stickyRecs');
  if (!sticky) return;

  const target = document.querySelector('.app') || document.body;

  function applyPad() {
    const h = sticky.getBoundingClientRect().height;
    target.style.paddingTop = (h + 40) + 'px'; // 40px buffer aman
  }

  applyPad();
  window.addEventListener('resize', applyPad);
})();
// ---- AD INJECTION (paste this near the end of storepage.js) ----
async function loadAdvertisementsDebug() {
  console.log('[ADS] trying to fetch advertisement.json (same folder)...');
  try {
    const res = await fetch('advertisement.json', { cache: 'no-store' });
    console.log('[ADS] fetch response status:', res.status);
    if (!res.ok) {
      console.warn('[ADS] advertisement.json fetch not ok:', res.status);
      return [];
    }
    const data = await res.json();
    console.log('[ADS] advertisement.json parsed:', data);
    // Accept either an array at root or object with .items
    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    return items;
  } catch (err) {
    console.error('[ADS] loadAdvertisementsDebug error:', err);
    return [];
  }
}
document.addEventListener('DOMContentLoaded', async function populateRecsFromJSON_debug() {
  const track = document.getElementById('recsTrack');
  if (!track) {
    console.warn('[ADS] #recsTrack not found in DOM');
    return;
  }
  (async function populateRecsFromJSON_debug() {
    const track = document.getElementById('recsTrack');
    if (!track) {
      console.warn('[ADS] #recsTrack not found in DOM');
      return;
    }

    const ads = await loadAdvertisementsDebug();
    console.log('[ADS] items to render:', ads.length);

    if (!ads.length) {
      track.innerHTML = '<div style="color:var(--muted);padding:12px">No ads loaded (check advertisement.json)</div>';
      return;
    }

    track.innerHTML = ''; // clear any existing
    ads.forEach(item => {
      // normalize minimal fields
      const img = item.img || item.image || item.thumb || '';
      const title = item.title || item.name || '';
      const subtitle = item.subtitle || item.desc || '';
      const url = item.url || item.link || '#';
      const type = item.type || 'link';

      const el = document.createElement('div');
      el.className = 'recs-item';
      el.innerHTML = `
        <img src="${img}" alt="${title}" loading="lazy">
        <div class="label">${title}</div>
        <div class="muted">${subtitle}</div>
      `;
      el.addEventListener('click', (e) => {
        if (type === 'product' && url.includes('id=')) {
          // try open modal if exists
          const pid = url.split('id=')[1];
          if (window.products) {
            const prod = products.find(p => String(p.id) === String(pid));
            if (prod && typeof openProductModal === 'function') return openProductModal(prod);
          }
        }
        // special: if youtube short / watch, just open in new tab
        if (url.includes('youtube') || url.includes('youtu.be')) {
          window.open(url, '_blank');
          return;
        }
        // default nav
        window.open(url, '_blank');
      });

      track.appendChild(el);
    });

    console.log('[ADS] render done');
  })();
});