// ============================================
// Supabase Client — Direct browser connection
// ============================================
const SUPABASE_URL = 'https://mhafixflyffflwjhcgfn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oYWZpeGZseWZmZmx3amhjZ2ZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTA4MzUsImV4cCI6MjA4NzM4NjgzNX0.3KW-rGnLhJQ1u3IsSeoGFfgQpcoJNdBGFOGnhc88tHw';

// Save CDN reference BEFORE var declaration overwrites window.supabase
var _supabaseLib = window.supabase;
var supabase = null;
try {
  if (_supabaseLib && _supabaseLib.createClient) {
    supabase = _supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error('Failed to initialize Supabase client:', e);
}
if (!supabase) {
  console.warn('Supabase client not initialized — CDN may not have loaded. Check your script tags.');
}

// Session + business cache
var _session = null;
var _business = null;
var _siteId = null;

if (supabase) {
  supabase.auth.onAuthStateChange(function(event, session) {
    if (event === 'TOKEN_REFRESHED' && session) {
      _session = session;
      return;
    }
    if (event === 'SIGNED_OUT') {
      // Don't bounce to login if we're already there (avoids reload loops),
      // and skip if a valid session is still in localStorage — Supabase
      // sometimes fires SIGNED_OUT spuriously on tab wake-up before the
      // refresh-token call completes.
      if (location.pathname.endsWith('/login.html')) return;
      var hasStoredSession = false;
      try {
        var sbKey = Object.keys(localStorage).find(function(k) {
          return k.startsWith('sb-') && k.endsWith('-auth-token');
        });
        if (sbKey) {
          var s = JSON.parse(localStorage.getItem(sbKey));
          if (s && s.access_token) hasStoredSession = true;
        }
      } catch(e) {}
      if (hasStoredSession) return;
      clearSupabaseCache();
      window.location.href = 'login.html';
    }
  });
}

async function getSupabaseSession() {
  // Always re-validate if cached session is expired
  if (_session && _session.expires_at) {
    var nowSecs = Math.floor(Date.now() / 1000);
    if (nowSecs >= _session.expires_at - 60) {
      // Within 60s of expiry or already expired — clear and re-fetch
      _session = null;
    }
  }
  if (_session) return _session;
  if (!supabase) return null;
  try {
    var { data, error } = await supabase.auth.getSession();
    if (error) { console.error('Session error:', error.message); return null; }
    if (!data.session) return null;
    _session = data.session;
    return _session;
  } catch (e) {
    console.error('Failed to get session:', e);
    return null;
  }
}

async function getSupabaseBusiness() {
  if (_business) return _business;
  var session = await getSupabaseSession();
  if (!session) return null;

  try {
    // Look up user record to get site_id
    var { data: user, error: userErr } = await supabase
      .from('users')
      .select('site_id, name, role')
      .eq('auth_id', session.user.id)
      .single();

    if (userErr || !user) {
      var email = session.user.email;
      var { data: userByEmail } = await supabase
        .from('users')
        .select('site_id, name, role')
        .eq('email', email)
        .single();
      if (!userByEmail) {
        console.error('User lookup failed by auth_id and email');
        return null;
      }
      await supabase.from('users').update({ auth_id: session.user.id }).eq('email', email);
      user = userByEmail;
    }
    _siteId = user.site_id;

    // Get business record
    var { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('*')
      .eq('site_id', user.site_id)
      .single();

    if (bizErr || !biz) {
      console.error('Business lookup failed:', bizErr ? bizErr.message : 'No business record found');
      return null;
    }

    _business = biz;
    return _business;
  } catch (e) {
    console.error('Failed to load business:', e);
    return null;
  }
}

function getSiteId() { return _siteId; }

function clearSupabaseCache() {
  _session = null;
  _business = null;
  _siteId = null;
}

async function requireSupabaseAuth() {
  var session = await getSupabaseSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// Stale flag from the old client-side inactivity timer (now removed) —
// clean it up so it doesn't sit in localStorage forever.
try { localStorage.removeItem('cc_last_active'); } catch(e) {}

// No-ops kept so existing call sites don't throw. Supabase manages session
// expiry + refresh on its own; we don't add a second timer on top.
function startInactivityWatch() {}
function stopInactivityWatch() {}
