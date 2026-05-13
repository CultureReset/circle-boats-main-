// ============================================
// Enhanced Visual Page Builder — Full CMS
// Edit everything on the website with live preview
// ============================================

let siteData = {
  business: {
    name: 'Beachside Circle Boat Rentals and Sales LLC',
    phone: '(601) 325-1205',
    email: 'beachsideboats@myyahoo.com',
    address: '25856 Canal Road Unit A, Orange Beach, AL 36561',
    hours: 'Mon–Sat 9AM–6PM, Sun 9AM–6PM',
    tagline: 'Your Day on the Water Just Got an Upgrade',
    description: 'Experience Orange Beach like never before! Portable inflatable circle boats for solo cruisers and adventurers. No license needed. Eco-friendly electric boats.'
  },
  hero: {
    location: 'Orange Beach, Alabama',
    title: 'The Easiest Way to Get on the Water',
    subtitle: 'Rent a portable, eco-friendly circle boat. No license needed, no experience required. Just show up and cruise.'
  },
  products: [
    {
      "id": "single",
      "name": "Single Seater",
      "description": "Solo cruiser. 57 lbs, portable, 35lb electric motor. Fits one adult up to 300 lbs.",
      "halfDay": 150,
      "allDay": 225,
      "specs": "70\" diameter • Max 300 lbs • 5-speed motor",
      "featured": false
    },
    {
      "id": "double",
      "name": "Double Seater",
      "description": "Bring a friend. 65 lbs, extra-wide seats, enhanced stability. Fits two adults up to 450 lbs combined.",
      "halfDay": 200,
      "allDay": 275,
      "specs": "89\" x 70\" • Max 450 lbs • 5-speed motor",
      "featured": true
    }
  ],
  addons: [
    {"id": "cooler", "name": "Cooler Pack", "description": "Loaded cooler with ice, water, and your choice of drinks.", "price": 35, "icon": "🍦", "image": ""},
    {"id": "drinks", "name": "Drink & Ice", "description": "Water, Gatorade, sodas, juice. Bag of ice included.", "price": 15, "icon": "🥤", "image": ""},
    {"id": "snack", "name": "Snack Pack", "description": "Chips, trail mix, granola bars, fruit snacks.", "price": 20, "icon": "🍿", "image": ""},
    {"id": "pup", "name": "Pup Pack", "description": "Dog treats, water bowl, and a doggie life vest.", "price": 15, "icon": "🐶", "image": ""},
    {"id": "speaker", "name": "Bluetooth Speaker", "description": "Waterproof JBL speaker to set the vibe.", "price": 15, "icon": "🎵", "image": ""},
    {"id": "gopro", "name": "GoPro Rental", "description": "GoPro Hero with waterproof mount.", "price": 30, "icon": "📷", "image": ""},
    {"id": "fishing", "name": "Fishing Gear", "description": "Rod, reel, tackle, and bait. Everything included.", "price": 25, "icon": "🎣", "image": ""},
    {"id": "sun", "name": "Sun & Safety Kit", "description": "Reef-safe sunscreen, hat, dry bag, first aid.", "price": 10, "icon": "☀️", "image": ""}
  ],
  docks: [
    {"id": "mini", "name": "Mini Dock", "description": "The full-size floating platform. Tow it behind your GoBoat for extra room to sunbathe, do yoga, spread out a picnic, or store all your beach gear. Plenty of space for two adults to lounge comfortably.", "price": 50, "size": "8'4\" x 44\"", "capacity": "100 lb", "badge": "Most Popular"},
    {"id": "xdock", "name": "X Dock", "description": "The compact square dock built for utility. Designed to hold a full-size cooler (up to 58 quarts), tackle boxes, or a portable grill. Frees up all the legroom in your GoBoat so passengers ride in comfort.", "price": 50, "size": "5' x 5'", "capacity": "75 lb", "badge": ""},
    {"id": "doggie", "name": "Doggie Dock", "description": "Built for your four-legged crew. Features a weighted mesh ramp so dogs can climb in and out of the water on their own. Non-slip surface keeps paws steady, and the dock stays flat even with a jumping pup.", "price": 50, "size": "5'4\" x 43\"", "capacity": "85 lb", "badge": "Pet Friendly"}
  ],
  features: [
    {"title": "Electric & Eco-Friendly", "icon": "⚡", "description": "35lb thrust electric motors. Zero emissions, zero noise pollution."},
    {"title": "Stable & Safe", "icon": "💪", "description": "Low center of gravity, incredibly stable. Life jackets included."},
    {"title": "Portable", "icon": "🎒", "description": "Inflatable design. We can bring boats to your event or private dock."},
    {"title": "No License Needed", "icon": "✅", "description": "Anyone can drive. No boating license required. We teach you in 5 min."},
    {"title": "Gulf Coast Views", "icon": "🌊", "description": "Explore Orange Beach coastline and intercoastal waterways."},
    {"title": "Perfect for Events", "icon": "🎉", "description": "Birthdays, date nights, bachelor parties, team outings."}
  ],
  gallery: [],
  social: { facebook: '', instagram: '', google: '' }
};

