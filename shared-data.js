/**
 * CyberCheck Shared Data Store
 *
 * All apps read/write through this.
 * In production this talks to Supabase. For now it uses localStorage
 * so data persists between page loads and flows between apps.
 *
 * Apps access this via window.parent.CyberCheck (since they're in iframes)
 * Dashboard accesses it via window.CyberCheck directly
 */

window.CyberCheck = (function() {
    const STORAGE_KEY = 'cybercheck_data';
    const DATA_VERSION = 3; // Bump this to force-reset stale localStorage

    // Default data - Beachside Circle Boats (real business)
    const DEFAULT_DATA = {
        business: {
            id: 'beachside-circle-boats',
            name: 'Beachside Circle Boat Rentals and Sales LLC',
            tagline: 'Portable Electric Circle Boat Rentals',
            type: 'rental',
            email: 'beachsideboats@myyahoo.com',
            phone: '(601) 325-1205',
            address: '25856 Canal Road, Unit A, Orange Beach, AL 36561',
            website: '',
            logo_emoji: '\u{1F6A4}',
            accent_color: '#00ada8',
            rating: 4.9,
            hours: {
                monday:    { open: '9:00 AM', close: '6:00 PM', closed: false },
                tuesday:   { open: '9:00 AM', close: '6:00 PM', closed: false },
                wednesday: { open: '9:00 AM', close: '6:00 PM', closed: false },
                thursday:  { open: '9:00 AM', close: '6:00 PM', closed: false },
                friday:    { open: '9:00 AM', close: '6:00 PM', closed: false },
                saturday:  { open: '9:00 AM', close: '6:00 PM', closed: false },
                sunday:    { open: '9:00 AM', close: '6:00 PM', closed: false }
            }
        },

        user: {
            id: 'user_beachside_001',
            name: 'Beachside Owner',
            email: 'beachsideboats@myyahoo.com',
            role: 'owner'
        },

        installed_apps: ['booking', 'sms', 'loyalty', 'biopage', 'ai-training', 'business-details'],

        connected_tools: {
            stripe: { connected: false },
            square: { connected: false },
            clover: { connected: false },
            google_calendar: { connected: false },
            gmail: { connected: false },
            instagram: { connected: false },
            facebook: { connected: false },
            google_business: { connected: false },
            twilio: { connected: false },
            twitter: { connected: false },
            tiktok: { connected: false }
        },

        menu_items: [],

        customers: [],

        bookings: [],

        orders: [],

        sms_templates: {
            booking_confirmation: {
                enabled: true,
                template: "Hi {customer_name}! Your {service} at {business_name} is confirmed for {date} at {time}. Reply CHANGE to reschedule.",
                sent_count: 0
            },
            day_of_reminder: {
                enabled: true,
                template: "Reminder: Your {service} is today at {time}! We look forward to seeing you at {business_name}. Reply HELP for directions.",
                sent_count: 0
            },
            day_after_review: {
                enabled: true,
                template: "Hi {customer_name}! How was your {service} yesterday? We'd love your feedback: {review_link}",
                sent_count: 0
            },
            digital_receipt: {
                enabled: true,
                template: "Receipt from {business_name}\n{items}\nTotal: {total}\nThank you, {customer_name}!",
                sent_count: 0
            }
        },

        ai_training: {
            business_type: 'rental',
            completion: 0,
            answers: [
                { category: 'basics', question: 'Tell me about your business', answer: '', completed: false },
                { category: 'basics', question: 'What is your business known for?', answer: '', completed: false },
                { category: 'products', question: 'What types of boats do you rent?', answer: '', completed: false },
                { category: 'products', question: 'What are your rental rates?', answer: '', completed: false },
                { category: 'policies', question: 'What is your cancellation policy?', answer: '', completed: false },
                { category: 'policies', question: 'Do renters need a boating license?', answer: '', completed: false },
                { category: 'faqs', question: 'How many people can fit on a boat?', answer: '', completed: false },
                { category: 'personality', question: 'How should the AI greet customers?', answer: '', completed: false }
            ]
        },

        biopage: {
            accent_color: '#00ada8',
            about_text: 'Rent a portable, eco-friendly circle boat. No license needed, no experience required. Just show up and cruise. Dog friendly!',
            team_members: [],
            gallery_photos: [
                { id: 1, emoji: '\u{1F6A4}', caption: 'Single Seater Circle Boat' },
                { id: 2, emoji: '\u{1F6A4}', caption: 'Double Seater Circle Boat' },
                { id: 3, emoji: '\u{1F30A}', caption: 'Cruising the canal' },
                { id: 4, emoji: '\u{2600}\u{FE0F}', caption: 'Perfect day on the water' },
                { id: 5, emoji: '\u{1F436}', caption: 'Dog friendly boats' },
                { id: 6, emoji: '\u{1F333}', caption: 'Eco-friendly electric' }
            ],
            custom_links: {},
            social_feed_settings: {
                instagram: { show_feed: true, display: 'grid', count: 6 },
                facebook: { show_feed: true, display: 'list', count: 3 },
                google: { show_feed: true, display: 'list', count: 6 },
                tiktok: { show_feed: false, display: 'grid', count: 3 }
            },
            links: [
                { id: 'about', label: 'About Us', icon: '\u2139\uFE0F', enabled: true, type: 'modal' },
                { id: 'fleet', label: 'Our Fleet', icon: '\u{1F6A4}', enabled: true, type: 'modal' },
                { id: 'booking', label: 'Book a Boat', icon: '\u{1F4C5}', enabled: true, type: 'app', app: 'booking' },
                { id: 'photos', label: 'View Photos', icon: '\u{1F4F8}', enabled: true, type: 'modal' },
                { id: 'reviews', label: 'Reviews', icon: '\u2B50', enabled: true, type: 'modal' },
                { id: 'call', label: 'Call Now', icon: '\u{1F4DE}', enabled: true, type: 'tel' },
                { id: 'website', label: 'Visit Website', icon: '\u{1F310}', enabled: true, type: 'url' },
                { id: 'loyalty', label: 'Loyalty Rewards', icon: '\u2B50', enabled: false, type: 'app', app: 'loyalty' }
            ]
        },

        social_posts: []
    };

    // Load from localStorage or use defaults
    // If version doesn't match, wipe stale data and start fresh
    function load() {
        try {
            const ver = localStorage.getItem(STORAGE_KEY + '_version');
            if (ver && parseInt(ver) === DATA_VERSION) {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) return JSON.parse(stored);
            } else {
                // Version mismatch — clear old data
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            console.warn('CyberCheck: Could not load stored data, using defaults');
        }
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }

    // Save to localStorage
    function save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            localStorage.setItem(STORAGE_KEY + '_version', DATA_VERSION);
        } catch (e) {
            console.warn('CyberCheck: Could not save data');
        }
        // Notify all iframes that data changed
        broadcast('data_updated');
    }

    // Broadcast message to all iframes
    function broadcast(type, payload) {
        const frames = document.querySelectorAll('iframe');
        frames.forEach(frame => {
            try {
                frame.contentWindow.postMessage({ type: type, payload: payload }, '*');
            } catch (e) {}
        });
    }

    let _data = load();

    return {
        // Get any data path: CyberCheck.get('business.name') or CyberCheck.get('menu_items')
        get: function(path) {
            if (!path) return _data;
            const keys = path.split('.');
            let val = _data;
            for (const key of keys) {
                if (val === undefined || val === null) return undefined;
                val = val[key];
            }
            return val;
        },

        // Set any data path: CyberCheck.set('business.name', 'New Name')
        set: function(path, value) {
            const keys = path.split('.');
            let obj = _data;
            for (let i = 0; i < keys.length - 1; i++) {
                if (obj[keys[i]] === undefined) obj[keys[i]] = {};
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
            save(_data);
            return value;
        },

        // Get full data object
        getAll: function() {
            return _data;
        },

        // Menu helpers
        getMenuItems: function(category) {
            if (category && category !== 'all') {
                return _data.menu_items.filter(i => i.category === category);
            }
            return _data.menu_items;
        },

        addMenuItem: function(item) {
            item.id = _data.menu_items.length > 0 ? Math.max(..._data.menu_items.map(i => i.id), 0) + 1 : 1;
            _data.menu_items.push(item);
            save(_data);
            return item;
        },

        updateMenuItem: function(id, updates) {
            const idx = _data.menu_items.findIndex(i => i.id === id);
            if (idx !== -1) {
                Object.assign(_data.menu_items[idx], updates);
                save(_data);
            }
        },

        deleteMenuItem: function(id) {
            _data.menu_items = _data.menu_items.filter(i => i.id !== id);
            save(_data);
        },

        // Customer helpers
        getCustomer: function(id) {
            return _data.customers.find(c => c.id === id);
        },

        getCustomersByTier: function(tier) {
            return _data.customers.filter(c => c.tier === tier);
        },

        // Booking helpers
        getBookingsForDate: function(date) {
            return _data.bookings.filter(b => b.date === date);
        },

        addBooking: function(booking) {
            booking.id = _data.bookings.length > 0 ? Math.max(..._data.bookings.map(b => b.id), 0) + 1 : 1;
            _data.bookings.push(booking);
            save(_data);
            return booking;
        },

        // Order helpers
        getOrdersByStatus: function(status) {
            if (status === 'all') return _data.orders;
            return _data.orders.filter(o => o.status === status);
        },

        addOrder: function(order) {
            order.id = _data.orders.length > 0 ? Math.max(..._data.orders.map(o => o.id), 0) + 1 : 1;
            _data.orders.push(order);
            save(_data);
            return order;
        },

        updateOrderStatus: function(id, status) {
            const order = _data.orders.find(o => o.id === id);
            if (order) {
                order.status = status;
                save(_data);
            }
        },

        // SMS template helpers
        getSMSTemplate: function(type) {
            return _data.sms_templates[type];
        },

        updateSMSTemplate: function(type, template) {
            _data.sms_templates[type] = template;
            save(_data);
        },

        // AI training helpers
        getTrainingAnswers: function(category) {
            if (category) {
                return _data.ai_training.answers.filter(a => a.category === category);
            }
            return _data.ai_training.answers;
        },

        saveTrainingAnswer: function(question, answer) {
            const item = _data.ai_training.answers.find(a => a.question === question);
            if (item) {
                item.answer = answer;
                item.completed = true;
            }
            // Recalculate completion
            const total = _data.ai_training.answers.length;
            const done = _data.ai_training.answers.filter(a => a.completed).length;
            _data.ai_training.completion = Math.round((done / total) * 100);
            save(_data);
        },

        // Bio page helpers
        getBioLinks: function() {
            return _data.biopage.links.filter(l => l.enabled);
        },

        toggleBioLink: function(id, enabled) {
            const link = _data.biopage.links.find(l => l.id === id);
            if (link) {
                link.enabled = enabled;
                save(_data);
            }
        },

        // App helpers
        isAppInstalled: function(appId) {
            return _data.installed_apps.includes(appId);
        },

        isToolConnected: function(toolId) {
            return _data.connected_tools[toolId]?.connected || false;
        },

        // Reset to defaults (clears localStorage, reloads real Beachside data)
        reset: function() {
            _data = JSON.parse(JSON.stringify(DEFAULT_DATA));
            save(_data);
            broadcast('data_reset');
        },

        // For iframes to get data from parent
        _broadcast: broadcast
    };
})();

// Helper for iframe apps to access shared data
// They call: const data = getCyberCheck()
function getCyberCheck() {
    if (window.CyberCheck) return window.CyberCheck;
    if (window.parent && window.parent.CyberCheck) return window.parent.CyberCheck;
    console.warn('CyberCheck shared data not available');
    return null;
}
