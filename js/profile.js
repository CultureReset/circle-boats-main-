// ============================================
// Profile — Beachside Circle Boats
// ============================================

var _profileData = {
  name: 'Beachside Circle Boat Rentals and Sales LLC',
  phone: '(601) 325-1205',
  email: 'beachsideboats@myyahoo.com',
  website: '',
  description: 'Rent a portable, eco-friendly circle boat. No license needed, no experience required. Just show up and cruise.',
  logo: '',
  address: '25856 Canal Road, Unit A',
  city: 'Orange Beach',
  state: 'AL',
  zip: '36561',
  socials: {
    facebook: '',
    instagram: '',
    tiktok: '',
    yelp: '',
    google: '',
    twitter: ''
  },
  hours: {
    monday:    { open: '08:00', close: '18:00', closed: false },
    tuesday:   { open: '08:00', close: '18:00', closed: false },
    wednesday: { open: '08:00', close: '18:00', closed: false },
    thursday:  { open: '08:00', close: '18:00', closed: false },
    friday:    { open: '08:00', close: '18:00', closed: false },
    saturday:  { open: '08:00', close: '18:00', closed: false },
    sunday:    { open: '09:00', close: '17:00', closed: false }
  }
};

async function loadProfile() {
  try {
  // Try local API
  try {
    const localRes = await fetch('/api/site-data');
    if (localRes.ok) {
      const localData = await localRes.json();
      if (localData.business) {
        _profileData.name = localData.business.name || _profileData.name;
        _profileData.phone = localData.business.phone || _profileData.phone;
        _profileData.email = localData.business.email || _profileData.email;
        _profileData.address = localData.business.address || _profileData.address;
        _profileData.description = localData.business.description || _profileData.description;
        _profileData.tagline = localData.business.tagline || _profileData.tagline;
        if (typeof localData.business.hours === 'object') _profileData.hours = localData.business.hours;
      }
      if (localData.social) {
        _profileData.socials = Object.assign({}, _profileData.socials, {
          facebook: localData.social.facebook || '',
          instagram: localData.social.instagram || '',
          google: localData.social.google || ''
        });
      }
      console.log('✅ Loaded from local API');
    }
  } catch (e) {
    console.log('Local API unavailable:', e.message);
  }

  // Also try Supabase via CC — returns { business, content }
  try {
    var apiData = await CC.dashboard.getProfile();
    if (apiData) {
      var biz = apiData.business || {};
      var content = apiData.content || {};
      if (biz.name) _profileData.name = biz.name;
      if (biz.logo_url) _profileData.logo = biz.logo_url;
      if (content.contact_phone) _profileData.phone = content.contact_phone;
      if (content.contact_email) _profileData.email = content.contact_email;
      if (content.website_url) _profileData.website = content.website_url;
      if (content.about_text) _profileData.description = content.about_text;
      if (content.logo_url) _profileData.logo = content.logo_url;
      if (content.address) _profileData.address = content.address;
      if (content.city) _profileData.city = content.city;
      if (content.state) _profileData.state = content.state;
      if (content.zip) _profileData.zip = content.zip;
      if (content.social_links) _profileData.socials = Object.assign({}, _profileData.socials, content.social_links);
      if (content.hours) _profileData.hours = content.hours;
      // Load GCR entity fields
      if (content.tagline) _profileData.tagline = content.tagline;
      if (content.hero_image_url) _profileData.hero_image_url = content.hero_image_url;
      if (content.directions_url) _profileData.directions_url = content.directions_url;
      if (content.booking_url) _profileData.booking_url = content.booking_url;
      if (content.reservation_url) _profileData.reservation_url = content.reservation_url;
      if (content.price_range) _profileData.price_range = content.price_range;
      if (content.social_instagram) _profileData.social_instagram = content.social_instagram;
      if (content.social_facebook) _profileData.social_facebook = content.social_facebook;
      if (content.social_tiktok) _profileData.social_tiktok = content.social_tiktok;
      // Load amenity booleans
      _profileData.outdoor_seating = content.outdoor_seating || false;
      _profileData.live_music = content.live_music || false;
      _profileData.delivery = content.delivery || false;
      _profileData.dine_in = content.dine_in || false;
      _profileData.takeout = content.takeout || false;
      _profileData.good_for_groups = content.good_for_groups || false;
      _profileData.good_for_children = content.good_for_children || false;
      _profileData.wheelchair_accessible = content.wheelchair_accessible || false;
      _profileData.parking = content.parking || false;
      _profileData.serves_beer = content.serves_beer || false;
      _profileData.serves_wine = content.serves_wine || false;
      _profileData.serves_cocktails = content.serves_cocktails || false;
      // Load HH schedule from businesses.metadata
      if (biz.metadata && biz.metadata.hh_schedule) {
        var hh = biz.metadata.hh_schedule;
        if (document.getElementById('hh-start')) document.getElementById('hh-start').value = hh.start || '';
        if (document.getElementById('hh-end'))   document.getElementById('hh-end').value   = hh.end || '';
        if (hh.days) hhSetDayBtns(hh.days);
      }
      // Store owner phone for SMS notifications
      if (content.owner_phone) {
        sessionStorage.setItem('owner_phone', content.owner_phone);
      }
    }
  } catch (e) {
    console.log('Supabase unavailable - using local API data');
  }

  var p = _profileData;
  document.getElementById('prof-name').value = p.name || '';
  document.getElementById('prof-phone').value = p.phone || '';
  document.getElementById('prof-email').value = p.email || '';
  document.getElementById('prof-website').value = p.website || '';
  document.getElementById('prof-description').value = p.description || '';
  document.getElementById('prof-address').value = p.address || '';
  document.getElementById('prof-city').value = p.city || '';
  document.getElementById('prof-state').value = p.state || '';
  document.getElementById('prof-zip').value = p.zip || '';
  document.getElementById('prof-tagline').value = p.tagline || '';
  document.getElementById('prof-price-range').value = p.price_range || '';
  document.getElementById('prof-directions-url').value = p.directions_url || '';
  document.getElementById('prof-booking-url').value = p.booking_url || '';
  document.getElementById('prof-reservation-url').value = p.reservation_url || '';

  document.getElementById('prof-social-facebook').value = p.socials.facebook || '';
  document.getElementById('prof-social-instagram').value = p.socials.instagram || '';
  document.getElementById('prof-social-tiktok').value = p.socials.tiktok || '';
  document.getElementById('prof-social-yelp').value = p.socials.yelp || '';
  document.getElementById('prof-social-google').value = p.socials.google || '';
  document.getElementById('prof-social-twitter').value = p.socials.twitter || '';

  if (p.hero_image_url) {
    var heroPreview = document.getElementById('prof-hero-preview');
    if (heroPreview) {
      heroPreview.src = p.hero_image_url;
      heroPreview.style.display = 'block';
    }
    var heroUrl = document.getElementById('prof-hero-url');
    if (heroUrl) heroUrl.value = p.hero_image_url;
  }

  if (p.logo) {
    var preview = document.getElementById('prof-logo-preview');
    if (preview) {
      preview.src = p.logo;
      preview.style.display = 'block';
    }
  }

  document.getElementById('prof-outdoor-seating').checked = p.outdoor_seating || false;
  document.getElementById('prof-live-music').checked = p.live_music || false;
  document.getElementById('prof-delivery').checked = p.delivery || false;
  document.getElementById('prof-dine-in').checked = p.dine_in || false;
  document.getElementById('prof-takeout').checked = p.takeout || false;
  document.getElementById('prof-good-for-groups').checked = p.good_for_groups || false;
  document.getElementById('prof-good-for-children').checked = p.good_for_children || false;
  document.getElementById('prof-wheelchair').checked = p.wheelchair_accessible || false;
  document.getElementById('prof-parking').checked = p.parking || false;
  document.getElementById('prof-serves-beer').checked = p.serves_beer || false;
  document.getElementById('prof-serves-wine').checked = p.serves_wine || false;
  document.getElementById('prof-serves-cocktails').checked = p.serves_cocktails || false;

  // Ensure hours is properly initialized
  if (!_profileData.hours || typeof _profileData.hours !== 'object') {
    _profileData.hours = {
      monday:    { open: '08:00', close: '18:00', closed: false },
      tuesday:   { open: '08:00', close: '18:00', closed: false },
      wednesday: { open: '08:00', close: '18:00', closed: false },
      thursday:  { open: '08:00', close: '18:00', closed: false },
      friday:    { open: '08:00', close: '18:00', closed: false },
      saturday:  { open: '08:00', close: '18:00', closed: false },
      sunday:    { open: '09:00', close: '17:00', closed: false }
    };
  }

  renderHoursEditor();
  } catch (e) { console.error('Failed to load profile:', e); toast('Failed to load profile', 'error'); }
}