let editingItem = null;
let editingType = null;

// Initialize page builder
async function initEnhancedPageBuilder() {
  await loadSiteData();
  renderSidebar();
  renderPreview();
}

const PB_BASE = 'https://cybercheck-api-database.vercel.app';

function pbToUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return PB_BASE + url;
  return PB_BASE + '/beachside-site/' + url;
}

async function loadSiteData() {
  try {
    const res = await fetch(PB_BASE + '/api/site-data');
    if (!res.ok) throw new Error('site-data returned ' + res.status);
    const d = await res.json();

    if (d.business)       siteData.business = d.business;
    if (d.hero)           siteData.hero = d.hero;
    if (d.products)       siteData.products = d.products;
    if (d.addons)         siteData.addons = d.addons;
    if (d.docks)          siteData.docks = d.docks;
    if (d.features)       siteData.features = d.features;
    if (d.reviews)        siteData.reviews = d.reviews;

    // Gallery: site-data stores plain URL strings, convert to {src, alt} for page builder
    if (d.gallery && d.gallery.length > 0) {
      siteData.gallery = d.gallery.map(function(img) {
        if (typeof img === 'string') return { src: img, alt: '' };
        return img;
      });
    }

    console.log('✅ Site data loaded:', Object.keys(d).join(', '));
  } catch(e) {
    console.warn('⚠️ Could not load site data:', e.message);
  }
}

