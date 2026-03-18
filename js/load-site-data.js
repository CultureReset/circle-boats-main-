// ============================================
// Website Data Loader
// Fetches from /api/site-data (dashboard source of truth)
// Caches in localStorage — works offline after first load
// ============================================

const CACHE_KEY = 'beachside_site_data';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadWebsiteData() {
  let data = null;

  // 1. Try localStorage cache first (instant, works offline)
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const cachedAt = localStorage.getItem(CACHE_KEY + '_ts');
    if (cached && cachedAt && (Date.now() - parseInt(cachedAt)) < CACHE_TTL) {
      data = JSON.parse(cached);
      applyAllData(data);
      // Refresh in background so next visit gets fresh data
      fetchAndCache().then(fresh => { if (fresh) applyAllData(fresh); });
      return;
    }
  } catch (e) {}

  // 2. Fetch fresh from API
  data = await fetchAndCache();
  if (data) applyAllData(data);
}

async function fetchAndCache() {
  try {
    const base = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : 'https://cybercheck-api-database.vercel.app';

    const res = await fetch(`${base}/api/site-data`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_KEY + '_ts', Date.now().toString());
    return data;
  } catch (e) {
    console.warn('Could not fetch site data:', e.message);
    // Try stale cache as last resort
    try {
      const stale = localStorage.getItem(CACHE_KEY);
      if (stale) return JSON.parse(stale);
    } catch (_) {}
    return null;
  }
}

// Resolve image paths — API returns paths prefixed with /beachside-site/
// but the deployed website hosts them at the root (e.g. images/goboat/...)
function resolveImageUrl(src) {
  if (!src) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  // Strip the /beachside-site/ prefix — website serves these from the root
  if (src.startsWith('/beachside-site/')) {
    return src.replace('/beachside-site/', '');
  }
  // Already relative (e.g. images/goboat/...) — keep as-is
  return src;
}

function applyAllData(data) {
  if (!data) return;
  window.SITE_DATA = data;
  syncBookingPrices(data);
  updateHeroSection(data);
  updateBusinessInfo(data);
  updateAboutSection(data);
  updateGroupRate(data);
  updateProductsSection(data);
  updateDocksSection(data);
  updateWhatsIncluded(data);
  updateAddonsSection(data);
  updateStepsSection(data);
  updateFeaturesSection(data);
  updateLocationsSection(data);
  updateGallerySection(data);
  updateReviewsSection(data);
  updateQnASection(data);
  applyBookingPolicy(data);
  updateSocialSection(data);
  updateContactInterests(data);
  updateLinksPage(data);
  // Re-apply fade-in animations to newly created elements
  reobserveFadeIns();
}

function updateAboutSection(data) {
  if (!data.about) return;
  var a = data.about;
  if (a.title) document.querySelectorAll('[data-bind="pages.about.title"]').forEach(function(el) { el.textContent = a.title; });
  if (a.subtitle) document.querySelectorAll('[data-bind="pages.about.subtitle"]').forEach(function(el) { el.textContent = a.subtitle; });

  // Photo block — full-width square, full image visible (object-fit: contain)
  var imgWrap = document.getElementById('about-photo-wrap');
  if (imgWrap) {
    if (a.image) {
      imgWrap.style.display = 'block';
      var img = imgWrap.querySelector('img');
      if (img) {
        img.src = a.image;
        img.alt = a.title || 'About us';
      }
    } else {
      imgWrap.style.display = 'none';
    }
  }

  // Text block
  var descEl = document.getElementById('about-description');
  if (descEl && a.description) descEl.textContent = a.description;
  var forEl = document.getElementById('about-perfect-for');
  if (forEl && a.perfectFor) forEl.textContent = a.perfectFor;

  // Feature highlights grid — rebuild with images when set from dashboard
  if (a.features && a.features.length) {
    var grid = document.getElementById('about-features-grid');
    if (grid) {
      grid.innerHTML = a.features.map(function(f) {
        var hasImg = f.image && f.image.length > 0;
        return '<div class="about-feature-item">' +
          (hasImg
            ? '<div class="about-feature-img"><img src="' + f.image + '" alt="' + (f.title || '') + '" style="width:100%;height:100%;object-fit:contain;display:block;" loading="lazy"></div>'
            : (f.icon ? '<div class="about-feature-icon">' + f.icon + '</div>' : '')) +
          '<h4>' + (f.title || '') + '</h4>' +
          '<p>' + (f.description || '') + '</p>' +
        '</div>';
      }).join('');
    }
  }
}

