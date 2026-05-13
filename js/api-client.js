/**
 * CyberCheck API Client
 * Handles all HTTP requests to the backend API
 */

class APIClient {
  constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    // Use AuthManager's token if available, otherwise fall back to old token
    this.token = this.getToken();
  }

  /**
   * Get authentication token from AuthManager or localStorage
   */
  getToken() {
    if (window.AuthManager) {
      return window.AuthManager.getToken();
    }
    // Fallback for backward compatibility
    return localStorage.getItem('cybercheck_token') || localStorage.getItem('auth_token');
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    if (window.AuthManager) {
      // AuthManager handles storage
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.setItem('cybercheck_token', token);
    }
  }

  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    if (window.AuthManager) {
      window.AuthManager.clearAuth();
    } else {
      localStorage.removeItem('cybercheck_token');
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Make HTTP request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      ...options.headers
    };

    // Add auth token if available
    if (this.token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Add Content-Type for JSON requests
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * GET request
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // ======================
  // Auth APIs
  // ======================

  async login(email, password) {
    const data = await this.post('/auth/login', { email, password }, { skipAuth: true });
    if (data.success) {
      this.setToken(data.data.access_token);
    }
    return data;
  }

  async register(userData) {
    const data = await this.post('/auth/register', userData, { skipAuth: true });
    if (data.success) {
      this.setToken(data.data.access_token);
    }
    return data;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } finally {
      this.clearToken();
    }
  }

  async refreshToken() {
    const data = await this.post('/auth/refresh');
    if (data.success) {
      this.setToken(data.data.access_token);
    }
    return data;
  }

  // ======================
  // Business APIs
  // ======================

  async getMyBusiness() {
    return this.get('/businesses/me');
  }

  async updateBusiness(updates) {
    return this.put('/businesses/me', updates);
  }

  // ======================
  // Voice Notes APIs
  // ======================

  async getVoiceNotes(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/voice-notes${query ? `?${query}` : ''}`);
  }

  async getVoiceNote(id) {
    return this.get(`/voice-notes/${id}`);
  }

  async uploadVoiceNote(formData) {
    return this.request('/voice-notes/upload', {
      method: 'POST',
      body: formData // FormData, don't set Content-Type
    });
  }

  async processVoiceNote(id) {
    return this.post(`/voice-notes/${id}/process`);
  }

  async getVoiceNoteJobStatus(jobId) {
    return this.get(`/voice-notes/queue/job/${jobId}`);
  }

  async getVoiceNoteQueueStats() {
    return this.get('/voice-notes/queue/stats');
  }

  async updateVoiceNote(id, data) {
    return this.put(`/voice-notes/${id}`, data);
  }

  async deleteVoiceNote(id) {
    return this.delete(`/voice-notes/${id}`);
  }

  async getVoiceNoteContacts(id) {
    return this.get(`/voice-notes/${id}/contacts`);
  }

  async createContactFromVoiceNote(id) {
    return this.post(`/voice-notes/${id}/create-contact`);
  }

  async getVoiceNoteStats() {
    return this.get('/voice-notes/stats/summary');
  }

  // ======================
  // Reviews APIs
  // ======================

  async getReviews(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/reviews${query ? `?${query}` : ''}`);
  }

  async getReview(id) {
    return this.get(`/reviews/${id}`);
  }

  async createReview(formData) {
    return this.request('/reviews', {
      method: 'POST',
      body: formData
    });
  }

  async approveReview(id) {
    return this.put(`/reviews/${id}/approve`);
  }

  async rejectReview(id, reason) {
    return this.put(`/reviews/${id}/reject`, { rejection_reason: reason });
  }

  async respondToReview(id, responseText) {
    return this.post(`/reviews/${id}/respond`, { response_text: responseText });
  }

  async getReviewQueueStats() {
    return this.get('/reviews/queue/stats');
  }

  // ======================
  // Profiles APIs
  // ======================

  async getProfiles(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/profiles${query ? `?${query}` : ''}`);
  }

  async getProfile(id) {
    return this.get(`/profiles/${id}`);
  }

  async createProfile(profileData) {
    return this.post('/profiles', profileData);
  }

  async updateProfile(id, updates) {
    return this.put(`/profiles/${id}`, updates);
  }

  async deleteProfile(id) {
    return this.delete(`/profiles/${id}`);
  }

  // ======================
  // SMS APIs
  // ======================

  async sendTestSMS(phone = null) {
    return this.post('/sms/test', phone ? { phone } : {});
  }

  async getSMSConfig() {
    return this.get('/sms/config');
  }

  async updateSMSConfig(config) {
    return this.put('/sms/config', config);
  }

  async testCustomTwilio(credentials) {
    return this.post('/sms/test-custom', credentials);
  }

  async toggleSMSNotifications(enabled) {
    return this.post('/sms/toggle-notifications', { enabled });
  }

  // ======================
  // Billing APIs
  // ======================

  async getSubscription() {
    return this._fetch('/billing/subscription');
  }

  async getPlans() {
    return this._fetch('/billing/plans');
  }

  async createCheckoutSession(planId) {
    return this._fetch('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId })
    });
  }

  async createPortalSession() {
    return this._fetch('/billing/portal', {
      method: 'POST'
    });
  }

  async getUsageStats(startDate = null, endDate = null) {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const query = Object.keys(params).length > 0
      ? '?' + new URLSearchParams(params).toString()
      : '';

    return this._fetch(`/billing/usage${query}`);
  }

  async getUsageHistory(days = 30) {
    return this._fetch(`/billing/usage/history?days=${days}`);
  }

  async getInvoices() {
    return this._fetch('/billing/invoices');
  }

  // ======================
  // Analytics APIs (Placeholder)
  // ======================

  async getDashboardStats() {
    const [voiceNotes, reviews] = await Promise.all([
      this.getVoiceNotes({ limit: 1 }),
      this.getReviews({ limit: 1 })
    ]);

    // Calculate basic stats from available data
    return {
      success: true,
      data: {
        voice_notes_count: 0, // Would come from count query
        reviews_count: 0,
        avg_rating: 0,
        monthly_usage: 0
      }
    };
  }
}

// Create global instance
const api = new APIClient();

// Check if user is logged in
function isLoggedIn() {
  if (window.AuthManager) {
    return window.AuthManager.isAuthenticated();
  }
  return !!api.token;
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/pages/auth/login.html';
  }
}