function renderHoursEditor() {
  var container = document.getElementById('hours-editor');
  if (!container) return; // Element doesn't exist

  var days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  var html = '<table><thead><tr><th>Day</th><th>Open</th><th>Close</th><th>Closed</th></tr></thead><tbody>';

  days.forEach(function(day) {
    var h = _profileData.hours[day] || { open: '08:00', close: '18:00', closed: false };
    var label = day.charAt(0).toUpperCase() + day.slice(1);
    html += '<tr>';
    html += '<td style="font-weight:500;">' + label + '</td>';
    html += '<td><input type="time" id="hours-' + day + '-open" value="' + (h.open || '08:00') + '" style="padding:6px 10px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:13px;"' + (h.closed ? ' disabled' : '') + '></td>';
    html += '<td><input type="time" id="hours-' + day + '-close" value="' + (h.close || '18:00') + '" style="padding:6px 10px;background:var(--bg);border:1px solid var(--card-border);border-radius:var(--radius);color:var(--text);font-size:13px;"' + (h.closed ? ' disabled' : '') + '></td>';
    html += '<td><label class="toggle"><input type="checkbox" id="hours-' + day + '-closed"' + (h.closed ? ' checked' : '') + ' onchange="toggleDayClosed(\'' + day + '\')"><span class="toggle-slider"></span></label></td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function toggleDayClosed(day) {
  var closed = document.getElementById('hours-' + day + '-closed').checked;
  document.getElementById('hours-' + day + '-open').disabled = closed;
  document.getElementById('hours-' + day + '-close').disabled = closed;
}

async function saveProfile() {
  try {
  _profileData.name = document.getElementById('prof-name').value;
  _profileData.phone = document.getElementById('prof-phone').value;
  _profileData.email = document.getElementById('prof-email').value;
  _profileData.website = document.getElementById('prof-website').value;
  _profileData.description = document.getElementById('prof-description').value;
  _profileData.address = document.getElementById('prof-address').value;
  _profileData.city = document.getElementById('prof-city').value;
  _profileData.state = document.getElementById('prof-state').value;
  _profileData.zip = document.getElementById('prof-zip').value;
  _profileData.tagline = document.getElementById('prof-tagline').value;
  _profileData.price_range = document.getElementById('prof-price-range').value;
  _profileData.directions_url = document.getElementById('prof-directions-url').value;
  _profileData.booking_url = document.getElementById('prof-booking-url').value;
  _profileData.reservation_url = document.getElementById('prof-reservation-url').value;
  _profileData.hero_image_url = document.getElementById('prof-hero-url').value;

  _profileData.socials.facebook = document.getElementById('prof-social-facebook').value;
  _profileData.socials.instagram = document.getElementById('prof-social-instagram').value;
  _profileData.socials.tiktok = document.getElementById('prof-social-tiktok').value;
  _profileData.socials.yelp = document.getElementById('prof-social-yelp').value;
  _profileData.socials.google = document.getElementById('prof-social-google').value;
  _profileData.socials.twitter = document.getElementById('prof-social-twitter').value;

  _profileData.outdoor_seating = document.getElementById('prof-outdoor-seating').checked;
  _profileData.live_music = document.getElementById('prof-live-music').checked;
  _profileData.delivery = document.getElementById('prof-delivery').checked;
  _profileData.dine_in = document.getElementById('prof-dine-in').checked;
  _profileData.takeout = document.getElementById('prof-takeout').checked;
  _profileData.good_for_groups = document.getElementById('prof-good-for-groups').checked;
  _profileData.good_for_children = document.getElementById('prof-good-for-children').checked;
  _profileData.wheelchair_accessible = document.getElementById('prof-wheelchair').checked;
  _profileData.parking = document.getElementById('prof-parking').checked;
  _profileData.serves_beer = document.getElementById('prof-serves-beer').checked;
  _profileData.serves_wine = document.getElementById('prof-serves-wine').checked;
  _profileData.serves_cocktails = document.getElementById('prof-serves-cocktails').checked;

  var days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  days.forEach(function(day) {
    _profileData.hours[day] = {
      open: document.getElementById('hours-' + day + '-open').value,
      close: document.getElementById('hours-' + day + '-close').value,
      closed: document.getElementById('hours-' + day + '-closed').checked
    };
  });

  document.getElementById('sidebar-biz-name').textContent = _profileData.name || 'My Business';

  // Collect HH schedule from UI
  var hhDays = Array.from(document.querySelectorAll('#hh-day-btns .hh-day-btn.active')).map(function(b) { return b.dataset.day; }).join(', ');
  var hhStart = document.getElementById('hh-start') ? document.getElementById('hh-start').value.trim() : '';
  var hhEnd   = document.getElementById('hh-end')   ? document.getElementById('hh-end').value.trim()   : '';
  var hhSchedule = (hhDays || hhStart) ? { days: hhDays, start: hhStart, end: hhEnd } : null;

  // Save to Supabase
  try {
    await CC.dashboard.updateProfile({
      business: { name: _profileData.name, logo_url: _profileData.logo, metadata: hhSchedule ? { hh_schedule: hhSchedule } : undefined },
      content: {
        contact_phone: _profileData.phone,
        contact_email: _profileData.email,
        website_url: _profileData.website,
        about_text: _profileData.description,
        address: _profileData.address,
        city: _profileData.city,
        state: _profileData.state,
        zip: _profileData.zip,
        social_links: _profileData.socials,
        hours: _profileData.hours,
        tagline: _profileData.tagline,
        hero_image_url: _profileData.hero_image_url,
        directions_url: _profileData.directions_url,
        booking_url: _profileData.booking_url,
        reservation_url: _profileData.reservation_url,
        price_range: _profileData.price_range,
        outdoor_seating: _profileData.outdoor_seating,
        live_music: _profileData.live_music,
        delivery: _profileData.delivery,
        dine_in: _profileData.dine_in,
        takeout: _profileData.takeout,
        good_for_groups: _profileData.good_for_groups,
        good_for_children: _profileData.good_for_children,
        wheelchair_accessible: _profileData.wheelchair_accessible,
        parking: _profileData.parking,
        serves_beer: _profileData.serves_beer,
        serves_wine: _profileData.serves_wine,
        serves_cocktails: _profileData.serves_cocktails
      }
    });
    toast('Profile saved!', 'success');
  } catch (e) {
    console.error('Failed to save profile:', e);
    toast('Save failed — ' + e.message, 'error');
  }
  } catch (e) { console.error('Failed to save profile:', e); toast('Save failed — ' + e.message, 'error'); }
}

async function uploadLogo(input) {
  try {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (!file.type.startsWith('image/')) { toast('Please select an image file', 'error'); return; }

  toast('Uploading logo...');
  var url = await uploadToSupabase(file, 'logos');
  if (url) {
    _profileData.logo = url;
    var preview = document.getElementById('prof-logo-preview');
    preview.src = url;
    preview.style.display = 'block';
    // Save logo URL to business record
    await CC.dashboard.updateProfile({ business: { logo_url: url } });
    toast('Logo uploaded and saved');
  } else {
    toast('Logo upload failed', 'error');
  }
  } catch (e) { console.error('Logo upload error:', e); toast('Upload failed', 'error'); }
}

async function uploadHeroImage(input) {
  try {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (!file.type.startsWith('image/')) { toast('Please select an image file', 'error'); return; }

  toast('Uploading hero image...');
  var url = await uploadToSupabase(file, 'hero-images');
  if (url) {
    _profileData.hero_image_url = url;
    var preview = document.getElementById('prof-hero-preview');
    if (preview) {
      preview.src = url;
      preview.style.display = 'block';
    }
    var urlInput = document.getElementById('prof-hero-url');
    if (urlInput) urlInput.value = url;
    toast('Hero image uploaded and saved');
  } else {
    toast('Hero image upload failed', 'error');
  }
  } catch (e) { console.error('Hero image upload error:', e); toast('Upload failed', 'error'); }
}

// ===== LIVE PREVIEW =====
function setupLivePreview() {
  const fields = ['prof-name', 'prof-phone', 'prof-email', 'prof-address', 'prof-description'];

  fields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('input', updateLivePreview);
      field.addEventListener('change', updateLivePreview);
    }
  });

  console.log('✅ Live preview attached to form fields');
}