function updateGroupRate(data) {
  var gr = data.group_rate;
  if (!gr) return;
  var banner = document.querySelector('.group-banner');
  if (!banner) return;
  var h3 = banner.querySelector('h3');
  var p = banner.querySelector('p');
  var strong = banner.querySelector('.group-banner-price strong');
  var span = banner.querySelector('.group-banner-price span');
  var btn = banner.querySelector('.btn');
  if (h3 && gr.title) h3.textContent = gr.title;
  if (p && gr.description) p.textContent = gr.description;
  if (strong && gr.price) strong.textContent = '$' + gr.price;
  if (span && gr.priceLabel) span.textContent = gr.priceLabel;
  if (btn && gr.ctaText) btn.textContent = gr.ctaText;
  if (btn && gr.ctaUrl) btn.href = gr.ctaUrl;
}

// ─── Links Page (links.html) ─────────────────────────────────────────────────
// Only runs when the links.html DOM elements are present
function updateLinksPage(data) {

  // ── Update profile info from business data ──
  var b = data.business || {};
  var nameEl = document.querySelector('.profile-name');
  if (nameEl && b.name) nameEl.textContent = b.name;

  var taglineEl = document.querySelector('.profile-tagline');
  if (taglineEl && b.tagline) taglineEl.textContent = b.tagline;

  // Phone links
  if (b.phone) {
    var ph = 'tel:' + b.phone.replace(/\D/g, '');
    document.querySelectorAll('a[href^="tel:"]').forEach(function(a) { a.href = ph; });
    var callBtn = document.querySelector('.call-btn');
    if (callBtn) callBtn.textContent = '📞 ' + b.phone;
  }

  // Address in info items
  if (b.address) {
    document.querySelectorAll('.info-item span').forEach(function(el) {
      if (el.textContent.indexOf('Canal Road') > -1 || el.textContent.indexOf('Orange Beach') > -1) {
        el.textContent = b.address;
      }
    });
  }

  // ── Rebuild link buttons from links_page.links ──
  var lp = data.links_page;
  var container = document.querySelector('.links-container');
  if (lp && lp.links && container) {
    var enabledLinks = lp.links.filter(function(l) { return l.enabled; });
    container.innerHTML = enabledLinks.map(function(l) {
      if (l.id === 'website') {
        return '<a href="' + (l.url || 'index.html') + '" class="link-item">' +
          '<span class="link-icon">' + (l.icon || '🌐') + '</span>' +
          '<div class="link-text">' + l.label + (l.sub ? '<div class="link-sub">' + l.sub + '</div>' : '') + '</div>' +
          '<span class="link-arrow">&rsaquo;</span>' +
        '</a>';
      }
      // Custom external links
      if (l.url && l.id !== 'website') {
        return '<a href="' + l.url + '" class="link-item" target="_blank" rel="noopener">' +
          '<span class="link-icon">' + (l.icon || '🔗') + '</span>' +
          '<div class="link-text">' + l.label + (l.sub ? '<div class="link-sub">' + l.sub + '</div>' : '') + '</div>' +
          '<span class="link-arrow">&rsaquo;</span>' +
        '</a>';
      }
      // Modal-opening links
      return '<div class="link-item" onclick="openModal(\'' + l.id + '\')">' +
        '<span class="link-icon">' + (l.icon || '📌') + '</span>' +
        '<div class="link-text">' + l.label + (l.sub ? '<div class="link-sub">' + l.sub + '</div>' : '') + '</div>' +
        '<span class="link-arrow">&rsaquo;</span>' +
      '</div>';
    }).join('');
  }

  // ── Fleet modal — products ──
  if (data.products && data.products.length) {
    var fleetModal = document.getElementById('fleetModal');
    if (fleetModal) {
      var pkgContainer = fleetModal.querySelector('.modal-content');
      if (pkgContainer) {
        // Remove existing pkg-items, keep the header and group rate box
        pkgContainer.querySelectorAll('.pkg-item').forEach(function(el) { el.remove(); });
        var insertBefore = pkgContainer.querySelector('div[style]'); // the group rate box
        data.products.forEach(function(p) {
          var div = document.createElement('div');
          div.className = 'pkg-item';
          div.setAttribute('onclick', "openModal('booking')");
          var minP = Math.min(p.halfDayAM || p.halfDay || 0, p.halfDayPM || p.halfDay || 0);
          div.innerHTML = (p.image ? '<img src="' + resolveImageUrl(p.image) + '" alt="' + p.name + '" class="pkg-image">' : '') +
            '<div class="pkg-info">' +
              '<div class="pkg-name">' + p.name + (p.featured ? ' <span class="pkg-badge">Popular</span>' : '') + '</div>' +
              '<div class="pkg-desc">' + p.description + '</div>' +
            '</div>' +
            '<div class="pkg-price">$' + minP + '–$' + (p.allDay || 0) + '</div>';
          if (insertBefore) pkgContainer.insertBefore(div, insertBefore);
          else pkgContainer.appendChild(div);
        });
      }
    }
  }

  // ── Gallery modal ──
  if (data.gallery && data.gallery.length) {
    var galGrid = document.querySelector('#galleryModal .gallery-grid');
    if (galGrid) {
      galGrid.innerHTML = data.gallery.slice(0, 8).map(function(img) {
        var src = resolveImageUrl(typeof img === 'string' ? img : img.url);
        return '<img src="' + src + '" alt="Gallery" class="gallery-image" loading="lazy" onerror="this.style.display=\'none\'">';
      }).join('');
    }
  }

  // ── Reviews modal ──
  if (data.reviews) {
    var items = Array.isArray(data.reviews) ? data.reviews : (data.reviews.items || []);
    var rating = data.reviews.rating || 5;
    var rvModal = document.getElementById('reviewsModal');
    if (rvModal && items.length) {
      var ratingEl = rvModal.querySelector('div[style*="48px"]');
      if (ratingEl) ratingEl.textContent = rating;
      // Remove existing review-items and rebuild
      rvModal.querySelectorAll('.review-item').forEach(function(el) { el.remove(); });
      var rvContent = rvModal.querySelector('.modal-content');
      if (rvContent) {
        items.forEach(function(r) {
          var div = document.createElement('div');
          div.className = 'review-item';
          div.innerHTML = '<div class="review-top">' +
            '<div class="review-avatar">' + (r.initial || (r.name || '?').charAt(0)) + '</div>' +
            '<div><div class="review-name">' + (r.name || '') + '</div>' +
            '<div class="review-stars">' + '★'.repeat(r.stars || 5) + '</div></div>' +
          '</div><div class="review-text">' + (r.text || '') + '</div>';
          rvContent.appendChild(div);
        });
      }
    }
  }

  // ── Social icons ──
  if (data.social) {
    var SOCIAL_MAP = {
      facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok'
    };
    document.querySelectorAll('.social-icon').forEach(function(a) {
      var title = a.getAttribute('title');
      Object.keys(SOCIAL_MAP).forEach(function(key) {
        if (SOCIAL_MAP[key] === title && data.social[key]) {
          a.href = data.social[key];
        }
      });
    });
  }

  // ── About modal — update description and what's included ──
  if (data.about) {
    var aboutDesc = document.querySelector('#aboutModal p');
    if (aboutDesc && data.about.description) aboutDesc.textContent = data.about.description;
  }
  if (data.whats_included && data.whats_included.length) {
    var wiGrid = document.querySelector('#aboutModal .modal-content div[style*="grid-template-columns: repeat(2"]');
    if (wiGrid) {
      wiGrid.innerHTML = data.whats_included.map(function(item) {
        return '<div>&#x2705; ' + item + '</div>';
      }).join('');
    }
  }
}

