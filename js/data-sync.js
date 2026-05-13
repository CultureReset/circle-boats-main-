// ============================================
// Data Sync — Loads site data from shared JSON
// Used by both website and dashboard
// ============================================

let SITE_DATA = null;

async function loadSiteData(subdomain = 'beachside-circle-boats') {
  try {
    const response = await fetch('../site-data.json');
    if (!response.ok) throw new Error('Failed to load site data');
    SITE_DATA = await response.json();
    console.log('✅ Site data loaded:', SITE_DATA);
    return SITE_DATA;
  } catch (e) {
    console.error('❌ Could not load site data:', e.message);
    return null;
  }
}

// Apply site data to website DOM elements
function applySiteData() {
  if (!SITE_DATA) return;

  // Update business info
  const business = SITE_DATA.business;
  document.querySelectorAll('[data-field="business.name"]').forEach(el => {
    el.textContent = business.name;
  });
  document.querySelectorAll('[data-field="business.phone"]').forEach(el => {
    el.textContent = business.phone;
    el.href = `tel:${business.phone.replace(/\D/g, '')}`;
  });
  document.querySelectorAll('[data-field="business.email"]').forEach(el => {
    el.textContent = business.email;
    el.href = `mailto:${business.email}`;
  });
  document.querySelectorAll('[data-field="business.address"]').forEach(el => {
    el.textContent = business.address;
  });
  document.querySelectorAll('[data-field="business.hours"]').forEach(el => {
    el.textContent = business.hours;
  });
  document.querySelectorAll('[data-field="business.tagline"]').forEach(el => {
    el.textContent = business.tagline;
  });
  document.querySelectorAll('[data-field="business.description"]').forEach(el => {
    el.textContent = business.description;
  });

  // Update products
  if (SITE_DATA.products && SITE_DATA.products.length > 0) {
    const productsContainer = document.querySelector('[data-section="products"]');
    if (productsContainer) {
      productsContainer.innerHTML = SITE_DATA.products.map(product => `
        <div class="product-card ${product.featured ? 'featured' : ''}">
          <div class="product-body">
            <h3>${product.name}</h3>
            <p class="desc">${product.description}</p>
            <div class="price-row">
              <span class="price-label">Half Day</span>
              <span class="price-amount">$${product.halfDay}</span>
            </div>
            <div class="price-row">
              <span class="price-label">All Day</span>
              <span class="price-amount">$${product.allDay}</span>
            </div>
            ${product.specs ? `<div class="product-specs">${product.specs}</div>` : ''}
            <button class="btn btn-primary" onclick="openBooking()">Reserve</button>
          </div>
        </div>
      `).join('');
    }
  }

  // Update addons
  if (SITE_DATA.addons && SITE_DATA.addons.length > 0) {
    const addonsContainer = document.querySelector('[data-section="addons"]');
    if (addonsContainer) {
      addonsContainer.innerHTML = SITE_DATA.addons.map(addon => `
        <div class="addon-card">
          <span class="addon-icon">${addon.icon || '🎁'}</span>
          <h4>${addon.name}</h4>
          <p class="addon-desc">${addon.description}</p>
          <div class="addon-price">$${addon.price}</div>
        </div>
      `).join('');
    }
  }

  // Update docks
  if (SITE_DATA.docks && SITE_DATA.docks.length > 0) {
    const docksContainer = document.querySelector('[data-section="docks"]');
    if (docksContainer) {
      docksContainer.innerHTML = SITE_DATA.docks.map(dock => `
        <div class="dock-card">
          <div class="dock-card-body">
            <h3>${dock.name}</h3>
            ${dock.badge ? `<div class="dock-card-badge">${dock.badge}</div>` : ''}
            <div class="dock-card-dims">${dock.size} • ${dock.capacity} capacity</div>
            <p>${dock.description}</p>
            <div class="dock-card-footer">
              <div class="dock-card-price">$${dock.price} <span>/ day</span></div>
              <button class="btn btn-primary" onclick="openBooking()">Add to Booking</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // Update features
  if (SITE_DATA.features && SITE_DATA.features.length > 0) {
    const featuresContainer = document.querySelector('[data-section="features"]');
    if (featuresContainer) {
      featuresContainer.innerHTML = SITE_DATA.features.map(feature => `
        <div class="feature-card">
          <span class="feature-icon">${feature.icon}</span>
          <h3>${feature.title}</h3>
          <p>${feature.description}</p>
        </div>
      `).join('');
    }
  }

  // Update gallery
  if (SITE_DATA.gallery && SITE_DATA.gallery.length > 0) {
    const galleryContainer = document.querySelector('[data-section="gallery"]');
    if (galleryContainer) {
      galleryContainer.innerHTML = SITE_DATA.gallery.map((img, i) => `
        <div class="gallery-item" onclick="openLightbox(${i})">
          <img src="${img}" alt="Gallery image ${i + 1}">
        </div>
      `).join('');
    }
  }
}

// Initialize data sync
async function initDataSync() {
  await loadSiteData();
  applySiteData();
}

// Listen for changes (WebSocket or polling)
function watchForChanges() {
  // Check every 5 seconds if data has been updated
  setInterval(async () => {
    const newData = await loadSiteData();
    if (newData && JSON.stringify(newData) !== JSON.stringify(SITE_DATA)) {
      console.log('📡 Data changed, refreshing page...');
      location.reload();
    }
  }, 5000);
}