// Render left sidebar with editable sections
function renderSidebar() {
  const sidebar = document.getElementById('cms-sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <!-- Hero Section -->
    <div class="cms-section">
      <h4 onclick="toggleSection('hero')" style="cursor:pointer;color:var(--text);margin-bottom:8px;">🎬 Hero Section</h4>
      <div id="section-hero" style="display:block;padding-left:8px;border-left:2px solid var(--primary);">
        <div class="cms-item" onclick="editItem('hero', 'location')">
          <span>📍 Location</span>
          <span style="color:var(--text-muted);font-size:12px;">${siteData.hero?.location || 'Edit location'}</span>
        </div>
        <div class="cms-item" onclick="editItem('hero', 'title')">
          <span>✨ Title</span>
          <span style="color:var(--text-muted);font-size:12px;">Edit title</span>
        </div>
        <div class="cms-item" onclick="editItem('hero', 'subtitle')">
          <span>📝 Subtitle</span>
          <span style="color:var(--text-muted);font-size:12px;">Edit subtitle</span>
        </div>
      </div>
    </div>

    <!-- Page Sections -->
    <div class="cms-section">
      <h4 onclick="toggleSection('pages')" style="cursor:pointer;color:var(--text);margin-bottom:8px;">📄 Page Sections</h4>
      <div id="section-pages" style="display:block;padding-left:8px;border-left:2px solid var(--primary);">
        ${Object.keys(siteData.pages || {}).map(key => `
          <div class="cms-item" onclick="editPageSection('${key}')">
            <span>${key.charAt(0).toUpperCase() + key.slice(1)}</span>
            <span style="color:var(--text-muted);font-size:12px;">Edit section</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Business Info -->
    <div class="cms-section">
      <h4 onclick="toggleSection('business')" style="cursor:pointer;color:var(--text);margin-bottom:8px;">💼 Business Info</h4>
      <div id="section-business" style="display:block;padding-left:8px;border-left:2px solid var(--primary);">
        <div class="cms-item" onclick="editBusinessField('name')">
          <span>📝 Name</span>
          <span style="color:var(--text-muted);font-size:12px;">${siteData.business.name}</span>
        </div>
        <div class="cms-item" onclick="editBusinessField('tagline')">
          <span>✨ Tagline</span>
          <span style="color:var(--text-muted);font-size:12px;">${siteData.business.tagline}</span>
        </div>
        <div class="cms-item" onclick="editBusinessField('description')">
          <span>📄 Description</span>
          <span style="color:var(--text-muted);font-size:12px;">Edit description</span>
        </div>
        <div class="cms-item" onclick="editBusinessField('phone')">
          <span>📞 Phone</span>
          <span style="color:var(--text-muted);font-size:12px;">${siteData.business.phone}</span>
        </div>
        <div class="cms-item" onclick="editBusinessField('email')">
          <span>📧 Email</span>
          <span style="color:var(--text-muted);font-size:12px;">${siteData.business.email}</span>
        </div>
        <div class="cms-item" onclick="editBusinessField('address')">
          <span>📍 Address</span>
          <span style="color:var(--text-muted);font-size:12px;">Edit address</span>
        </div>
        <div class="cms-item" onclick="editBusinessField('hours')">
          <span>🕐 Hours</span>
          <span style="color:var(--text-muted);font-size:12px;">Edit hours</span>
        </div>
      </div>
    </div>

    <!-- Products/Fleet -->
    <div class="cms-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h4 onclick="toggleSection('products')" style="cursor:pointer;color:var(--text);margin:0;">🛥️ Boats & Rentals</h4>
        <button class="btn btn-sm" onclick="addNewItem('products')" style="padding:4px 8px;font-size:11px;">+ Add</button>
      </div>
      <div id="section-products" style="display:block;padding-left:8px;border-left:2px solid var(--primary);">
        ${siteData.products.map((p, i) => `
          <div class="cms-item" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            ${p.image ? `<img src="${p.image}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;flex-shrink:0;cursor:pointer;" onclick="editItem('products', ${i})" title="Click to change image"/>` : `<div style="width:40px;height:40px;background:var(--card-border);border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;flex-shrink:0;">📷</div>`}
            <span onclick="editItem('products', ${i})" style="cursor:pointer;flex:1;min-width:0;">
              <span>${p.name || 'Boat'}</span>
              <span style="color:var(--text-muted);font-size:11px;">$${p.halfDay || 0}/day</span>
            </span>
            <button class="btn btn-sm btn-danger" onclick="deleteItem('products', ${i})" style="padding:2px 6px;font-size:10px;flex-shrink:0;">×</button>
          </div>
        `).join('')}
        ${siteData.products.length === 0 ? '<p style="color:var(--text-muted);font-size:12px;">No products yet</p>' : ''}
      </div>
    </div>

    <!-- Addons -->
    <div class="cms-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h4 onclick="toggleSection('addons')" style="cursor:pointer;color:var(--text);margin:0;">🎒 Add-ons</h4>
        <button class="btn btn-sm" onclick="addNewItem('addons')" style="padding:4px 8px;font-size:11px;">+ Add</button>
      </div>
      <div id="section-addons" style="display:block;padding-left:8px;border-left:2px solid var(--primary);">
        ${siteData.addons.map((a, i) => `
          <div class="cms-item" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            ${a.image ? `<img src="${a.image}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;flex-shrink:0;cursor:pointer;" onclick="editItem('addons', ${i})" title="Click to change image"/>` : `<div style="width:40px;height:40px;background:var(--card-border);border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:20px;flex-shrink:0;">${a.icon || '🎁'}</div>`}
            <span onclick="editItem('addons', ${i})" style="cursor:pointer;flex:1;min-width:0;">
              <span>${a.name || 'Add-on'}</span>
              <span style="color:var(--text-muted);font-size:11px;">$${a.price || 0}</span>
            </span>
            <button class="btn btn-sm btn-danger" onclick="deleteItem('addons', ${i})" style="padding:2px 6px;font-size:10px;flex-shrink:0;">×</button>
          </div>
        `).join('')}
        ${siteData.addons.length === 0 ? '<p style="color:var(--text-muted);font-size:12px;">No add-ons yet</p>' : ''}
      </div>
    </div>

    <!-- Docks -->
    <div class="cms-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h4 onclick="toggleSection('docks')" style="cursor:pointer;color:var(--text);margin:0;">🚪 Docks</h4>
        <button class="btn btn-sm" onclick="addNewItem('docks')" style="padding:4px 8px;font-size:11px;">+ Add</button>
      </div>
      <div id="section-docks" style="display:block;padding-left:8px;border-left:2px solid var(--primary);">
        ${siteData.docks.map((d, i) => `
          <div class="cms-item" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <span style="font-size:20px;flex-shrink:0;">🚪</span>
            <span onclick="editItem('docks', ${i})" style="cursor:pointer;flex:1;min-width:0;">
              <span>${d.name || 'Dock'}</span>
              <span style="color:var(--text-muted);font-size:11px;">$${d.price || 0} • ${d.size || '?'}</span>
            </span>
            <button class="btn btn-sm btn-danger" onclick="deleteItem('docks', ${i})" style="padding:2px 6px;font-size:10px;flex-shrink:0;">×</button>
          </div>
        `).join('')}
        ${siteData.docks.length === 0 ? '<p style="color:var(--text-muted);font-size:12px;">No docks yet</p>' : ''}
      </div>
    </div>

    <!-- Features -->
    <div class="cms-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h4 onclick="toggleSection('features')" style="cursor:pointer;color:var(--text);margin:0;">✨ Features</h4>
        <button class="btn btn-sm" onclick="addNewItem('features')" style="padding:4px 8px;font-size:11px;">+ Add</button>
      </div>
      <div id="section-features" style="display:block;padding-left:8px;border-left:2px solid var(--primary);">
        ${siteData.features.map((f, i) => `
          <div class="cms-item" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <span style="font-size:20px;flex-shrink:0;">${f.icon || '✨'}</span>
            <span onclick="editItem('features', ${i})" style="cursor:pointer;flex:1;min-width:0;">
              <span>${f.title || 'Feature'}</span>
            </span>
            <button class="btn btn-sm btn-danger" onclick="deleteItem('features', ${i})" style="padding:2px 6px;font-size:10px;flex-shrink:0;">×</button>
          </div>
        `).join('')}
        ${siteData.features.length === 0 ? '<p style="color:var(--text-muted);font-size:12px;">No features yet</p>' : ''}
      </div>
    </div>

    <!-- Gallery -->
    <div class="cms-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h4 onclick="toggleSection('gallery')" style="cursor:pointer;color:var(--text);margin:0;">🖼️ Gallery</h4>
        <button class="btn btn-sm" onclick="addNewItem('gallery')" style="padding:4px 8px;font-size:11px;">+ Add</button>
      </div>
      <div id="section-gallery" style="display:block;padding-left:8px;border-left:2px solid var(--primary);">
        ${siteData.gallery.map((g, i) => `
          <div class="cms-item" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            ${g.src ? `<img src="${g.src}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;flex-shrink:0;cursor:pointer;" onclick="editItem('gallery', ${i})" title="Click to change image"/>` : `<div style="width:40px;height:40px;background:var(--card-border);border-radius:4px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;flex-shrink:0;">📷</div>`}
            <span onclick="editItem('gallery', ${i})" style="cursor:pointer;flex:1;min-width:0;">
              <span>Image ${i + 1}</span>
              <span style="color:var(--text-muted);font-size:11px;">${g.alt || 'No caption'}</span>
            </span>
            <button class="btn btn-sm btn-danger" onclick="deleteItem('gallery', ${i})" style="padding:2px 6px;font-size:10px;flex-shrink:0;">×</button>
          </div>
        `).join('')}
        ${siteData.gallery.length === 0 ? '<p style="color:var(--text-muted);font-size:12px;">No gallery images yet</p>' : ''}
      </div>
    </div>

    <!-- Reviews -->
    <div class="cms-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <h4 onclick="toggleSection('reviews')" style="cursor:pointer;color:var(--text);margin:0;">⭐ Reviews</h4>
        <button class="btn btn-sm" onclick="addNewItem('reviews')" style="padding:4px 8px;font-size:11px;">+ Add</button>
      </div>
      <div id="section-reviews" style="display:block;padding-left:8px;border-left:2px solid var(--primary);">
        ${siteData.reviews?.map((r, i) => `
          <div class="cms-item" onclick="editItem('reviews', ${i})" style="cursor:pointer;">
            <span>${'⭐'.repeat(r.rating)} ${r.name}</span>
            <span style="color:var(--text-muted);font-size:11px;">${r.text.substring(0, 40)}...</span>
          </div>
        `).join('') || '<p style="color:var(--text-muted);font-size:12px;">No reviews yet</p>'}
      </div>
    </div>

    <!-- Social Links -->
    <div class="cms-section">
      <h4 onclick="toggleSection('social')" style="cursor:pointer;color:var(--text);margin-bottom:8px;">🌐 Social Links</h4>
      <div id="section-social" style="display:block;padding-left:8px;border-left:2px solid var(--primary);">
        <div class="cms-item" onclick="editSocialField('facebook')">
          <span>f Facebook</span>
          <span style="color:var(--text-muted);font-size:12px;">${siteData.social?.facebook || 'Add link'}</span>
        </div>
        <div class="cms-item" onclick="editSocialField('instagram')">
          <span>📷 Instagram</span>
          <span style="color:var(--text-muted);font-size:12px;">${siteData.social?.instagram || 'Add link'}</span>
        </div>
        <div class="cms-item" onclick="editSocialField('google')">
          <span>🔍 Google</span>
          <span style="color:var(--text-muted);font-size:12px;">${siteData.social?.google || 'Add link'}</span>
        </div>
      </div>
    </div>
  `;
}

// Toggle section visibility
function toggleSection(section) {
  const el = document.getElementById(`section-${section}`);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// Edit business field
function editBusinessField(field) {
  editingType = 'business';
  editingItem = field;
  renderEditor();
}

// Edit social field
function editSocialField(field) {
  editingType = 'social';
  editingItem = field;
  renderEditor();
}

// Edit page section
function editPageSection(section) {
  editingType = 'pages';
  editingItem = section;
  renderEditor();
}

// Edit list item
function editItem(type, index) {
  editingType = type;
  editingItem = index;
  renderEditor();
}

// Add new item
function addNewItem(type) {
  editingType = type;

  const templates = {
    products: { id: `prod_${Date.now()}`, name: 'New Boat', halfDay: 100, allDay: 150, description: '', image: '', featured: false },
    addons: { id: `addon_${Date.now()}`, name: 'New Add-on', price: 15, description: '', icon: '🎁', image: '' },
    docks: { id: `dock_${Date.now()}`, name: 'New Dock', price: 50, size: '', capacity: '', badge: '' },
    features: { id: `feat_${Date.now()}`, title: 'New Feature', icon: '✨', description: '' },
    gallery: { id: `img_${Date.now()}`, src: '', alt: 'New image', caption: '' }
  };

  siteData[type].push(templates[type]);
  editingItem = siteData[type].length - 1;
  renderEditor();
}

// Delete item
function deleteItem(type, index) {
  if (confirm(`Delete this ${type.slice(0, -1)}?`)) {
    siteData[type].splice(index, 1);
    saveSiteData();
    renderSidebar();
    updatePreview();
  }
}

// Render editor form
function renderEditor() {
  const editor = document.getElementById('cms-editor');
  if (!editor) return;

  let fields = [];
  let title = '';

  if (editingType === 'business') {
    title = `💼 ${editingItem.charAt(0).toUpperCase() + editingItem.slice(1)}`;
    const field = editingItem;
    const value = siteData.business[field];

    const fieldType = field === 'description' || field === 'hours' ? 'textarea' : 'text';
    fields = [{
      name: field,
      label: field.charAt(0).toUpperCase() + field.slice(1),
      type: fieldType,
      value: value
    }];
  } else if (editingType === 'hero') {
    title = `🎬 ${editingItem.charAt(0).toUpperCase() + editingItem.slice(1)}`;
    const field = editingItem;
    const value = siteData.hero[field];

    const fieldType = field === 'subtitle' ? 'textarea' : 'text';
    fields = [{
      name: field,
      label: field.charAt(0).toUpperCase() + field.slice(1),
      type: fieldType,
      value: value
    }];
  } else if (editingType === 'social') {
    title = `🌐 ${editingItem.charAt(0).toUpperCase() + editingItem.slice(1)}`;
    const field = editingItem;
    const value = siteData.social[field];

    fields = [{
      name: field,
      label: field.charAt(0).toUpperCase() + field.slice(1),
      type: 'text',
      value: value
    }];
  } else if (editingType === 'pages') {
    const section = editingItem;
    const page = siteData.pages[section];
    title = `📄 ${section.charAt(0).toUpperCase() + section.slice(1)} Section`;

    fields = [
      { name: 'title', label: 'Section Title', type: 'text', value: page?.title || '' },
      { name: 'subtitle', label: 'Section Subtitle', type: 'textarea', value: page?.subtitle || '' }
    ];
  } else {
    const item = siteData[editingType][editingItem];
    title = `Edit ${editingType.slice(0, -1)}: ${item.name || 'New item'}`;

    const fieldMaps = {
      products: [
        { name: 'name', label: 'Boat Name', type: 'text', value: item.name },
        { name: 'halfDay', label: 'Half-Day Price ($)', type: 'number', value: item.halfDay },
        { name: 'allDay', label: 'All-Day Price ($)', type: 'number', value: item.allDay },
        { name: 'description', label: 'Description', type: 'textarea', value: item.description },
        { name: 'image', label: 'Upload Boat Image', type: 'file', accept: 'image/*' }
      ],
      addons: [
        { name: 'name', label: 'Name', type: 'text', value: item.name },
        { name: 'price', label: 'Price ($)', type: 'number', value: item.price },
        { name: 'description', label: 'Description', type: 'textarea', value: item.description },
        { name: 'image', label: 'Upload Add-on Image', type: 'file', accept: 'image/*' }
      ],
      docks: [
        { name: 'name', label: 'Name', type: 'text', value: item.name },
        { name: 'price', label: 'Price ($)', type: 'number', value: item.price },
        { name: 'size', label: 'Size', type: 'text', value: item.size },
        { name: 'capacity', label: 'Capacity', type: 'text', value: item.capacity }
      ],
      features: [
        { name: 'title', label: 'Title', type: 'text', value: item.title },
        { name: 'icon', label: 'Icon (emoji)', type: 'text', value: item.icon },
        { name: 'description', label: 'Description', type: 'textarea', value: item.description }
      ],
      gallery: [
        { name: 'src', label: 'Image URL (or upload below)', type: 'text', value: item.src },
        { name: 'upload', label: 'Or upload image', type: 'file', accept: 'image/*' },
        { name: 'alt', label: 'Alt Text', type: 'text', value: item.alt },
        { name: 'caption', label: 'Caption', type: 'textarea', value: item.caption }
      ]
    };

    fields = fieldMaps[editingType] || [];
  }

  editor.innerHTML = `
    <div style="margin-bottom:20px;">
      <h3 style="color:var(--text);margin-bottom:16px;">${title}</h3>
      ${(editingType === 'products' || editingType === 'addons') && siteData[editingType][editingItem]?.image ? `
        <div style="margin-bottom:16px;padding:12px;background:var(--card-border);border-radius:var(--radius);">
          <p style="color:var(--text-muted);font-size:12px;margin:0 0 8px 0;">📸 Current Image:</p>
          <img src="${siteData[editingType][editingItem].image}" style="width:100%;max-height:200px;border-radius:4px;object-fit:cover;"/>
        </div>
      ` : editingType === 'gallery' && siteData[editingType][editingItem]?.src ? `
        <div style="margin-bottom:16px;padding:12px;background:var(--card-border);border-radius:var(--radius);">
          <p style="color:var(--text-muted);font-size:12px;margin:0 0 8px 0;">📸 Current Image:</p>
          <img src="${siteData[editingType][editingItem].src}" style="width:100%;max-height:200px;border-radius:4px;object-fit:cover;"/>
        </div>
      ` : ''}
      <div id="editor-fields"></div>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" onclick="saveSiteData()">💾 Save</button>
        <button class="btn btn-outline" onclick="cancelEdit()">Cancel</button>
      </div>
    </div>
  `;

  const fieldsContainer = document.getElementById('editor-fields');
  fields.forEach(field => {
    const fieldId = `editor-${field.name}`;
    let fieldHtml = '';

    if (field.type === 'file') {
      fieldHtml = `
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:4px;color:var(--text);font-size:13px;font-weight:500;">${field.label}</label>
          <input type="file" id="${fieldId}" accept="${field.accept || '*'}" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);cursor:pointer;"/>
          <div id="${fieldId}-progress" style="margin-top:8px;display:none;color:var(--text-muted);font-size:12px;"></div>
        </div>
      `;
    } else if (field.type === 'textarea') {
      fieldHtml = `
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:4px;color:var(--text);font-size:13px;font-weight:500;">${field.label}</label>
          <textarea id="${fieldId}" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);min-height:80px;resize:vertical;">${field.value}</textarea>
        </div>
      `;
    } else if (field.type === 'number') {
      fieldHtml = `
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:4px;color:var(--text);font-size:13px;font-weight:500;">${field.label}</label>
          <input type="number" id="${fieldId}" value="${field.value}" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);"/>
        </div>
      `;
    } else {
      fieldHtml = `
        <div style="margin-bottom:12px;">
          <label style="display:block;margin-bottom:4px;color:var(--text);font-size:13px;font-weight:500;">${field.label}</label>
          <input type="text" id="${fieldId}" value="${field.value || ''}" style="width:100%;padding:8px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);"/>
        </div>
      `;
    }

    fieldsContainer.innerHTML += fieldHtml;
  });
}

// Save site data to API
async function saveSiteData() {
  try {
    showToast('💾 Saving...', 'info');

    // Get current values from form
    if (editingType === 'business') {
      const fieldId = `editor-${editingItem}`;
      const el = document.getElementById(fieldId);
      if (el) siteData.business[editingItem] = el.value;
    } else if (editingType === 'hero') {
      const fieldId = `editor-${editingItem}`;
      const el = document.getElementById(fieldId);
      if (el) siteData.hero[editingItem] = el.value;
    } else if (editingType === 'social') {
      const fieldId = `editor-${editingItem}`;
      const el = document.getElementById(fieldId);
      if (el) siteData.social[editingItem] = el.value;
    } else if (editingType === 'pages') {
      const section = editingItem;
      const titleEl = document.getElementById('editor-title');
      const subtitleEl = document.getElementById('editor-subtitle');
      if (titleEl) siteData.pages[section].title = titleEl.value;
      if (subtitleEl) siteData.pages[section].subtitle = subtitleEl.value;
    } else {
      const item = siteData[editingType][editingItem];
      const fieldMap = {
        products: ['name', 'halfDay', 'allDay', 'description'],
        addons: ['name', 'price', 'description'],
        docks: ['name', 'price', 'size', 'capacity'],
        features: ['title', 'icon', 'description'],
        gallery: ['src', 'alt', 'caption']
      };

      (fieldMap[editingType] || []).forEach(field => {
        const el = document.getElementById(`editor-${field}`);
        if (el) item[field] = el.type === 'number' ? parseFloat(el.value) : el.value;
      });

      // Handle file uploads (gallery images, product images, or addon images)
      const uploadField = editingType === 'gallery' ? 'editor-upload' : 'editor-image';
      const uploadInput = document.getElementById(uploadField);
      if (uploadInput && uploadInput.files && uploadInput.files[0]) {
        const file = uploadInput.files[0];
        const context = editingType === 'gallery' ? 'gallery' : (editingType === 'products' ? 'boat' : 'addon');
        const formData = new FormData();
        formData.append('image', file);

        const uploadRes = await fetch(PB_BASE + '/api/upload-image?context=' + context, {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) throw new Error('Upload failed');
        const uploadData = await uploadRes.json();

        if (editingType === 'gallery') {
          item.src = uploadData.url;
        } else {
          item.image = uploadData.url;
        }
        showToast('📸 Image uploaded!', 'success');
      }
    }

    // Save full site-data to /api/site-data
    // Convert gallery back to plain URL strings for storage
    const savePayload = Object.assign({}, siteData);
    if (savePayload.gallery) {
      savePayload.gallery = savePayload.gallery.map(function(g) {
        return typeof g === 'string' ? g : (g.src || '');
      }).filter(Boolean);
    }

    const saveRes = await fetch(PB_BASE + '/api/site-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savePayload)
    });

    if (!saveRes.ok) throw new Error('Save failed');

    showToast('✅ Saved!', 'success');
    editingItem = null;
    editingType = null;
    renderSidebar();
    updatePreview();
  } catch(e) {
    showToast('❌ ' + e.message, 'error');
  }
}

// Cancel editing
function cancelEdit() {
  editingItem = null;
  editingType = null;
  const editor = document.getElementById('cms-editor');
  if (editor) editor.innerHTML = '<p style="color:var(--text-muted);">Select an item to edit</p>';
}

// Render live preview
function renderPreview() {
  const preview = document.getElementById('cms-preview');
  if (!preview) {
    console.warn('❌ Preview container not found');
    return;
  }

  preview.innerHTML = `<iframe id="cms-preview-iframe" style="width:100%;height:100%;border:none;border-radius:var(--radius);display:block;margin:0;padding:0;" src="https://beachsidecircleboats.com"></iframe>`;
  console.log('✅ Preview iframe created');
}

// Update preview (reload iframe)
function updatePreview() {
  const iframe = document.getElementById('cms-preview-iframe');
  if (iframe) {
    // Reload by changing src to avoid CORS issues
    const timestamp = new Date().getTime();
    iframe.src = `https://beachsidecircleboats.com?t=${timestamp}`;
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#22c55e' : '#ef4444'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10000;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Add CSS for CMS sections
const style = document.createElement('style');
style.textContent = `
  .cms-section {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--card-border);
  }

  .cms-section h4 {
    color: var(--text);
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
  }

  .cms-item {
    padding: 8px;
    border-radius: 6px;
    background: var(--bg);
    margin-bottom: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 13px;
  }

  .cms-item:hover {
    background: rgba(0, 173, 168, 0.1);
  }

  .cms-item span {
    display: block;
  }

  .cms-item span:first-child {
    font-weight: 500;
    color: var(--text);
  }
`;
document.head.appendChild(style);

// Initialize on page load
onPageLoad('site-editor', initEnhancedPageBuilder);