// Keep booking modal pricing in sync with dashboard prices
function syncBookingPrices(data) {
  if (!data.products || !window.PRICES) return;
  data.products.forEach(function(p) {
    var key = (p.key || p.name.toLowerCase().split(' ')[0]);
    window.PRICES[key] = {
      am:  p.halfDayAM ?? p.halfDay ?? 0,
      pm:  p.halfDayPM ?? p.halfDay ?? 0,
      all: p.allDay ?? 0
    };
  });
}

// Update contact form "Interested In" dropdown from dashboard data
function updateContactInterests(data) {
  var sel = document.getElementById('contact-interest');
  if (!sel) return;
  var opts = ['<option value="">Select one...</option>'];
  if (data.products) {
    data.products.forEach(function(p) {
      opts.push('<option>' + p.name + ' — Half Day ($' + (p.halfDayAM ?? p.halfDay) + ')</option>');
      opts.push('<option>' + p.name + ' — All Day ($' + p.allDay + ')</option>');
    });
  }
  if (data.docks && data.docks.length) {
    opts.push('<option>Dock Rental ($' + data.docks[0].allDay + ')</option>');
  }
  opts.push('<option>Add-ons</option>');
  opts.push('<option>Private Event</option>');
  opts.push('<option>General Question</option>');
  sel.innerHTML = opts.join('');
}

