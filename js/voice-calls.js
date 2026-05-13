/**
 * Voice Calls Dashboard
 * Displays call history, transcripts, action plans, and execution logs
 */

import { getCurrentUser } from './shared/auth.js';
import { apiFetch } from './shared/api.js';

let calls = [];
let currentFilter = 'all';

/**
 * Initialize dashboard
 */
async function init() {
  try {
    // Load user
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = '/pages/auth/login.html';
      return;
    }

    // Update user menu
    document.getElementById('userName').textContent = user.full_name || user.email;

    // Set up event listeners
    setupEventListeners();

    // Load data
    await loadCalls();
    updateStats();
  } catch (error) {
    console.error('Init error:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('cybercheck_token');
    window.location.href = '/pages/auth/login.html';
  });

  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Apply filter
      currentFilter = btn.dataset.status;
      renderCalls();
    });
  });
}

/**
 * Load voice calls
 */
async function loadCalls() {
  try {
    const response = await apiFetch('/voice/calls?limit=50');

    if (response.success) {
      calls = response.data || [];
      renderCalls();

      // Show setup instructions if no calls
      if (calls.length === 0) {
        document.getElementById('setupInstructions').style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Load calls error:', error);
    document.getElementById('callsList').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-exclamation-circle"></i></div>
        <h3>Failed to load calls</h3>
        <p style="color: #718096; margin-top: 8px;">${error.message || 'Please try again later'}</p>
      </div>
    `;
  }
}

/**
 * Render calls list
 */
function renderCalls() {
  const container = document.getElementById('callsList');

  // Filter calls
  let filteredCalls = calls;
  if (currentFilter !== 'all') {
    filteredCalls = calls.filter(call => call.status === currentFilter);
  }

  if (filteredCalls.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-phone-slash"></i></div>
        <h3>No ${currentFilter === 'all' ? '' : currentFilter} calls yet</h3>
        <p style="color: #718096; margin-top: 8px;">
          ${currentFilter === 'all' ? 'Voice calls will appear here once you start using the Voice Assistant' : `No ${currentFilter} calls found`}
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredCalls.map(call => renderCallCard(call)).join('');
}

/**
 * Render single call card
 */
function renderCallCard(call) {
  const statusClass = `status-${call.status}`;
  const statusIcon = call.status === 'completed' ? 'check-circle' :
                     call.status === 'processing' ? 'spinner fa-spin' :
                     call.status === 'failed' ? 'exclamation-circle' :
                     'phone';

  const callDate = new Date(call.created_at);
  const duration = call.duration ? `${call.duration}s` : 'N/A';
  const confidence = call.confidence ? (call.confidence * 100).toFixed(0) : 0;

  return `
    <div class="call-card">
      <!-- Header -->
      <div class="call-header">
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            ${call.intent ? `
              <div class="intent-badge">
                <i class="fas fa-brain"></i>
                ${formatIntent(call.intent)}
              </div>
            ` : ''}
            <span class="status-badge ${statusClass}">
              <i class="fas fa-${statusIcon}"></i>
              ${call.status}
            </span>
          </div>
          ${call.confidence ? `
            <div class="confidence-meter" style="margin-top: 12px; max-width: 300px;">
              <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${confidence}%;"></div>
              </div>
              <div class="confidence-value">${confidence}%</div>
            </div>
          ` : ''}
        </div>
        <div style="text-align: right; color: #718096; font-size: 13px;">
          <div><i class="far fa-clock"></i> ${callDate.toLocaleString()}</div>
        </div>
      </div>

      <!-- Meta Info -->
      <div class="call-meta">
        <div class="meta-item">
          <i class="fas fa-phone"></i>
          <strong>From:</strong> ${formatPhoneNumber(call.from_number)}
        </div>
        <div class="meta-item">
          <i class="fas fa-hashtag"></i>
          <strong>Call ID:</strong> ${call.call_sid.substring(0, 12)}...
        </div>
        ${call.duration ? `
          <div class="meta-item">
            <i class="fas fa-stopwatch"></i>
            <strong>Duration:</strong> ${duration}
          </div>
        ` : ''}
      </div>

      <!-- Transcript -->
      ${call.transcript ? `
        <div class="transcript-box">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <i class="fas fa-quote-left" style="color: #667eea;"></i>
            <strong style="color: #4a5568;">Transcript</strong>
          </div>
          <div class="transcript-text">"${call.transcript}"</div>
        </div>
      ` : ''}

      <!-- Entities -->
      ${call.entities && Object.keys(call.entities).length > 0 ? `
        <div style="margin-bottom: 16px;">
          <strong style="color: #4a5568; font-size: 14px; display: block; margin-bottom: 8px;">
            <i class="fas fa-tags"></i> Extracted Data:
          </strong>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${Object.entries(call.entities).map(([key, value]) => `
              <span style="background: #f7fafc; padding: 6px 12px; border-radius: 6px; font-size: 13px; color: #4a5568;">
                <strong>${key}:</strong> ${JSON.stringify(value)}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Response -->
      ${call.response_text ? `
        <div class="response-box">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <i class="fas fa-robot" style="color: #10b981;"></i>
            <strong style="color: #2d3748;">AI Response</strong>
          </div>
          <div class="response-text">${call.response_text}</div>
        </div>
      ` : ''}

      <!-- Action Plan (if available) -->
      ${call.action_plan_id ? `
        <div class="action-plan">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <i class="fas fa-tasks" style="color: #667eea; font-size: 18px;"></i>
            <strong style="color: #2d3748; font-size: 15px;">Action Plan</strong>
          </div>
          <div id="actions-${call.id}">
            <div style="text-align: center; padding: 12px; color: #718096; font-size: 13px;">
              <i class="fas fa-spinner fa-spin"></i> Loading actions...
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Error Message -->
      ${call.error_message ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-top: 16px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
            <strong style="color: #991b1b;">Error</strong>
          </div>
          <p style="font-size: 14px; color: #7f1d1d; margin: 0;">${call.error_message}</p>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Format intent for display
 */
function formatIntent(intent) {
  const intentMap = {
    'update_hours': 'Update Hours',
    'send_sms': 'Send SMS',
    'create_event': 'Create Event',
    'update_status': 'Update Status',
    'add_special': 'Add Special',
    'get_status': 'Get Status',
    'unknown': 'Unknown'
  };

  return intentMap[intent] || intent;
}

/**
 * Format phone number
 */
function formatPhoneNumber(number) {
  if (!number) return 'Unknown';

  // Format +1234567890 as (123) 456-7890
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `(${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }

  return number;
}

/**
 * Update statistics
 */
function updateStats() {
  const totalCalls = calls.length;
  const completedCalls = calls.filter(c => c.status === 'completed').length;

  // Calculate total actions executed (would need to fetch from action_logs)
  const actionsExecuted = calls.filter(c => c.action_plan_id).length;

  // Calculate average confidence
  const callsWithConfidence = calls.filter(c => c.confidence);
  const avgConfidence = callsWithConfidence.length > 0
    ? (callsWithConfidence.reduce((sum, c) => sum + c.confidence, 0) / callsWithConfidence.length * 100).toFixed(0)
    : 0;

  document.getElementById('totalCalls').textContent = totalCalls;
  document.getElementById('completedCalls').textContent = completedCalls;
  document.getElementById('actionsExecuted').textContent = actionsExecuted;
  document.getElementById('avgConfidence').textContent = `${avgConfidence}%`;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
