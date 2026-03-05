// ============================================
// CyberCheck Analytics Tracking Script
// Add this to the <head> section of your website
// ============================================

(function() {
  // Configuration
  var SUBDOMAIN = 'beachside-circle-boats'; // Replace with your subdomain
  var API_BASE = window.location.origin.indexOf('localhost') > -1
    ? 'http://localhost:3001'
    : window.location.origin;

  // Session management
  var sessionId = getSessionId();
  var pageStartTime = Date.now();

  // Track page view on load
  if (document.readyState === 'complete') {
    trackPageView();
  } else {
    window.addEventListener('load', trackPageView);
  }

  // Track page duration on unload
  window.addEventListener('beforeunload', function() {
    var duration = Math.round((Date.now() - pageStartTime) / 1000);
    sendBeacon('/api/analytics/duration', { duration: duration });
  });

  // Expose tracking functions globally
  window.ccTrack = {
    pageView: trackPageView,
    conversion: trackConversion,
    event: trackEvent
  };

  // ---- Functions ----

  function getSessionId() {
    var stored = sessionStorage.getItem('cc_session_id');
    if (stored) return stored;

    var newId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    sessionStorage.setItem('cc_session_id', newId);
    return newId;
  }

  function getUTMParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
      utm_term: params.get('utm_term') || null,
      utm_content: params.get('utm_content') || null
    };
  }

  function getDeviceInfo() {
    var ua = navigator.userAgent;
    var device = 'desktop';
    if (/Mobile|Android|iPhone/i.test(ua)) device = 'mobile';
    else if (/iPad|Tablet/i.test(ua)) device = 'tablet';

    var browser = 'Unknown';
    if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (ua.indexOf('Safari') > -1) browser = 'Safari';
    else if (ua.indexOf('Edge') > -1) browser = 'Edge';

    var os = 'Unknown';
    if (ua.indexOf('Windows') > -1) os = 'Windows';
    else if (ua.indexOf('Mac') > -1) os = 'MacOS';
    else if (ua.indexOf('Linux') > -1) os = 'Linux';
    else if (ua.indexOf('Android') > -1) os = 'Android';
    else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS';

    return { device_type: device, browser: browser, os: os };
  }

  function trackPageView() {
    var utm = getUTMParams();
    var device = getDeviceInfo();

    var data = {
      subdomain: SUBDOMAIN,
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer || null,
      session_id: sessionId,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      utm_term: utm.utm_term,
      utm_content: utm.utm_content,
      device_type: device.device_type,
      browser: device.browser,
      os: device.os
    };

    sendRequest('/api/analytics/pageview', data);
  }

  function trackConversion(type, data) {
    // type: 'booking', 'contact', 'signup', 'purchase'
    var utm = getUTMParams();

    var payload = {
      subdomain: SUBDOMAIN,
      conversion_type: type,
      session_id: sessionId,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      referrer: document.referrer || null,
      conversion_value: data.value || 0,
      revenue: data.revenue || 0,
      customer_email: data.email || null,
      customer_name: data.name || null,
      booking_id: data.booking_id || null,
      metadata: data.metadata || null
    };

    sendRequest('/api/analytics/conversion', payload);
  }

  function trackEvent(eventName, data) {
    var payload = {
      subdomain: SUBDOMAIN,
      event_name: eventName,
      session_id: sessionId,
      event_data: data || {}
    };

    sendRequest('/api/analytics/event', payload);
  }

  function sendRequest(endpoint, data) {
    if (navigator.sendBeacon) {
      sendBeacon(endpoint, data);
    } else {
      // Fallback to fetch
      fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(function() {
        // Silent fail
      });
    }
  }

  function sendBeacon(endpoint, data) {
    var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    navigator.sendBeacon(API_BASE + endpoint, blob);
  }

  // Store first touch attribution
  var firstTouch = localStorage.getItem('cc_first_touch');
  if (!firstTouch && document.referrer) {
    var utm = getUTMParams();
    var attribution = {
      source: utm.utm_source || getReferrerSource(document.referrer),
      medium: utm.utm_medium || 'referral',
      timestamp: Date.now()
    };
    localStorage.setItem('cc_first_touch', JSON.stringify(attribution));
  }

  function getReferrerSource(referrer) {
    if (!referrer) return 'direct';
    if (referrer.indexOf('google.com') > -1) return 'google';
    if (referrer.indexOf('facebook.com') > -1) return 'facebook';
    if (referrer.indexOf('instagram.com') > -1) return 'instagram';
    if (referrer.indexOf('twitter.com') > -1 || referrer.indexOf('t.co') > -1) return 'twitter';
    if (referrer.indexOf('tiktok.com') > -1) return 'tiktok';
    return 'referral';
  }

  console.log('📊 CyberCheck Analytics loaded - Session:', sessionId);
})();

// Usage Examples:
//
// 1. Track page views (automatic on load)
//
// 2. Track conversions:
//    ccTrack.conversion('booking', {
//      value: 225,
//      revenue: 225,
//      email: 'customer@email.com',
//      name: 'John Doe',
//      booking_id: 'abc123'
//    });
//
// 3. Track custom events:
//    ccTrack.event('button_click', { button_name: 'Book Now' });
//    ccTrack.event('video_play', { video_title: 'Circle Boat Tour' });
