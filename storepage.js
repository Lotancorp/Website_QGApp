// storepage.js (fixed)
// single-file unified init: load products, attach events, handle contact & gallery

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let products = [];
let currency = 'usd'; // default
let filtered = [];

// ----------------- load products -----------------
async function loadProducts() {
  try {
    const res = await fetch('products.html', { cache: "no-store" });
    const txt = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(txt, 'text/html');
    const script = doc.getElementById('product-data');
    if (!script) throw new Error('product-data not found in products.html');
    products = JSON.parse(script.textContent);
  } catch (err) {
    console.error('Failed to load products:', err);
    products = [];
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

// ----------------- render -----------------
function render(list) {
  const grid = $('#productGrid');
  const empty = $('#emptyState');
  if (!grid) return;
  grid.innerHTML = '';

  if (!list || !list.length) { if (empty) empty.hidden = false; return; } else { if (empty) empty.hidden = true; }

  list.forEach(p => {
    const el = document.createElement('article');
    el.className = 'card' + (p.featured ? ' featured' : '');
    const thumbSrc = (p.images && p.images.length) ? p.images[0] : '';
    const youtubeBtn = p.youtube ? `<a class="btn-outline btn-youtube" href="${p.youtube}" target="_blank" rel="noopener">YouTube</a>` : '';

    el.innerHTML = `
      <div class="thumb" aria-hidden="true">
        ${thumbSrc ? `<img src="${thumbSrc}" alt="${p.name} thumb">` : `<div style="color:var(--muted)">${(p.name||'Item').split(' ')[0]}</div>`}
      </div>
      <h4>${p.name}</h4>
      <p class="muted" style="font-size:13px;margin:0">${p.desc || ''}</p>
      <div class="price">
        <div class="badge">${p.rarity || 'Common'}</div>
        <div>
          <div class="value">${formatPrice(currency === 'usd' ? p.price_usd : p.price_idr)}</div>
          <div style="font-size:12px;color:var(--muted)">Rate: ${Math.round(100000 / ((p.price_usd || 1) + 10))}k</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn-outline btn-view" data-id="${p.id}">View</button>
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
  document.body.addEventListener('click', (e) => {
    // VIEW -> gallery
    if (e.target && e.target.matches && e.target.matches('.btn-view')) {
      const id = e.target.dataset.id;
      const prod = products.find(p => String(p.id) === String(id));
      if (prod) openGallery(prod);
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
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', () => {
      const name = window.lastSelectedProductName || 'your skin';
      const msg = encodeURIComponent(`I'm interested in your ${name}`);
      const normalized = (MY_WHATSAPP_NUMBER || '').replace(/[^\d+]/g, '');
      const waNumber = normalized.startsWith('+') ? normalized.slice(1) : normalized;
      const waUrl = `https://wa.me/${waNumber}?text=${msg}`;
      window.open(waUrl, '_blank');
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      const id = window.lastSelectedProductId;
      // if no last selected, copy root page URL
      const url = id ? `${location.origin}${location.pathname}?product=${encodeURIComponent(id)}` : `${location.href}`;
      try {
        await navigator.clipboard.writeText(url);
        // give feedback (simple alert — you can replace with toast)
        alert('Link copied to clipboard:\n' + url);
      } catch (err) {
        // fallback: prompt
        prompt('Copy this link', url);
      }
    });
  }


  if (facebookBtn) facebookBtn.href = MY_FACEBOOK_URL;
  if (instagramBtn) instagramBtn.href = MY_INSTAGRAM_URL;

  function openContact(prefill) {
    if (!contactModal) return;
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
  }

  function closeContact() {
    if (!contactModal) return;
    contactModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // sidebar contact button (opens modal)
  if (contactBtnMain) contactBtnMain.addEventListener('click', () => openContact());

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

  function openGallery(prod) {
    galleryList = (prod.images || []).slice(0, 10);
    if (!galleryList.length) { alert('No images available for this item.'); return; }
    if (!galleryModal) return;
    galleryModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (galleryThumbs) {
      galleryThumbs.innerHTML = '';
      galleryList.forEach((src, idx) => {
        const t = document.createElement('img');
        t.src = src;
        t.alt = `${prod.name} ${idx+1}`;
        t.addEventListener('click', () => showGalleryAt(idx));
        galleryThumbs.appendChild(t);
      });
    }
    showGalleryAt(0);
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

// ----------------- INIT -----------------
async function init() {
  await loadProducts();
  // ensure currency default matches select (if exists)
  const currencySel = $('#currencySelect');
  currency = currencySel ? currencySel.value || 'usd' : 'usd';
  await loadBanners();
  attachEvents();
  // set year
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // initial render
  applyFilters();
}

document.addEventListener('DOMContentLoaded', init);