function updateHeroSection(data) {
  if (!data.hero) return;
  const tag = document.querySelector('.hero-tag');
  if (tag && data.hero.location) tag.textContent = data.hero.location;
  const h1 = document.querySelector('.hero h1');
  if (h1 && data.hero.title) {
    // Preserve the teal <span> styling on the second half of the title
    var parts = data.hero.title.split(/(?<=to\s)/i);
    if (parts.length >= 2) {
      h1.innerHTML = parts[0] + '<span>' + parts.slice(1).join('') + '</span>';
    } else {
      h1.textContent = data.hero.title;
    }
  }
  const desc = document.querySelector('.hero-desc');
  if (desc && data.hero.subtitle) desc.textContent = data.hero.subtitle;

  // Hero video — managed from dashboard
  var heroMedia = document.getElementById('heroMedia');
  if (heroMedia) {
    var videoUrl = (data.hero.videoUrl || '').trim();
    if (!videoUrl) {
      // No video set — hide the hero media entirely
      heroMedia.style.display = 'none';
    } else {
      heroMedia.style.display = '';
      var embedUrl = parseVideoEmbed(videoUrl);
      if (embedUrl) {
        heroMedia.innerHTML = '<iframe src="' + embedUrl + '" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
      } else {
        // Direct video URL (mp4, etc.)
        heroMedia.innerHTML = '<video src="' + videoUrl + '" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video>';
      }
    }
  }
}

// Convert YouTube/Vimeo URLs → embeddable iframe src
function parseVideoEmbed(url) {
  if (!url) return null;
  // Already an embed URL
  if (url.includes('/embed/') || url.includes('player.vimeo.com')) return url;
  // YouTube watch URL
  var yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return 'https://www.youtube.com/embed/' + yt[1] + '?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&playlist=' + yt[1];
  // Vimeo
  var vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return 'https://player.vimeo.com/video/' + vm[1] + '?autoplay=1&muted=1&loop=1&background=1';
  // Google Drive
  var gd = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (gd) return 'https://drive.google.com/file/d/' + gd[1] + '/preview';
  return null;
}

function updateBusinessInfo(data) {
  if (!data.business) return;
  var b = data.business;
  document.querySelectorAll('[data-bind="business.name"]').forEach(function(el) { el.textContent = b.name; });
  document.querySelectorAll('[data-bind="business.phone"]').forEach(function(el) {
    el.textContent = b.phone;
    if (el.tagName === 'A') el.href = 'tel:' + b.phone.replace(/\D/g, '');
  });
  document.querySelectorAll('[data-bind="business.email"]').forEach(function(el) {
    el.textContent = b.email;
    if (el.tagName === 'A') el.href = 'mailto:' + b.email;
  });
  document.querySelectorAll('[data-bind="business.address"]').forEach(function(el) { el.textContent = b.address; });
  document.querySelectorAll('[data-bind="business.hours"]').forEach(function(el) { el.textContent = b.hours; });
  document.querySelectorAll('[data-bind="business.hoursNote"]').forEach(function(el) { el.textContent = b.hoursNote || ''; });
  if (data.footer) {
    document.querySelectorAll('[data-bind="footer.tagline"]').forEach(function(el) { el.textContent = data.footer.tagline || ''; });
  }
}