function updateLivePreview() {
  // Update internal data
  _profileData.name = document.getElementById('prof-name').value;
  _profileData.phone = document.getElementById('prof-phone').value;
  _profileData.email = document.getElementById('prof-email').value;
  _profileData.address = document.getElementById('prof-address').value;
  _profileData.description = document.getElementById('prof-description').value;

  // Update website preview if it exists
  const previewIframe = document.getElementById('cms-preview-iframe') || document.querySelector('iframe[id*="preview"]');
  if (previewIframe && previewIframe.contentWindow) {
    try {
      // Update preview with current data
      const previewDoc = previewIframe.contentDocument || previewIframe.contentWindow.document;
      if (previewDoc) {
        const nameElements = previewDoc.querySelectorAll('[data-bind="business.name"]');
        const phoneElements = previewDoc.querySelectorAll('[data-bind="business.phone"]');
        const emailElements = previewDoc.querySelectorAll('[data-bind="business.email"]');
        const addressElements = previewDoc.querySelectorAll('[data-bind="business.address"]');

        nameElements.forEach(el => el.textContent = _profileData.name);
        phoneElements.forEach(el => el.textContent = _profileData.phone);
        emailElements.forEach(el => el.textContent = _profileData.email);
        addressElements.forEach(el => el.textContent = _profileData.address);
      }
    } catch (e) {
      // CORS error - reload iframe instead
      const timestamp = new Date().getTime();
      previewIframe.src = `https://beachsidecircleboats.com?t=${timestamp}`;
    }
  }

  // Show live update indicator
  const saveBtn = document.querySelector('button[onclick="saveProfile()"]');
  if (saveBtn && _profileData.name !== '') {
    saveBtn.textContent = '💾 Save Changes';
    saveBtn.style.opacity = '1';
  }
}

// Attach live preview when page loads
function attachLivePreview() {
  setTimeout(setupLivePreview, 500);
}

// ── HH schedule day-button helpers ──
function hhToggleDay(btn) {
  btn.classList.toggle('active');
}

function hhSetDayBtns(daysStr) {
  var active = (daysStr || '').toLowerCase().split(/[,\s]+/).map(function(d) { return d.trim(); });
  document.querySelectorAll('#hh-day-btns .hh-day-btn').forEach(function(b) {
    b.classList.toggle('active', active.some(function(a) { return b.dataset.day.toLowerCase().startsWith(a.substring(0,3)); }));
  });
}

onPageLoad('profile', loadProfile);
document.addEventListener('DOMContentLoaded', attachLivePreview);
