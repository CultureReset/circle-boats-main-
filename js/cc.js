// ============================================
// cc.js — CyberCheck API Client (Supabase Direct)
// ============================================
//
// Same CC.dashboard.* API surface as before, but queries
// Supabase directly instead of going through Express.
// Modules call CC.dashboard.getBookings() etc. — no changes needed.
//
// Requires: supabase-client.js loaded first (provides supabase, getSiteId, etc.)
//

const CC = (function() {

  // ---- Token / Session Management ----
  // Kept for backwards compat with auth guard + modules that check CC.getToken()

  function getToken() {
    // Check Supabase session first — return actual JWT, not a placeholder
    try {
      var sbKey = Object.keys(localStorage).find(function(k) { return k.startsWith('sb-') && k.endsWith('-auth-token'); });
      if (sbKey) {
        var s = JSON.parse(localStorage.getItem(sbKey));
        if (s && s.access_token) return s.access_token;
      }
    } catch(e) {}
    // Fallback to legacy token
    return localStorage.getItem('cc_token') || sessionStorage.getItem('cc_token') || null;
  }

  function setToken(token, remember) {
    if (remember) {
      localStorage.setItem('cc_token', token);
    } else {
      sessionStorage.setItem('cc_token', token);
    }
  }

  function setSession(userData) {
    if (userData && userData.business) {
      try {
        localStorage.setItem('cc_session_business', JSON.stringify(userData.business));
      } catch(e) {}
    }
  }

  function getStoredBusiness() {
    try {
      var stored = localStorage.getItem('cc_session_business');
      return stored ? JSON.parse(stored) : null;
    } catch(e) {
      return null;
    }
  }

  function clearToken() {
    localStorage.removeItem('cc_token');
    sessionStorage.removeItem('cc_token');
    localStorage.removeItem('cc_session_business');
    if (typeof clearSupabaseCache === 'function') clearSupabaseCache();
  }

  // ---- Auth ----
  // Login: Uses Supabase Auth directly (establishes RLS session for dashboard queries)
  // Signup: Routes through backend API (uses service key to bypass RLS for initial record creation)

  async function login(email, password, remember) {
    // 1. Try Supabase Auth first (new accounts)
    if (supabase && supabase.auth) {
      try {
        var { data, error } = await supabase.auth.signInWithPassword({ email: email, password: password });
        if (!error && data && data.session) {
          clearSupabaseCache();
          var biz = await getSupabaseBusiness();
          // Fetch role from API so admin redirect works
          try {
            var roleRes = await fetch(API_BASE + '/api/auth/verify', {
              headers: { 'Authorization': 'Bearer ' + data.session.access_token }
            });
            var roleData = await roleRes.json();
            if (roleData && roleData.user && roleData.user.role) data.user.role = roleData.user.role;
          } catch(e) {}
          setSession({ business: biz });
          return { token: data.session.access_token, user: data.user, business: biz };
        }
      } catch (e) { /* fall through to Express fallback */ }
    }
    // 2. Fallback: Express JWT login (accounts created before Supabase Auth migration)
    try {
      var res = await fetch(API_BASE + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });
      var data = await res.json();
      if (!res.ok) return { error: data.error || 'Invalid credentials' };
      setToken(data.token, remember !== false);
      setSession(data);
      return { token: data.token, user: data.user, business: data.business };
    } catch (e) {
      return { error: e.message || 'Login failed — check your connection and try again' };
    }
  }

  async function signup(payload) {
    // Route signup through backend API — it creates both the Supabase Auth user
    // and the business/user/site_content records using the service key (bypasses RLS)
    try {
      var res = await fetch(API_BASE + '/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          name: payload.name || payload.businessName,
          businessName: payload.businessName || payload.name,
          businessType: payload.businessType || 'rental'
        })
      });
      var data = await res.json();
      if (!res.ok) return { error: data.error || 'Signup failed' };
      return data;
    } catch (e) {
      return { error: 'Cannot reach server. Make sure the backend API is running.' };
    }
  }

  async function logout() {
    try {
      if (supabase && supabase.auth) await supabase.auth.signOut();
    } catch (e) { console.error('Logout error:', e); }
    clearToken();
    window.location.href = 'login.html';
  }

  async function getSession() {
    // Try Supabase Auth first
    var session = await getSupabaseSession();
    if (session) {
      var biz = await getSupabaseBusiness();
      return { user: session.user, business: biz };
    }
    // Fallback: use legacy Express JWT
    var legacyToken = localStorage.getItem('cc_token') || sessionStorage.getItem('cc_token');
    if (legacyToken) {
      try {
        // Decode JWT (third part is the payload, base64url encoded)
        var parts = legacyToken.split('.');
        if (parts.length === 3) {
          var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          // Try stored business data first (set at login time)
          var biz = getStoredBusiness();
          if (!biz && payload.siteId) {
            // If not in storage, try to fetch from Supabase
            var { data: fetchedBiz } = await supabase.from('businesses').select('*').eq('site_id', payload.siteId).single();
            biz = fetchedBiz;
          }
          if (biz) {
            return { user: { id: payload.userId, email: '' }, business: biz, legacy: true };
          }
        }
      } catch (e) {
        console.error('Failed to handle legacy token:', e);
      }
      // Last resort: return whatever stored business we have, even if incomplete
      var storedBiz = getStoredBusiness();
      return { user: { id: 'legacy', email: '' }, business: storedBiz, legacy: true };
    }
    return null;
  }

  // ---- Legacy fetch (for any remaining Express calls) ----

  var API_BASE = window.CC_API_BASE || window.location.origin;

  async function request(method, path, body) {
    try {
      var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
      var token = getToken();
      if (token) opts.headers['Authorization'] = 'Bearer ' + token;
      if (body && method !== 'GET') opts.body = JSON.stringify(body);
      var res = await fetch(API_BASE + path, opts);
      if (!res.ok) return null;
      return await res.json();
    } catch(e) { return null; }
  }

  function get(path) { return request('GET', path); }
  function post(path, body) { return request('POST', path, body); }
  function put(path, body) { return request('PUT', path, body); }
  function del(path) { return request('DELETE', path); }

  // ---- Helper: ensure site_id is resolved ----

  async function ensureSiteId() {
    if (_siteId) return _siteId;
    await getSupabaseBusiness();
    return _siteId;
  }

  // ---- Dashboard Cache — reduces Supabase calls, instant page switches ----
  var _dashCache = {};
  var _dashCacheTTL = 2 * 60 * 1000; // 2 minutes default

  function dashCacheGet(key) {
    var entry = _dashCache[key];
    if (entry && (Date.now() - entry.ts < _dashCacheTTL)) return entry.data;
    return undefined;
  }
  function dashCacheSet(key, data) {
    _dashCache[key] = { data: data, ts: Date.now() };
  }
  function dashCacheClear(prefix) {
    if (!prefix) { _dashCache = {}; return; }
    Object.keys(_dashCache).forEach(function(k) { if (k.indexOf(prefix) === 0) delete _dashCache[k]; });
  }

  // ---- Dashboard API (Supabase Direct) ----
  // Each method replicates the exact query from backend/routes/dashboard.js
  // GET methods check cache first. Write methods clear relevant cache.

  var dashboard = {

    // --- Profile & Content ---
    getProfile: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data: business } = await supabase.from('businesses').select('*').eq('site_id', siteId).single();
      var { data: content } = await supabase.from('site_content').select('*').eq('site_id', siteId).single();
      return { business: business, content: content };
    },
    updateProfile: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      if (d.business) {
        var biz = d.business;
        var bizUpdate = { name: biz.name, type: biz.type, logo_url: biz.logo_url, cover_url: biz.cover_url, updated_at: new Date().toISOString() };
        if (biz.metadata !== undefined) {
          // Merge metadata patch instead of replacing entire object
          var { data: existing } = await supabase.from('businesses').select('metadata').eq('site_id', siteId).single();
          bizUpdate.metadata = Object.assign({}, (existing && existing.metadata) || {}, biz.metadata);
        }
        await supabase.from('businesses').update(bizUpdate).eq('site_id', siteId);
      }
      if (d.content) {
        var c = Object.assign({}, d.content); delete c.site_id;
        c.updated_at = new Date().toISOString();
        await supabase.from('site_content').upsert(Object.assign({ site_id: siteId }, c)).select();
      }
      var { data: business } = await supabase.from('businesses').select('*').eq('site_id', siteId).single();
      var { data: content } = await supabase.from('site_content').select('*').eq('site_id', siteId).single();
      return { business: business, content: content };
    },

    // --- Hours ---
    getHours: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return {};
      var { data } = await supabase.from('site_content').select('hours').eq('site_id', siteId).single();
      return (data && data.hours) || {};
    },
    updateHours: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('site_content').update({ hours: d.hours || d, updated_at: new Date().toISOString() }).eq('site_id', siteId).select('hours').single();
      return data ? data.hours : {};
    },

    // --- Services ---
    getServices: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('services').select('*').eq('site_id', siteId).order('sort_order', { ascending: true });
      return data || [];
    },
    createService: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('services').insert(obj).select().single();
      return data;
    },
    updateService: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { updated_at: new Date().toISOString() }); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('services').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteService: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('services').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Gallery / Media ---
    getGallery: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('media').select('*').eq('site_id', siteId).order('uploaded_at', { ascending: false });
      return data || [];
    },
    uploadMedia: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('media').insert({ site_id: siteId, url: d.url, filename: d.filename, alt_text: d.alt_text, file_size: d.file_size, file_type: d.file_type || 'image', folder: d.folder || 'gallery' }).select().single();
      return data;
    },
    deleteMedia: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('media').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- FAQs ---
    getFaqs: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('faqs').select('*').eq('site_id', siteId).order('sort_order', { ascending: true });
      return data || [];
    },
    createFaq: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('faqs').insert(obj).select().single();
      return data;
    },
    updateFaq: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('faqs').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteFaq: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('faqs').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Social Links ---
    getSocial: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return {};
      var { data } = await supabase.from('site_content').select('social_links').eq('site_id', siteId).single();
      return (data && data.social_links) || {};
    },
    updateSocial: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('site_content').update({ social_links: d, updated_at: new Date().toISOString() }).eq('site_id', siteId).select('social_links').single();
      return data ? data.social_links : {};
    },

    // --- Staff ---
    getStaff: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('staff').select('*').eq('site_id', siteId).order('created_at', { ascending: true });
      return data || [];
    },
    createStaff: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('staff').insert(obj).select().single();
      return data;
    },
    updateStaff: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('staff').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteStaff: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('staff').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Menu Items ---
    getMenu: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('menu_items').select('*').eq('site_id', siteId).order('sort_order', { ascending: true });
      return data || [];
    },
    createMenuItem: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('menu_items').insert(obj).select().single();
      return data;
    },
    updateMenuItem: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { updated_at: new Date().toISOString() }); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('menu_items').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteMenuItem: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('menu_items').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Events ---
    getEvents: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('events').select('*').eq('site_id', siteId).order('event_date', { ascending: true });
      return data || [];
    },
    createEvent: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('events').insert(obj).select().single();
      return data;
    },
    updateEvent: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('events').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteEvent: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('events').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Fleet Types (rentals) ---
    getFleetTypes: async function() {
      try {
        var sbKey = Object.keys(localStorage).find(function(k) { return k.startsWith('sb-') && k.endsWith('-auth-token'); });
        var token = null;
        if (sbKey) { try { var s = JSON.parse(localStorage.getItem(sbKey)); token = s && s.access_token ? s.access_token : null; } catch(e) {} }
        if (!token) token = localStorage.getItem('cc_token') || sessionStorage.getItem('cc_token');
        var res = await fetch(API_BASE + '/api/dashboard/fleet', { headers: { 'Authorization': 'Bearer ' + token } });
        var data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch(e) { return []; }
    },
    createFleetType: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id; delete obj.fleet_items;
      var { data } = await supabase.from('fleet_types').insert(obj).select().single();
      return data;
    },
    updateFleetType: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { updated_at: new Date().toISOString() }); delete obj.site_id; delete obj.id; delete obj.fleet_items;
      var { data } = await supabase.from('fleet_types').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteFleetType: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('fleet_types').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Fleet Items ---
    getFleetItems: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('fleet_items').select('*, fleet_types(name)').eq('site_id', siteId);
      return data || [];
    },
    createFleetItem: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('fleet_items').insert(obj).select().single();
      return data;
    },
    updateFleetItem: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { updated_at: new Date().toISOString() }); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('fleet_items').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteFleetItem: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('fleet_items').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Time Slots ---
    getTimeSlots: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('rental_time_slots').select('*').eq('site_id', siteId).order('sort_order', { ascending: true });
      return data || [];
    },
    createTimeSlot: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('rental_time_slots').insert(obj).select().single();
      return data;
    },
    updateTimeSlot: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('rental_time_slots').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteTimeSlot: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('rental_time_slots').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Pricing ---
    getPricing: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('rental_pricing').select('*, fleet_types(name), rental_time_slots(name)').eq('site_id', siteId);
      return data || [];
    },
    setPricing: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('rental_pricing').upsert(obj).select().single();
      return data;
    },

    // --- Addons ---
    getAddons: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('rental_addons').select('*').eq('site_id', siteId).order('sort_order', { ascending: true });
      return data || [];
    },
    createAddon: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('rental_addons').insert(obj).select().single();
      return data;
    },
    updateAddon: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('rental_addons').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteAddon: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('rental_addons').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Bookings ---
    getBookings: async function(params) {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var query = supabase.from('bookings')
        .select('*, fleet_types(name, image_url), rental_time_slots(name, start_time, end_time)')
        .eq('site_id', siteId).order('booking_date', { ascending: false });
      if (params) {
        if (params.status) query = query.eq('status', params.status);
        if (params.date) query = query.eq('booking_date', params.date);
        if (params.from) query = query.gte('booking_date', params.from);
        if (params.to) query = query.lte('booking_date', params.to);
      }
      var { data } = await query;
      return data || [];
    },
    createBooking: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('bookings').insert(obj).select().single();
      return data;
    },
    updateBooking: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { updated_at: new Date().toISOString() }); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('bookings').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteBooking: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('bookings').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Orders ---
    getOrders: async function(params) {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var query = supabase.from('orders').select('*').eq('site_id', siteId).order('created_at', { ascending: false });
      if (params && params.status) query = query.eq('status', params.status);
      var { data } = await query;
      return data || [];
    },
    updateOrder: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { updated_at: new Date().toISOString() }); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('orders').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },

    // --- Customers ---
    getCustomers: async function(params) {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var query = supabase.from('customers').select('*').eq('site_id', siteId).order('created_at', { ascending: false });
      if (params && params.search) {
        query = query.or('name.ilike.%' + params.search + '%,email.ilike.%' + params.search + '%,phone.ilike.%' + params.search + '%');
      }
      var { data } = await query;
      return data || [];
    },
    getCustomer: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('customers').select('*').eq('id', id).eq('site_id', siteId).single();
      return data;
    },
    createCustomer: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('customers').insert(obj).select().single();
      return data;
    },
    updateCustomer: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { updated_at: new Date().toISOString() }); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('customers').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },

    // --- Reviews ---
    getReviews: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('reviews').select('*').eq('site_id', siteId).order('created_at', { ascending: false });
      return data || [];
    },
    updateReview: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('reviews').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },

    // --- Review Questions (per-business) ---
    getReviewQuestions: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('review_questions').select('*').eq('site_id', siteId).order('display_order', { ascending: true });
      return data || [];
    },
    createReviewQuestion: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId });
      var { data } = await supabase.from('review_questions').insert(obj).select().single();
      return data;
    },
    updateReviewQuestion: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { updated_at: new Date().toISOString() }); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('review_questions').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteReviewQuestion: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return false;
      var { error } = await supabase.from('review_questions').delete().eq('id', id).eq('site_id', siteId);
      return !error;
    },

    // --- Review Request (create with token & send SMS) ---
    createReviewWithToken: async function(reviewData) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, reviewData, { site_id: siteId });
      var { data, error } = await supabase.from('reviews').insert(obj).select().single();
      if (error) throw new Error(error.message);
      return data;
    },

    sendSMS: async function(smsData) {
      // Call backend SMS API to send message
      var response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smsData)
      });
      if (!response.ok) {
        var err = await response.json();
        throw new Error(err.error || 'SMS send failed');
      }
      return await response.json();
    },

    // --- Waivers ---
    getWaivers: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('waivers').select('*').eq('site_id', siteId).order('signed_at', { ascending: false });
      return data || [];
    },

    // --- Coupons ---
    getCoupons: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('coupons').select('*').eq('site_id', siteId).order('created_at', { ascending: false });
      return data || [];
    },
    createCoupon: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('coupons').insert(obj).select().single();
      return data;
    },
    updateCoupon: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('coupons').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteCoupon: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('coupons').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Specials ---
    getSpecials: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('specials').select('*').eq('site_id', siteId);
      return data || [];
    },
    createSpecial: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('specials').insert(obj).select().single();
      return data;
    },
    updateSpecial: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('specials').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteSpecial: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('specials').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Connections (OAuth) ---
    getConnections: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('connections').select('id, provider, account_name, status, connected_at').eq('site_id', siteId);
      return data || [];
    },
    connect: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId });
      var { data } = await supabase.from('connections').upsert(obj).select().single();
      return data;
    },
    disconnect: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('connections').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Pages ---
    getPages: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('site_pages').select('*').eq('site_id', siteId).order('sort_order', { ascending: true });
      return data || [];
    },
    createPage: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { site_id: siteId }); delete obj.id;
      var { data } = await supabase.from('site_pages').insert(obj).select().single();
      return data;
    },
    updatePage: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var obj = Object.assign({}, d, { updated_at: new Date().toISOString() }); delete obj.site_id; delete obj.id;
      var { data } = await supabase.from('site_pages').update(obj).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deletePage: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('site_pages').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Theme ---
    getTheme: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return {};
      var { data } = await supabase.from('site_content').select('theme_color, theme_font, custom_css').eq('site_id', siteId).single();
      return data || {};
    },
    updateTheme: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('site_content').update({ theme_color: d.theme_color, theme_font: d.theme_font, custom_css: d.custom_css, updated_at: new Date().toISOString() }).eq('site_id', siteId).select('theme_color, theme_font, custom_css').single();
      return data;
    },

    // --- SEO ---
    getSeo: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return {};
      var { data } = await supabase.from('site_content').select('seo_title, seo_description').eq('site_id', siteId).single();
      return data || {};
    },
    updateSeo: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('site_content').update({ seo_title: d.seo_title, seo_description: d.seo_description, updated_at: new Date().toISOString() }).eq('site_id', siteId).select('seo_title, seo_description').single();
      return data;
    },

    // --- Domain ---
    getDomain: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return {};
      var { data } = await supabase.from('businesses').select('domain, subdomain').eq('site_id', siteId).single();
      return data || {};
    },
    updateDomain: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('businesses').update({ domain: d.domain, updated_at: new Date().toISOString() }).eq('site_id', siteId).select('domain, subdomain').single();
      return data;
    },

    // --- Billing ---
    getBilling: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return {};
      var { data: business } = await supabase.from('businesses').select('plan, status').eq('site_id', siteId).single();
      var { data: apps } = await supabase.from('site_apps').select('app_id, apps(name, monthly_price)').eq('site_id', siteId).eq('enabled', true);
      var appsCost = (apps || []).reduce(function(sum, a) { return sum + ((a.apps && a.apps.monthly_price) || 0); }, 0);
      return { plan: business ? business.plan : 'free', status: business ? business.status : 'active', installed_apps: apps || [], monthly_apps_cost: appsCost };
    },

    // --- Apps ---
    getApps: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data: allApps } = await supabase.from('apps').select('*').eq('status', 'active');
      var { data: installed } = await supabase.from('site_apps').select('app_id, enabled').eq('site_id', siteId);
      var installedMap = {};
      (installed || []).forEach(function(a) { installedMap[a.app_id] = a.enabled; });
      return (allApps || []).map(function(app) { return Object.assign({}, app, { installed: app.app_id in installedMap, enabled: installedMap[app.app_id] || false }); });
    },
    installApp: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('site_apps').upsert({ site_id: siteId, app_id: d.app_id, enabled: true }).select().single();
      return data;
    },
    uninstallApp: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('site_apps').update({ enabled: false }).eq('site_id', siteId).eq('app_id', d.app_id);
      return { success: true };
    },

    // --- Notifications ---
    getNotifications: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('notifications').select('*').eq('site_id', siteId).order('created_at', { ascending: false }).limit(50);
      return data || [];
    },
    markAllRead: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('notifications').update({ read: true }).eq('site_id', siteId).eq('read', false);
      return { success: true };
    },

    // --- SMS Log ---
    getSmsLog: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('sms_log').select('*').eq('site_id', siteId).order('created_at', { ascending: false }).limit(100);
      return data || [];
    },

    // --- Activity ---
    getActivity: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('activity_log').select('*').eq('site_id', siteId).order('created_at', { ascending: false }).limit(100);
      return data || [];
    },

    // --- Availability ---
    getAvailability: async function(date) {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('availability').select('*').eq('site_id', siteId);
      return data || [];
    },
    setAvailability: async function(itemId, dateKey, status) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      if (status === 'available') {
        await supabase.from('availability').delete().eq('site_id', siteId).eq('item_id', itemId).eq('date', dateKey);
        return { success: true };
      }
      var { data } = await supabase.from('availability').upsert({ site_id: siteId, item_id: itemId, date: dateKey, status: status }, { onConflict: 'site_id,item_id,date' }).select().single();
      return data;
    },

    // --- Blackout Dates ---
    getBlackoutDates: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('blackout_dates').select('*').eq('site_id', siteId).order('date_from', { ascending: true });
      return data || [];
    },
    addBlackoutDate: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var payload = { site_id: siteId, date_from: d.date_from, date_to: d.date_to, label: d.label || null };
      var { data } = await supabase.from('blackout_dates').insert(payload).select().single();
      return data;
    },
    deleteBlackoutDate: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('blackout_dates').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Messaging Settings ---
    getMessaging: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('messaging_settings').select('*').eq('site_id', siteId).single();
      return data || null;
    },
    updateMessaging: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var payload = Object.assign({}, d, { site_id: siteId, updated_at: new Date().toISOString() });
      var { data } = await supabase.from('messaging_settings').upsert(payload, { onConflict: 'site_id' }).select().single();
      return data;
    },

    // --- Waitlist ---
    getWaitlist: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return { settings: {}, entries: [] };
      var { data: settings } = await supabase.from('waitlist_settings').select('*').eq('site_id', siteId).single();
      var { data: entries } = await supabase.from('waitlist').select('*').eq('site_id', siteId).order('created_at', { ascending: true });
      return { settings: settings || {}, entries: entries || [] };
    },
    updateWaitlistSettings: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var payload = Object.assign({}, d, { site_id: siteId, updated_at: new Date().toISOString() });
      var { data } = await supabase.from('waitlist_settings').upsert(payload, { onConflict: 'site_id' }).select().single();
      return data;
    },
    updateWaitlistEntry: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('waitlist').update(Object.assign({}, d, { updated_at: new Date().toISOString() })).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteWaitlistEntry: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('waitlist').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Locations ---
    getLocations: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('locations').select('*').eq('site_id', siteId).order('sort_order').order('created_at');
      return data || [];
    },
    createLocation: async function(d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('locations').insert(Object.assign({}, d, { site_id: siteId })).select().single();
      return data;
    },
    updateLocation: async function(id, d) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('locations').update(Object.assign({}, d, { updated_at: new Date().toISOString() })).eq('id', id).eq('site_id', siteId).select().single();
      return data;
    },
    deleteLocation: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('locations').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Publish ---
    publish: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('businesses').update({ status: 'active', updated_at: new Date().toISOString() }).eq('site_id', siteId);
      return { success: true, message: 'Site published', published_at: new Date().toISOString() };
    },

    // --- Export ---
    exportData: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      return { site_id: siteId };
    },

    // --- Analytics ---
    getAnalytics: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;

      var today = new Date().toISOString().split('T')[0];
      var weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch all data in parallel
      var [todayViewsRes, todayConvRes, monthViewsRes, funnelRes, monthConvRes] = await Promise.all([
        supabase.from('page_views').select('session_id, ip_address').eq('site_id', siteId).gte('created_at', today + 'T00:00:00'),
        supabase.from('conversions').select('revenue').eq('site_id', siteId).gte('created_at', today + 'T00:00:00'),
        supabase.from('page_views').select('utm_source, utm_medium, session_id, device_type, created_at').eq('site_id', siteId).gte('created_at', monthAgo + 'T00:00:00'),
        supabase.from('booking_funnel').select('step_name, booking_ref').eq('site_id', siteId).gte('created_at', monthAgo + 'T00:00:00'),
        supabase.from('conversions').select('revenue, created_at').eq('site_id', siteId).gte('created_at', monthAgo + 'T00:00:00')
      ]);

      var todayViews = todayViewsRes.data || [];
      var todayConversions = todayConvRes.data || [];
      var monthViews = monthViewsRes.data || [];
      var funnelRows = funnelRes.data || [];
      var monthConversions = monthConvRes.data || [];

      // Today stats
      var todayRevenue = todayConversions.reduce(function(s, c) { return s + (parseFloat(c.revenue) || 0); }, 0);
      var todaySessions = new Set(todayViews.map(function(v) { return v.session_id || v.ip_address; })).size;

      // Week stats
      var weekViews = monthViews.filter(function(v) { return v.created_at >= weekAgo; });
      var weekSessions = new Set(weekViews.map(function(v) { return v.session_id; })).size;
      var weekRev = monthConversions.filter(function(c) { return c.created_at >= weekAgo + 'T00:00:00'; })
        .reduce(function(s, c) { return s + (parseFloat(c.revenue) || 0); }, 0);

      // Month stats
      var monthSessions = new Set(monthViews.map(function(v) { return v.session_id; })).size;
      var monthRev = monthConversions.reduce(function(s, c) { return s + (parseFloat(c.revenue) || 0); }, 0);

      // Booking funnel — count unique booking_refs per step
      var funnelSets = {};
      funnelRows.forEach(function(r) {
        if (!funnelSets[r.step_name]) funnelSets[r.step_name] = new Set();
        if (r.booking_ref) funnelSets[r.step_name].add(r.booking_ref);
      });
      var bookingFunnel = {
        opened:    (funnelSets['opened']          || new Set()).size,
        step2:     (funnelSets['step2_boat_time'] || new Set()).size,
        step3:     (funnelSets['step3_extras']    || new Set()).size,
        step4:     (funnelSets['step4_checkout']  || new Set()).size,
        completed: (funnelSets['completed']        || new Set()).size,
        abandoned: (funnelSets['abandoned']        || new Set()).size
      };

      // UTM source breakdown
      var utmMap = {};
      monthViews.forEach(function(v) {
        var src = v.utm_source || 'direct';
        var med = v.utm_medium || 'none';
        var key = src + '|' + med;
        if (!utmMap[key]) utmMap[key] = { source: src, medium: med, sessions: new Set() };
        if (v.session_id) utmMap[key].sessions.add(v.session_id);
      });
      var utmSources = Object.values(utmMap).map(function(u) {
        return { source: u.source, medium: u.medium, visitors: u.sessions.size };
      }).sort(function(a, b) { return b.visitors - a.visitors; }).slice(0, 10);

      // Device breakdown
      var deviceMap = {};
      monthViews.forEach(function(v) {
        var d = v.device_type || 'unknown';
        deviceMap[d] = (deviceMap[d] || 0) + 1;
      });
      var deviceBreakdown = Object.entries(deviceMap).map(function(kv) {
        return { device: kv[0], count: kv[1] };
      }).sort(function(a, b) { return b.count - a.count; });

      return {
        today: { visitors: todaySessions, pageviews: todayViews.length, conversions: todayConversions.length, revenue: todayRevenue },
        week:  { visitors: weekSessions, revenue: weekRev },
        month: { visitors: monthSessions, revenue: monthRev },
        topPages: [],
        trafficSources: utmSources,
        conversionFunnel: { views: monthSessions, clicks: bookingFunnel.opened, bookings: bookingFunnel.completed },
        bookingFunnel: bookingFunnel,
        deviceBreakdown: deviceBreakdown,
        revenueChart: []
      };
    },

    // --- SEO ---
    getSEO: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data: pages } = await supabase.from('seo_meta_tags').select('*').eq('site_id', siteId);
      var { data: sitemap } = await supabase.from('sitemap_config').select('*').eq('site_id', siteId).single();
      var { data: robots } = await supabase.from('robots_config').select('*').eq('site_id', siteId).single();
      return { pages: pages || [], sitemap: sitemap || {}, robots: (robots && robots.robots_txt) || '' };
    },

    createSEOPage: async function(pageData) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('seo_meta_tags').insert(Object.assign({ site_id: siteId }, pageData)).select().single();
      return data;
    },

    updateSEOPage: async function(id, pageData) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      pageData.updated_at = new Date().toISOString();
      await supabase.from('seo_meta_tags').update(pageData).eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    generateSitemap: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.rpc('generate_sitemap', { p_site_id: siteId });
      return { xml: data };
    },

    updateSitemapConfig: async function(config) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      config.updated_at = new Date().toISOString();
      await supabase.from('sitemap_config').upsert(Object.assign({ site_id: siteId }, config));
      return { success: true };
    },

    updateRobotsTxt: async function(robotsTxt) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('robots_config').upsert({ site_id: siteId, robots_txt: robotsTxt, updated_at: new Date().toISOString() });
      return { success: true };
    },

    getTrackingSettings: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('site_content').select('ga4_id, facebook_pixel_id').eq('site_id', siteId).single();
      return data || {};
    },

    updateTrackingSettings: async function(settings) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('site_content').update({ ga4_id: settings.ga4_id || null, facebook_pixel_id: settings.facebook_pixel_id || null, updated_at: new Date().toISOString() }).eq('site_id', siteId);
      return { success: true };
    },

    // --- Social Media ---
    getSocialMedia: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data: accounts } = await supabase.from('social_media_accounts').select('*').eq('site_id', siteId);
      var { data: posts } = await supabase.from('social_media_posts').select('*').eq('site_id', siteId).order('created_at', { ascending: false }).limit(50);
      var { data: analytics } = await supabase.from('social_media_analytics').select('*').eq('site_id', siteId).gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      return { accounts: accounts || [], posts: posts || [], analytics: analytics || [] };
    },

    createSocialPost: async function(postData) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var session = await getSupabaseSession();
      var { data } = await supabase.from('social_media_posts').insert(Object.assign({
        site_id: siteId,
        created_by: session ? session.user.id : null
      }, postData)).select().single();
      return data;
    },

    updateSocialPost: async function(id, postData) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      postData.updated_at = new Date().toISOString();
      await supabase.from('social_media_posts').update(postData).eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    deleteSocialPost: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('social_media_posts').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    disconnectSocialAccount: async function(platform) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('social_media_accounts').update({ is_connected: false, access_token: null, updated_at: new Date().toISOString() }).eq('site_id', siteId).eq('platform', platform);
      return { success: true };
    },

    // --- FAQ ---
    getFAQs: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return [];
      var { data } = await supabase.from('faqs').select('*').eq('site_id', siteId).order('sort_order', { ascending: true });
      return data || [];
    },

    createFAQ: async function(faq) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data: last } = await supabase.from('faqs').select('sort_order').eq('site_id', siteId).order('sort_order', { ascending: false }).limit(1).single();
      var nextSort = ((last && last.sort_order) || 0) + 1;
      var { data } = await supabase.from('faqs').insert(Object.assign({ site_id: siteId, sort_order: nextSort }, faq)).select().single();
      return data;
    },

    updateFAQ: async function(id, updates) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('faqs').update(updates).eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    deleteFAQ: async function(id) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('faqs').delete().eq('id', id).eq('site_id', siteId);
      return { success: true };
    },

    // --- Modules (site page layout) ---
    getModules: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('site_content').select('modules').eq('site_id', siteId).single();
      return data ? data.modules : null;
    },

    updateModules: async function(modules) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('site_content').upsert({ site_id: siteId, modules: modules, updated_at: new Date().toISOString() });
      return { success: true };
    },

    // --- Onboarding progress ---
    getOnboarding: async function() {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      var { data } = await supabase.from('onboarding_progress').select('*').eq('site_id', siteId).single();
      return data || { step1_done: false, step2_done: false, step3_done: false, step4_done: false, step5_done: false, step6_done: false };
    },

    updateOnboarding: async function(updates) {
      var siteId = await ensureSiteId(); if (!siteId) return null;
      await supabase.from('onboarding_progress').upsert(Object.assign({ site_id: siteId }, updates));
      return { success: true };
    }
  };

  // ---- Auto-cache wrapper for dashboard methods ----
  // GET methods (get*) cache results for 2 min.
  // Write methods (create*, update*, delete*, set*, upload*, install*, uninstall*,
  //   publish, connect, disconnect, markAllRead) clear related cache on success.
  (function wrapDashboardCache() {
    var original = {};
    Object.keys(dashboard).forEach(function(key) {
      original[key] = dashboard[key];

      // Identify GET methods (start with "get" or are read-only names)
      if (key.indexOf('get') === 0 || key === 'exportData') {
        dashboard[key] = async function() {
          var cacheKey = key + '_' + JSON.stringify(Array.prototype.slice.call(arguments));
          var cached = dashCacheGet(cacheKey);
          if (cached !== undefined) { console.log('DashCache hit:', key); return cached; }
          var result = await original[key].apply(null, arguments);
          dashCacheSet(cacheKey, result);
          return result;
        };
      }
      // Identify WRITE methods — clear related cache after mutation
      else if (/^(create|update|delete|set|upload|install|uninstall|publish|connect|disconnect|mark)/.test(key)) {
        dashboard[key] = async function() {
          var result = await original[key].apply(null, arguments);
          // Extract the resource name: updateBooking -> booking, createFleetType -> fleettype
          var resource = key.replace(/^(create|update|delete|set|upload|install|uninstall)/, '').toLowerCase();
          // Clear all cached gets for this resource type
          dashCacheClear('get' + resource);
          // Also clear generic gets (getProfile covers updateProfile, etc.)
          dashCacheClear('get');
          console.log('DashCache cleared after:', key);
          return result;
        };
      }
    });
  })();

  // iPhone HEIC/HEIF detection — MIME type is often empty on macOS/desktop
  // so we fall back to extension.
  function isHeicFile(file) {
    if (!file) return false;
    var t = (file.type || '').toLowerCase();
    if (t === 'image/heic' || t === 'image/heif') return true;
    return /\.hei[cf]$/i.test(file.name || '');
  }

  // Check for HEIC by magic bytes: bytes 4–7 are 'ftyp', and brand contains 'heic'/'heis'/'hevx'/'mif1'
  // Needed because iOS camera sometimes delivers HEIC with type="" or type="image/jpeg"
  async function isHeicByMagicBytes(file) {
    try {
      var buf = await file.slice(0, 12).arrayBuffer();
      var v = new Uint8Array(buf);
      // bytes 4-7 must be 'ftyp'
      if (v[4]!==0x66||v[5]!==0x74||v[6]!==0x79||v[7]!==0x70) return false;
      // major brand at bytes 8-11: heic, heis, hevx, hevc, mif1, msf1
      var brand = String.fromCharCode(v[8],v[9],v[10],v[11]);
      return /^(heic|heis|hevx|hevc|mif1|msf1)/i.test(brand);
    } catch(e) { return false; }
  }

  // Lazy-load heic2any from CDN only when a HEIC is encountered.
  var _heic2anyPromise = null;
  function loadHeic2Any() {
    if (window.heic2any) return Promise.resolve(window.heic2any);
    if (_heic2anyPromise) return _heic2anyPromise;
    _heic2anyPromise = new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = function() { window.heic2any ? resolve(window.heic2any) : reject(new Error('heic2any not available')); };
      s.onerror = function() { reject(new Error('failed to load heic2any')); };
      document.head.appendChild(s);
    });
    return _heic2anyPromise;
  }

  async function heicToJpeg(file) {
    var h = await loadHeic2Any();
    var out = await h({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    var blob = Array.isArray(out) ? out[0] : out;
    var name = (file.name || 'image').replace(/\.[^.]+$/i, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  }

  // Resize + re-encode to JPEG so uploads stay under Vercel's 4.5MB body limit
  // and cut vision-token cost on the backend. Returns { dataUrl, blob, mimeType }.
  // Transparently converts HEIC/HEIF (iPhone default) to JPEG first.
  async function compressImage(file, maxDim, quality) {
    maxDim = maxDim || 1280;
    quality = quality == null ? 0.75 : quality;
    if (isHeicFile(file) || await isHeicByMagicBytes(file)) {
      try { file = await heicToJpeg(file); }
      catch (e) { throw new Error('HEIC conversion failed: ' + e.message); }
    }
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function() { reject(new Error('read failed')); };
      reader.onload = function(e) {
        var img = new Image();
        img.onerror = function() { reject(new Error('decode failed')); };
        img.onload = function() {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, maxDim / Math.max(w, h));
          var cw = Math.round(w * scale), ch = Math.round(h * scale);
          var canvas = document.createElement('canvas');
          canvas.width = cw; canvas.height = ch;
          canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
          var dataUrl = canvas.toDataURL('image/jpeg', quality);
          canvas.toBlob(function(blob) {
            resolve({ dataUrl: dataUrl, blob: blob, mimeType: 'image/jpeg' });
          }, 'image/jpeg', quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Compress a File if it's an image; otherwise return the original (for videos, etc).
  // Returns a File/Blob suitable for FormData.
  async function compressImageFile(file, maxDim, quality) {
    if (!file) return file;
    var isImg = (file.type || '').indexOf('image/') === 0 || isHeicFile(file);
    if (!isImg) return file;
    try {
      var c = await compressImage(file, maxDim, quality);
      if (!c.blob) return file;
      var name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
      return new File([c.blob], name, { type: 'image/jpeg' });
    } catch (e) { return file; }
  }

  // Adds a search input above a <select> that live-filters its <option>s
  // as the user types. Idempotent — safe to call again after repopulating.
  function attachSelectSearch(sel, placeholder) {
    if (!sel || sel.dataset.ccSearch === '1') { if (sel) ccSyncSearchOptions(sel); return; }
    sel.dataset.ccSearch = '1';
    var input = document.createElement('input');
    input.type = 'search';
    input.placeholder = placeholder || 'Type to filter...';
    input.setAttribute('aria-label', placeholder || 'Filter list');
    input.style.cssText = 'display:block;width:100%;margin-top:6px;padding:7px 10px;' +
      'background:var(--bg);border:1px solid var(--card-border);border-radius:8px;' +
      'color:var(--text);font-size:13px;box-sizing:border-box;';
    input.addEventListener('input', function() {
      var q = (input.value || '').trim().toLowerCase();
      var any = false;
      Array.prototype.forEach.call(sel.options, function(o, i) {
        if (i === 0 && o.value === '') { o.hidden = false; return; }
        var match = !q || (o.textContent || '').toLowerCase().indexOf(q) !== -1;
        o.hidden = !match;
        if (match) any = true;
      });
      if (!any && sel.options[0]) sel.options[0].hidden = false;
    });
    if (sel.parentNode) sel.parentNode.insertBefore(input, sel.nextSibling);
    sel._ccSearchInput = input;
  }

  function ccSyncSearchOptions(sel) {
    // Re-apply current filter after options are repopulated.
    if (sel._ccSearchInput) {
      var ev = new Event('input', { bubbles: true });
      sel._ccSearchInput.dispatchEvent(ev);
    }
  }

  // ---- Public API ----
  return {
    get: get, post: post, put: put, del: del,
    login: login, signup: signup, logout: logout, getSession: getSession,
    getToken: getToken, setToken: setToken, clearToken: clearToken,
    dashboard: dashboard,
    clearDashCache: dashCacheClear,
    compressImage: compressImage,
    compressImageFile: compressImageFile,
    attachSelectSearch: attachSelectSearch,
    API_BASE: API_BASE
  };
})();