function updateProductsSection(data) {
  if (!data.products || !data.products.length) return;
  const container = document.querySelector('.product-grid');
  if (!container) return;
  container.innerHTML = data.products.map(p => `
    <div class="product-card ${p.featured ? 'featured' : ''}">
      ${p.featured ? '<div class="product-badge">Popular</div>' : ''}
      <div class="product-image swipe-carousel" data-count="1">
        <div class="swipe-track">
          ${p.image
            ? `<img src="${resolveImageUrl(p.image)}" alt="${p.name}">`
            : `<div style="width:100%;height:200px;display:flex;align-items:center;justify-content:center;color:#999;font-size:32px;">🚤</div>`}
        </div>
      </div>
      <div class="product-body">
        <h3>${p.name}</h3>
        <p class="desc">${p.description}</p>
        <div class="price-row"><span class="price-label">Half Day 9:00 – 1:00</span><span class="price-amount">$${p.halfDayAM ?? p.halfDay}</span></div>
        <div class="price-row"><span class="price-label">Half Day 2:00 – 6:00</span><span class="price-amount">$${p.halfDayPM ?? p.halfDay}</span></div>
        <div class="price-row"><span class="price-label">All Day 9:00 – 6:00</span><span class="price-amount">$${p.allDay}</span></div>
        ${p.specs ? `<div class="product-specs">${p.specs}</div>` : ''}
        <button class="btn btn-primary" onclick="openBooking()">Reserve</button>
      </div>
    </div>
  `).join('');
}

