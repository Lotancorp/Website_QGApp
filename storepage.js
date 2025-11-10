// storepage.js (fixed)
// single-file unified init: load products, attach events, handle contact & gallery

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let products = [];
let currency = 'usd'; // default
let filtered = [];

// ----------------- load products -----------------
async function loadProducts() {
  // 1) coba cari script langsung di halaman
  const inline = document.getElementById('product-data');
  if (inline) {
    try {
      products = JSON.parse(inline.textContent);
      window.products = products;
      return;
    } catch (e) {
      console.error('Invalid JSON in product-data script', e);
    }
  }

  // 2) kalau tidak ada, ambil dari file products.html
  try {
    const res = await fetch('products.html', { cache: 'no-store' });
    const text = await res.text();

    // ambil isi di dalam <script id="product-data">...</script>
    const match = text.match(/<script[^>]+id=["']product-data["'][^>]*>([\s\S]*?)<\/script>/);
    if (match) {
      products = JSON.parse(match[1]);
      window.products = products;
      return;
    } else {
      console.warn('product-data tag not found in products.html');
    }
  } catch (err) {
    console.error('Error loading products.html:', err);
  }

  // 3) fallback: kosong
  products = [];
  window.products = products;
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
// ---------- Cloudinary / proxy image loader ----------
// Tries explicit product.images first; else calls local proxy server which in turn calls Cloudinary Search API.
// If you deploy proxy elsewhere, change PROXY_BASE.
const PROXY_BASE = 'http://localhost:3000'; // change to your deployed URL later

async function loadImagesForProduct(product) {
  if (!product) return [];
  if (Array.isArray(product.images) && product.images.length) return product.images;
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
    const thumbSrc = p.thumbnail || (p.images && p.images.length ? p.images[0] : '') || 'assets/placeholder-thumb.jpg';

    const youtubeBtn = p.youtube
      ? `<a class="btn-outline btn-youtube" href="${p.youtube}" target="_blank" rel="noopener">YouTube</a>`
      : '';

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


      el.innerHTML = `
      <div class="thumb" aria-hidden="true">
        <img class="card-thumb" data-thumb-id="${p.id}" src="${thumbSrc}" alt="${p.name} thumb">
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
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      const id = window.lastSelectedProductId;
      // if no last selected, copy root page URL
      const url = id ? `${location.origin}${location.pathname}?product=${encodeURIComponent(id)}` : `${location.href}`;
      try {
        await navigator.clipboard.writeText(url);
        // show near button (use event or the button element)
        showToastAt('Link copied to clipboard!', copyLinkBtn, { type: 'success', duration: 2800, offsetY: -36 });
      } catch (err) {
        // fallback: prompt + toast at center
        prompt('Copy this link', url);
        showToastAt('Could not auto-copy — please copy manually.', null, { type:'error', duration:3500 });
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
  const closeProductModalBtn = $('#closeProductModal');
  const productPrev = $('#productPrev');
  const productNext = $('#productNext');

  let productImages = [];
  let productIndex = 0;
  let currentOpenProduct = null;

  function showProductAt(i) {
    if (!productImages || !productImages.length) return;
    productIndex = ((i % productImages.length) + productImages.length) % productImages.length;
    if (productMainImage) productMainImage.src = productImages[productIndex];
    if (productThumbs) {
      Array.from(productThumbs.children).forEach((img, idx) => img.classList.toggle('active', idx === productIndex));
    }
    if (productCaption) productCaption.textContent = `${productIndex + 1} / ${productImages.length}`;
  }

  function openProductModal(prod) {
    if (!productModal) return;
    currentOpenProduct = prod;
  
    // images (prod.images expected)
    productImages = (Array.isArray(prod.images) && prod.images.length) ? prod.images : [];

  
    // --- RIGHT THUMB: prioritaskan prod.thumbnail, lalu first productImages, lalu placeholder
    const rightThumbEl = document.getElementById('productRightThumb');
    const placeholder = 'assets/placeholder-thumb.jpg'; // pastikan file ini ada atau ganti path
    const rightSrc = (prod && prod.thumbnail && prod.thumbnail.trim()) ? prod.thumbnail.trim()
                    : (productImages.length ? productImages[0] : '');
  
    if (rightThumbEl) {
      if (rightSrc) {
        rightThumbEl.src = rightSrc;
        rightThumbEl.style.display = 'block';
        // if image fails to load, fallback to placeholder
        rightThumbEl.onerror = () => { rightThumbEl.onerror = null; rightThumbEl.src = placeholder; rightThumbEl.style.display = 'block'; };
      } else {
        rightThumbEl.src = placeholder;
        rightThumbEl.style.display = 'block';
      }
    }
  
    // --- Do NOT unshift thumbnail into productImages (avoid duplication/side-effect)
    // productImages remains only prod.images
  
    // if still empty, show toast but continue (do not crash)
    if (!productImages.length) {
      showToastAt && showToastAt('No gallery images available for this item. Showing thumbnail only.', null, { type: 'info' });
    }
  
    // fill left gallery
    productThumbs.innerHTML = '';
    const mainSrc = (productImages.length ? productImages[0] : (prod.thumbnail || ''));
    if (productMainImage) {
      productMainImage.src = mainSrc || placeholder;
      productMainImage.onerror = () => { productMainImage.onerror = null; productMainImage.src = placeholder; };
    }
  
    // build thumbs (jika ada)
    productImages.forEach((src, idx) => {
      const t = document.createElement('img');
      t.src = src;
      t.dataset.index = idx;
      t.addEventListener('click', () => { showProductAt(idx); });
      // error fallback for each thumb
      t.onerror = () => { t.onerror = null; t.src = placeholder; };
      productThumbs.appendChild(t);
    });
  
    // mark active thumb
    Array.from(productThumbs.children).forEach((img, idx) => {
      const isActive = (img.src === mainSrc) || (idx === 0 && !prod.thumbnail);
      img.classList.toggle('active', isActive);
    });
  
    // fill meta
    productTitle.textContent = prod.name || 'Unknown';
    productDesc.textContent = prod.desc || '';
    if (productRelease) productRelease.textContent = prod.release_date ? `Release: ${prod.release_date}` : 'Release: -';
    if (productRarity) productRarity.textContent = prod.rarity || '';
    if (productPrice) productPrice.textContent = formatPrice(currency === 'usd' ? prod.price_usd : prod.price_idr);
    if (productSKU) productSKU.textContent = prod.id || '-';
    // tampilkan rating bintang dari 1–5 (bisa desimal)
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

  
    // youtube
    if (prod.youtube) {
      productYoutube.href = prod.youtube;
      productYoutube.style.display = 'inline-flex';
    } else {
      productYoutube.style.display = 'none';
    }
  
    // tags
    const tagWrap = document.getElementById('productTags');
    if (tagWrap) {
      tagWrap.innerHTML = '';
      if (Array.isArray(prod.tags) && prod.tags.length) {
        prod.tags.forEach(t => {
          const el = document.createElement('span');
          el.className = 'product-tag';
          el.textContent = t;
          tagWrap.appendChild(el);
        });
        tagWrap.style.display = 'flex';
      } else {
        tagWrap.style.display = 'none';
      }
    }
  
    productContactBtn.onclick = () => {
      window.lastSelectedProductId = prod.id;
      window.lastSelectedProductName = prod.name;
      openContact({ name:'', message:`I'm interested in "${prod.name}" (ID:${prod.id}). Please share price & availability.` });
    };
  
    productModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showProductAt(0);
  }
  

  // close
  function closeProductModal() {
    if (!productModal) return;
    productModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    productMainImage.src = '';
    if (productThumbs) productThumbs.innerHTML = '';
    currentOpenProduct = null;
  }

  if (closeProductModalBtn) closeProductModalBtn.addEventListener('click', closeProductModal);
  if (productPrev) productPrev.addEventListener('click', () => showProductAt(productIndex - 1));
  if (productNext) productNext.addEventListener('click', () => showProductAt(productIndex + 1));
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
