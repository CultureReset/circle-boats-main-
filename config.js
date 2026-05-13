// CyberCheck Platform — Multi-tenant config
// Loads from URL parameter first, then falls back to session

const USER_CONFIG = {
    user_id: '',
    user_name: '',
    user_email: '',
    business_id: '',
    business_name: '',
    business_type: '',
    installed_apps: [],
    connected_tools: [],
    plan: 'free',
    plan_price: 0,
    features: {},
    notifications: { email: true, sms: true, in_app: true },
    _fromApi: false
};

// Known business mappings (subdomain → site_id)
const BUSINESS_MAP = {
    'beachside-circle-boats': '22222222-2222-2222-2222-222222222222'
};

// Extract user subdomain from URL parameter
function getUserSubdomainFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('user') || null;
}

// Try to load live session from backend API
// If URL parameter is provided, use that to determine which business to load
// Otherwise fall back to session
async function initConfig() {
    // First priority: URL parameter determines the business
    const userSubdomain = getUserSubdomainFromURL();
    if (userSubdomain) {
        // Check if we have a known mapping for this subdomain
        if (BUSINESS_MAP[userSubdomain]) {
            const siteId = BUSINESS_MAP[userSubdomain];
            USER_CONFIG.business_id = siteId;
            USER_CONFIG._fromApi = true;

            // Try to get business data from Supabase
            if (window.supabase) {
                try {
                    const { data: biz } = await window.supabase
                        .from('businesses')
                        .select('site_id, name, type')
                        .eq('site_id', siteId)
                        .single();

                    if (biz) {
                        USER_CONFIG.business_name = biz.name;
                        USER_CONFIG.business_type = biz.type || 'rental';
                    }
                } catch(e) {
                    console.warn('Failed to load business details:', e);
                    // Use defaults based on subdomain
                    USER_CONFIG.business_name = userSubdomain.replace(/-/g, ' ');
                    USER_CONFIG.business_type = 'rental';
                }
            }

            const sidebarName = document.getElementById('sidebar-biz-name');
            if (sidebarName) sidebarName.textContent = USER_CONFIG.business_name;

            const sidebarType = document.getElementById('sidebar-biz-type');
            if (sidebarType) sidebarType.textContent = USER_CONFIG.business_type.charAt(0).toUpperCase() + USER_CONFIG.business_type.slice(1);

            syncToSharedStore();
            console.log(`CC: Loaded business from URL: ${USER_CONFIG.business_name} (ID: ${USER_CONFIG.business_id})`);
            return USER_CONFIG;
        }
    }

    // Second try: get session from Supabase/token
    const session = await CC.getSession();
    if (session && session.user && session.business) {
        USER_CONFIG.user_id = session.user.id;
        USER_CONFIG.user_name = session.user.name;
        USER_CONFIG.user_email = session.user.email;
        USER_CONFIG.business_id = session.business.site_id;
        USER_CONFIG.business_name = session.business.name;
        USER_CONFIG.business_type = session.business.type;
        USER_CONFIG.plan = session.business.plan || 'free';
        USER_CONFIG._fromApi = true;
        syncToSharedStore();
        console.log(`CC: Loaded session for ${USER_CONFIG.business_name}`);
        return USER_CONFIG;
    }

    console.log('CC: No session or URL user parameter found');
    syncToSharedStore();
    return USER_CONFIG;
}

// Push USER_CONFIG into CyberCheck shared data store
// so all tabs/apps read from the same source
function syncToSharedStore() {
    if (!window.CyberCheck) return;
    CyberCheck.set('business.name', USER_CONFIG.business_name);
    CyberCheck.set('business.type', USER_CONFIG.business_type);
    CyberCheck.set('business.id', USER_CONFIG.business_id);
    CyberCheck.set('user.name', USER_CONFIG.user_name);
    CyberCheck.set('user.email', USER_CONFIG.user_email);
    CyberCheck.set('user.id', USER_CONFIG.user_id);
}