function updateDocksSection(data) {
  if (!data.docks || !data.docks.length) return;
  const container = document.querySelector('.dock-cards');
  if (!container) return;
  container.innerHTML = data.docks.map(d => `
    <div class="dock-card">
      ${d.image ? `<div class="dock-card-img"><img src="${resolveImageUrl(d.image)}" alt="${d.name}"></div>` : ''}
      <div class="dock-card-body">
        ${d.badge ? `<div class="dock-card-badge">${d.badge}</div>` : ''}
        <h3>${d.name}</h3>
        <div class="dock-card-dims">${d.size} • ${d.capacity} capacity</div>
        <p>${d.description}</p>
        ${d.features ? `<ul class="dock-card-features">${d.features.map(f => `<li><span class="check">✓</span> ${f}</li>`).join('')}</ul>` : ''}
        <div class="dock-card-footer">
          <div style="line-height:1.5;">
            <div style="font-size:12px;color:#888;font-weight:500;margin-bottom:2px;">Half Day &nbsp;·&nbsp; Full Day</div>
            <div style="font-size:26px;font-weight:700;color:var(--teal);font-family:'Titillium Web',sans-serif;">
              $${d.halfDay ?? 25} <span style="font-size:16px;color:#aaa;font-weight:400;">/</span> $${d.allDay ?? d.fullDay ?? 50}
            </div>
          </div>
          <button class="btn btn-primary" onclick="openBooking()">Add to Booking</button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateWhatsIncluded(data) {
  if (!data.whats_included || !data.whats_included.length) return;
  const container = document.querySelector('.whats-included-grid');
  if (!container) return;
  container.innerHTML = data.whats_included.map(item => `<div>✅ ${item}</div>`).join('');
}

function updateAddonsSection(data) {
  if (!data.addons || !data.addons.length) return;
  const container = document.querySelector('.addons-grid');
  if (!container) return;
  container.innerHTML = data.addons.map(a => `
    <div class="addon-card">
      <span class="addon-icon">${a.icon || '🎁'}</span>
      <h4>${a.name}</h4>
      <p class="addon-desc">${a.description}</p>
      <div class="addon-price">$${a.price}<span class="addon-unit"> ${a.unit || ''}</span></div>
    </div>
  `).join('');
}

function updateStepsSection(data) {
  if (!data.steps || !data.steps.length) return;
  const container = document.querySelector('.steps-grid');
  if (!container) return;
  container.innerHTML = data.steps.map(s => `
    <div class="step-card">
      ${s.image ? `<div class="step-img"><img src="${s.image}" alt="${s.title}" loading="lazy"></div>` : `<div class="step-num">${s.step ?? s.number}</div>`}
      <h3>${s.title}</h3>
      <p>${s.description}</p>
    </div>
  `).join('');
}

function updateFeaturesSection(data) {
  if (!data.features || !data.features.length) return;
  const container = document.querySelector('.features-grid');
  if (!container) return;
  container.innerHTML = data.features.map(f => `
    <div class="feature-card">
      ${f.image
        ? `<img src="${f.image}" alt="${f.title}" style="width:64px;height:64px;object-fit:cover;border-radius:10px;margin-bottom:10px;">`
        : `<span class="feature-icon">${f.icon || ''}</span>`}
      <h3>${f.title}</h3>
      <p>${f.description}</p>
    </div>
  `).join('');
}

function updateLocationsSection(data) {
  var locs = data.locations;
  if (!locs || !locs.length) return;

  // Populate website locations section
  var container = document.querySelector('.locations-grid');
  if (container) {
    container.innerHTML = locs.map(function(l) {
      var hasImg = l.image && l.image.length > 0;
      return '<div class="location-card" style="' + (hasImg ? 'padding:0;overflow:hidden;' : '') + '">' +
        (hasImg
          ? '<img src="' + l.image + '" alt="' + (l.name || '') + '" style="width:100%;height:200px;object-fit:cover;display:block;" loading="lazy"><div style="padding:20px 24px;">'
          : '<div class="location-pin">📍</div><div>') +
        '<h3>' + l.name + '</h3>' +
        '<p class="location-address">' + (l.address || '') + '</p>' +
        (l.description ? '<p class="location-desc">' + l.description + '</p>' : '') +
        (l.mapUrl ? '<a href="' + l.mapUrl + '" target="_blank" rel="noopener" class="location-map-link">Get Directions →</a>' : '') +
        '</div></div>';
    }).join('');
  }

  // Populate booking modal location selector (Step 1)
  var bookingLocs = document.getElementById('booking-locations');
  if (bookingLocs) {
    bookingLocs.innerHTML = locs.map(function(l, idx) {
      return '<div class="loc-option' + (idx === 0 ? ' selected' : '') + '" data-loc-id="' + l.id + '" data-loc-name="' + l.name + '" onclick="selectLocation(this)">' +
        '<div class="loc-option-icon">📍</div>' +
        '<div class="loc-option-info">' +
          '<strong>' + l.name + '</strong>' +
          (l.address ? '<span>' + l.address + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }
}

var _allGalleryImages = [];
var _gallerySections = [];
var _galleryActiveSection = 'all';
var _galleryModalPage = 0;
var GALLERY_HOME_COUNT = 12;
var GALLERY_MODAL_PER_PAGE = 12;

function updateGallerySection(data) {
  if (!data.gallery || !data.gallery.length) return;
  const container = document.querySelector('.gallery-grid');
  if (!container) return;

  // Store all images and sections globally
  _allGalleryImages = data.gallery.map(function(img) {
    return resolveImageUrl(typeof img === 'string' ? img : img.url);
  });
  _gallerySections = data.gallery_sections || [];

  // Show first 12 on home page with lazy loading
  var first = _allGalleryImages.slice(0, GALLERY_HOME_COUNT);
  container.innerHTML = first.map(function(src, i) {
    return '<div class="gallery-item" onclick="openLightbox(' + i + ')">' +
      '<img src="' + src + '" alt="Gallery ' + (i + 1) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'">' +
      '</div>';
  }).join('');

  // "See All Photos" button if there are more than 12
  var existing = container.parentElement.querySelector('.gallery-see-more');
  if (existing) existing.remove();
  if (_allGalleryImages.length > GALLERY_HOME_COUNT) {
    var btn = document.createElement('div');
    btn.className = 'gallery-see-more';
    btn.innerHTML = '<button class="btn btn-outline" onclick="openGalleryAllModal()">See All Photos (' + _allGalleryImages.length + ')</button>';
    container.parentElement.appendChild(btn);
  }

  // Populate lightbox with first 12
  if (typeof lbImages !== 'undefined') {
    lbImages.length = 0;
    first.forEach(function(src, i) {
      lbImages.push({ src: src, alt: 'Gallery ' + (i + 1) });
    });
  }
}

function openGalleryAllModal() {
  _galleryModalPage = 0;
  _galleryActiveSection = 'all';
  var modal = document.getElementById('galleryAllModal');
  if (!modal) return;
  document.getElementById('galleryAllGrid').innerHTML = '';
  renderGalleryTabs();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  renderGalleryModalPage();
}

function renderGalleryTabs() {
  var tabBar = document.getElementById('galleryTabBar');
  if (!tabBar) return;
  if (!_gallerySections || !_gallerySections.length) {
    tabBar.style.display = 'none';
    return;
  }
  tabBar.style.display = 'flex';
  tabBar.innerHTML = [{ id: 'all', name: 'All Photos' }].concat(_gallerySections).map(function(s) {
    var active = _galleryActiveSection === s.id;
    return '<button onclick="switchGalleryTab(\'' + s.id + '\')" style="padding:8px 16px;border-radius:50px;border:2px solid ' + (active ? 'var(--primary)' : 'var(--border,#e5e7eb)') + ';background:' + (active ? 'var(--primary)' : 'transparent') + ';color:' + (active ? 'white' : 'var(--text)') + ';font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;">' + s.name + '</button>';
  }).join('');
}

function switchGalleryTab(sectionId) {
  _galleryActiveSection = sectionId;
  _galleryModalPage = 0;
  document.getElementById('galleryAllGrid').innerHTML = '';
  renderGalleryTabs();
  renderGalleryModalPage();
}

function getActiveGalleryImages() {
  if (_galleryActiveSection === 'all' || !_gallerySections.length) return _allGalleryImages;
  var section = _gallerySections.find(function(s) { return s.id === _galleryActiveSection; });
  if (!section || !section.images || !section.images.length) return [];
  return section.images.map(function(url) { return resolveImageUrl(url); }).filter(function(url) { return _allGalleryImages.includes(url); });
}

function closeGalleryAllModal() {
  var modal = document.getElementById('galleryAllModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

function renderGalleryModalPage() {
  var grid = document.getElementById('galleryAllGrid');
  var prevBtn = document.getElementById('galleryPrevBtn');
  var nextBtn = document.getElementById('galleryNextBtn');
  var label = document.getElementById('galleryPageLabel');
  var activeImages = getActiveGalleryImages();
  var totalPages = Math.ceil(activeImages.length / GALLERY_MODAL_PER_PAGE);
  var start = _galleryModalPage * GALLERY_MODAL_PER_PAGE;
  var end = Math.min(start + GALLERY_MODAL_PER_PAGE, activeImages.length);
  var pageImages = activeImages.slice(start, end);

  // Replace grid content (not append)
  grid.innerHTML = pageImages.map(function(src, idx) {
    var globalIndex = start + idx;
    return '<div class="gallery-item" onclick="openGalleryAllLightbox(' + globalIndex + ')">' +
      '<img src="' + src + '" alt="Gallery ' + (globalIndex + 1) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'">' +
      '</div>';
  }).join('');

  // Scroll modal back to top on page change
  var content = document.querySelector('.gallery-all-content');
  if (content) content.scrollTop = 0;

  // Update pagination controls
  if (label) label.textContent = totalPages > 1 ? 'Page ' + (_galleryModalPage + 1) + ' of ' + totalPages : '';
  if (prevBtn) prevBtn.style.display = _galleryModalPage > 0 ? 'inline-block' : 'none';
  if (nextBtn) nextBtn.style.display = end < activeImages.length ? 'inline-block' : 'none';
}

function galleryNextPage() {
  _galleryModalPage++;
  renderGalleryModalPage();
}

function galleryPrevPage() {
  if (_galleryModalPage > 0) {
    _galleryModalPage--;
    renderGalleryModalPage();
  }
}

function openGalleryAllLightbox(index) {
  // Swap lightbox to use all images
  if (typeof lbImages !== 'undefined') {
    lbImages.length = 0;
    _allGalleryImages.forEach(function(src, i) {
      lbImages.push({ src: src, alt: 'Gallery ' + (i + 1) });
    });
  }
  closeGalleryAllModal();
  document.body.style.overflow = 'hidden';
  setTimeout(function() { openLightbox(index); }, 50);
}

function updateReviewsSection(data) {
  if (!data.reviews) return;
  const items = Array.isArray(data.reviews) ? data.reviews : data.reviews.items;
  if (!items || !items.length) return;
  const container = document.querySelector('.reviews-track');
  if (!container) return;
  const cardHtml = items.map(r => {
    const ownerReplyHtml = r.owner_reply ? `
      <div class="owner-reply" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1);">
        <div style="font-size: 12px; font-weight: 600; color: #666; margin-bottom: 6px;">Owner's Reply:</div>
        <div style="font-size: 13px; color: #333; font-style: italic;">"${r.owner_reply}"</div>
      </div>
    ` : '';
    return `
      <div class="review-card">
        <div class="review-header">
          <div class="review-avatar">${r.customer_name ? r.customer_name.charAt(0) : (r.initial ?? r.name.charAt(0))}</div>
          <div>
            <div class="review-name">${r.customer_name ?? r.name}</div>
            <div class="review-meta">${r.timeAgo ?? r.date ?? ''}</div>
          </div>
        </div>
        <div class="review-stars">${'★'.repeat(r.stars ?? r.rating ?? 5)}</div>
        <div class="review-text">${r.text}</div>
        ${r.photos && r.photos.length ? `<div class="review-photos">${r.photos.map(p => `<img src="${p}" alt="Customer photo" class="review-photo" loading="lazy">`).join('')}</div>` : ''}
        ${ownerReplyHtml}
        <div class="review-google">
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Posted on Google
        </div>
      </div>
    `;
  }).join('');
  // Duplicate for seamless infinite marquee scroll (CSS translateX -50%)
  container.innerHTML = cardHtml + cardHtml;
}

function updateQnASection(data) {
  if (!data.qna || !data.qna.length) return;
  var container = document.querySelector('.qna-grid');
  if (!container) return;
  container.innerHTML = data.qna.map(function(q, i) {
    return '<div class="qna-item">' +
      '<button class="qna-question" onclick="this.parentElement.classList.toggle(\'open\')">' +
        '<span>' + (q.question || '') + '</span>' +
        '<span class="qna-arrow">▸</span>' +
      '</button>' +
      '<div class="qna-answer"><p>' + (q.answer || '') + '</p></div>' +
    '</div>';
  }).join('');
  // Show the section if it was hidden
  var section = document.getElementById('qna');
  if (section) section.style.display = '';
}

function applyBookingPolicy(data) {
  var policy = (data.booking_settings) || {};
  var mode = policy.paymentMode || 'full';
  window.BOOKING_POLICY = policy;

  var paymentSection = document.getElementById('payment-section');
  if (!paymentSection) return;

  if (mode === 'at_location') {
    // Hide card form — no payment at booking
    paymentSection.innerHTML =
      '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;display:flex;align-items:center;gap:12px;">' +
        '<span style="font-size:22px;">✅</span>' +
        '<div>' +
          '<div style="font-weight:600;font-size:14px;color:#166534;">No payment required to book</div>' +
          '<div style="font-size:13px;color:#166534;margin-top:2px;">You\'ll pay when you arrive at the location.</div>' +
        '</div>' +
      '</div>';
  } else if (mode === 'deposit') {
    var pct = policy.depositPct || 25;
    var label = policy.depositLabel || 'Deposit required to secure your booking';
    // Add a deposit notice above the card form
    var notice = document.createElement('div');
    notice.id = 'deposit-notice';
    notice.style.cssText = 'background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:14px;font-size:13px;color:#92400e;';
    notice.innerHTML = '<strong>💳 ' + pct + '% deposit required</strong> — ' + label;
    paymentSection.insertBefore(notice, paymentSection.firstChild);
  }
  // Update the book button label if override is set
  if (policy.buttonLabel) {
    var btn = document.getElementById('bookNext');
    if (btn && btn.textContent.indexOf('Book') > -1) btn.textContent = policy.buttonLabel;
  }
}

function updateSocialSection(data) {
  if (!data.social) return;
  ['facebook', 'instagram', 'google'].forEach(platform => {
    if (data.social[platform]) {
      document.querySelectorAll(`[data-bind="social.${platform}"]`).forEach(el => {
        el.href = data.social[platform];
        el.style.display = 'inline-block';
      });
    }
  });
}

// Re-apply fade-in IntersectionObserver to dynamically created elements
// The inline script in index.html sets up an observer at parse time, but
// dynamic content from the API doesn't exist yet — so we re-observe here.
function reobserveFadeIns() {
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.product-card, .step-card, .feature-card, .addon-card, .gallery-item, .dock-card, .location-card, .review-card, .qna-item').forEach(function(el) {
    if (el.style.opacity === '0') return; // already observed by the inline script
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    obs.observe(el);
  });
}

// Load on DOM ready
document.addEventListener('DOMContentLoaded', loadWebsiteData);

// Re-check when tab becomes visible (picks up dashboard edits)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    localStorage.removeItem(CACHE_KEY + '_ts'); // force refresh
    loadWebsiteData();
  }
});
