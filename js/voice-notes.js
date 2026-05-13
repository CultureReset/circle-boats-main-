// ============================================
// Voice AI CRM - Talk Naturally, Organize Automatically
// ============================================

import { requireAuth, getToken } from './shared/auth.js';
import { apiGet, apiPost, apiDelete } from './shared/api.js';

// State management
const voiceState = {
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  recordingStartTime: null,
  recordingInterval: null,
  notes: [],
  customFields: [],
  useRealData: true, // Set to false for demo mode
  currentView: 'table', // 'table' or 'card'
  searchQuery: ''
};

// Sample data for demo (in production, this comes from database)
const sampleNotes = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    audioUrl: null,
    transcript: "Just met John Smith from ABC Construction. He's interested in our premium package, budget around $10,000. Has a crew of 15 people. Wants to start next month. Call him back on Tuesday afternoon at his office number 555-0123.",
    extractedData: {
      contact: {
        name: "John Smith",
        company: "ABC Construction",
        phone: "555-0123",
        email: null
      },
      details: {
        interest: "Premium package",
        budget: "$10,000",
        teamSize: "15 people",
        startDate: "Next month"
      },
      followUp: {
        when: "Tuesday afternoon",
        action: "Call back",
        notes: "Call at office number"
      },
      calendar: null
    },
    confidence: 0.94
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 86400000), // 1 day ago
    audioUrl: null,
    transcript: "VIP customer Sarah loves the outside patio seating. Always orders the chargrilled oysters and key lime pie. Prefers rosé wine. Coming in this Friday at 7 PM for anniversary dinner. Add reminder to my calendar Friday 6:30 PM to prepare VIP table.",
    extractedData: {
      contact: {
        name: "Sarah",
        company: null,
        phone: null,
        email: null,
        vip: true
      },
      details: {
        preferences: ["Outside patio seating", "Chargrilled oysters", "Key lime pie", "Rosé wine"],
        occasion: "Anniversary dinner",
        reservationDate: "Friday 7 PM"
      },
      followUp: null,
      calendar: {
        title: "Prepare VIP table for Sarah",
        date: "Friday",
        time: "6:30 PM",
        description: "VIP anniversary dinner - prefer patio, oysters & key lime pie ready"
      }
    },
    confidence: 0.97
  }
];

// ============================================
// Recording Functions
// ============================================

async function toggleRecording() {
  if (voiceState.isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    voiceState.mediaRecorder = new MediaRecorder(stream);
    voiceState.audioChunks = [];

    voiceState.mediaRecorder.ondataavailable = (event) => {
      voiceState.audioChunks.push(event.data);
    };

    voiceState.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(voiceState.audioChunks, { type: 'audio/webm' });
      processVoiceNote(audioBlob);
    };

    voiceState.mediaRecorder.start();
    voiceState.isRecording = true;
    voiceState.recordingStartTime = Date.now();

    // Update UI
    const recordBtn = document.getElementById('recordBtn');
    recordBtn.classList.add('recording');
    recordBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
      Recording...
    `;

    document.getElementById('recordingIndicator').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';

    // Start timer
    updateRecordingTime();
    voiceState.recordingInterval = setInterval(updateRecordingTime, 1000);

  } catch (error) {
    console.error('Error starting recording:', error);
    alert('Could not access microphone. Please check permissions.');
  }
}

function updateRecordingTime() {
  const elapsed = Math.floor((Date.now() - voiceState.recordingStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  document.getElementById('recordingTime').textContent =
    `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function stopRecording() {
  if (voiceState.mediaRecorder && voiceState.isRecording) {
    voiceState.mediaRecorder.stop();
    voiceState.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    voiceState.isRecording = false;

    clearInterval(voiceState.recordingInterval);

    // Update UI
    const recordBtn = document.getElementById('recordBtn');
    recordBtn.classList.remove('recording');
    recordBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
      Start Recording
    `;

    document.getElementById('recordingIndicator').style.display = 'none';
  }
}

function handleAudioUpload(event) {
  const file = event.target.files[0];
  if (file) {
    processVoiceNote(file);
  }
}

// ============================================
// Voice Note Processing (AI Simulation)
// ============================================

async function processVoiceNote(audioBlob) {
  // Show processing UI
  document.getElementById('processingCard').style.display = 'block';

  // Animate processing steps
  simulateProcessingAnimation();

  try {
    if (voiceState.useRealData) {
      // Real API upload
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const token = getToken();
      const response = await fetch('/api/voice-notes/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Poll for completion (voice notes are processed asynchronously via queue)
      if (result.success) {
        await pollForProcessing(result.data.id);
        await loadVoiceNotes(); // Reload all notes
      }
    } else {
      // Demo mode with mock data
      await delay(4500);
      const mockResult = await simulateAIExtraction(audioBlob);
      addNoteToList(mockResult);
    }
  } catch (error) {
    console.error('Failed to process voice note:', error);
    alert('Failed to process voice note: ' + error.message);
  } finally {
    // Hide processing UI
    document.getElementById('processingCard').style.display = 'none';

    // Reset steps
    setTimeout(() => {
      document.getElementById('step1').classList.remove('active');
      document.getElementById('step2').classList.remove('active');
      document.getElementById('step3').classList.remove('active');
    }, 500);

    // Reset file input
    document.getElementById('audioInput').value = '';
  }
}

async function simulateProcessingAnimation() {
  // Step 1: Transcribing (active immediately)
  document.getElementById('step1').classList.add('active');
  await delay(1500);

  // Step 2: Extracting data
  document.getElementById('step2').classList.add('active');
  await delay(1800);

  // Step 3: Organizing
  document.getElementById('step3').classList.add('active');
}

async function pollForProcessing(voiceNoteId, maxAttempts = 30) {
  // Poll every 2 seconds for up to 60 seconds
  for (let i = 0; i < maxAttempts; i++) {
    await delay(2000);

    try {
      const response = await api.getVoiceNotes();
      const note = response.data.find(n => n.id === voiceNoteId);

      if (note && note.status === 'completed') {
        return note;
      }

      if (note && note.status === 'failed') {
        throw new Error('Voice note processing failed');
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  throw new Error('Processing timeout');
}

// Load voice notes from API
async function loadVoiceNotes() {
  try {
    const response = await apiGet('/voice-notes');
    voiceState.notes = response.data || [];
    renderNotes();
  } catch (error) {
    console.error('Failed to load voice notes:', error);
    // Fall back to demo data on error
    if (!voiceState.useRealData) {
      voiceState.notes = [...sampleNotes];
      renderNotes();
    }
  }
}

// Load custom fields configuration
async function loadCustomFields() {
  try {
    const response = await apiGet('/custom-fields');
    voiceState.customFields = response.data || [];
  } catch (error) {
    console.error('Failed to load custom fields:', error);
    voiceState.customFields = [];
  }
}

async function simulateAIExtraction(audioBlob) {
  // In production, this sends audio to backend:
  // 1. Transcribe with Whisper API
  // 2. Extract structured data with GPT-4
  // 3. Return organized fields

  // For demo, return mock data
  return {
    id: Date.now(),
    timestamp: new Date(),
    audioUrl: URL.createObjectURL(audioBlob),
    transcript: "Just got off the phone with Mike Johnson. He wants a quote for the deluxe service package. Budget is flexible around $15k. Email is mike.johnson@techcorp.com. Schedule a follow-up call next Wednesday at 2 PM and add it to my calendar.",
    extractedData: {
      contact: {
        name: "Mike Johnson",
        company: "TechCorp",
        phone: null,
        email: "mike.johnson@techcorp.com"
      },
      details: {
        interest: "Deluxe service package",
        budget: "$15k (flexible)",
        status: "Quote requested"
      },
      followUp: {
        when: "Next Wednesday at 2 PM",
        action: "Schedule follow-up call",
        notes: "Discuss quote"
      },
      calendar: {
        title: "Follow-up call with Mike Johnson",
        date: "Next Wednesday",
        time: "2:00 PM",
        description: "Discuss deluxe service package quote ($15k budget)"
      }
    },
    confidence: 0.96
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// Display Functions
// ============================================

function addNoteToList(note) {
  voiceState.notes.unshift(note);
  renderNotes();
}

function renderNotes() {
  // Filter notes based on search query
  const filteredNotes = filterNotesBySearch(voiceState.notes);

  // Update notes count
  const notesCount = document.getElementById('notesCount');
  if (notesCount) {
    notesCount.textContent = `${filteredNotes.length} note${filteredNotes.length !== 1 ? 's' : ''}`;
  }

  // Check empty state
  const emptyState = document.getElementById('emptyState');
  if (voiceState.notes.length === 0) {
    document.getElementById('voiceNotesList').innerHTML = '';
    document.getElementById('crmTableView').style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  // Render based on current view
  if (voiceState.currentView === 'table') {
    renderTableView(filteredNotes);
  } else {
    renderCardView(filteredNotes);
  }
}

function renderTableView(notes) {
  const container = document.getElementById('crmTableView');
  const cardContainer = document.getElementById('voiceNotesList');

  cardContainer.style.display = 'none';
  container.style.display = 'block';

  // Get all unique field names across all notes
  const allFieldNames = new Set();
  notes.forEach(note => {
    const extractedData = note.extracted_data || note.extractedData;
    if (extractedData && typeof extractedData === 'object') {
      Object.keys(extractedData).forEach(key => allFieldNames.add(key));
    }
  });

  const fieldNames = Array.from(allFieldNames).sort();

  // Build table headers
  const headers = ['Date', 'Transcript', ...fieldNames, 'Status', 'Actions'];

  const tableHeaders = document.getElementById('tableHeaders');
  tableHeaders.innerHTML = headers.map(h => `<th>${h}</th>`).join('');

  // Build table rows
  const tableBody = document.getElementById('tableBody');
  tableBody.innerHTML = notes.map(note => {
    const date = new Date(note.created_at || note.timestamp);
    const extractedData = note.extracted_data || note.extractedData || {};

    return `
      <tr>
        <td class="table-cell-date">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td class="table-cell-transcript" title="${escapeHTML(note.transcription || note.transcript || '')}">${truncate(note.transcription || note.transcript || '', 100)}</td>
        ${fieldNames.map(fieldName => {
          const value = extractedData[fieldName];
          const field = voiceState.customFields.find(f => f.field_name === fieldName);
          const formattedValue = formatTableCellValue(value, field?.field_type || 'text');

          return `<td class="table-cell-field">${formattedValue || '<span class="table-cell-empty">-</span>'}</td>`;
        }).join('')}
        <td>
          <span class="table-status-badge ${note.status || 'completed'}">${note.status === 'completed' ? 'Completed' : note.status === 'processing' ? 'Processing' : note.status === 'failed' ? 'Failed' : 'Completed'}</span>
        </td>
        <td>
          <div class="table-actions">
            ${note.audio_url || note.audioUrl ? `
              <button class="btn-icon" onclick="playAudio('${note.audio_url || note.audioUrl}')" title="Play audio">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            ` : ''}
            <button class="btn-icon" onclick="deleteNote('${note.id}')" title="Delete">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderCardView(notes) {
  const container = document.getElementById('voiceNotesList');
  document.getElementById('crmTableView').style.display = 'none';
  container.style.display = 'grid';

  container.innerHTML = notes.map(note => `
    <div class="voice-note-card">
      <!-- Header -->
      <div class="note-header">
        <div class="note-timestamp">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          ${formatTimestamp(note.created_at || note.timestamp)}
        </div>
        <div class="note-actions">
          ${note.audio_url || note.audioUrl ? `
            <button class="btn-icon" onclick="playAudio('${note.audio_url || note.audioUrl}')" title="Play audio">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          ` : ''}
          <button class="btn-icon" onclick="deleteNote('${note.id}')" title="Delete">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Transcript -->
      <div class="transcript-section">
        <h4>📝 What you said</h4>
        <div class="transcript-text">"${note.transcription || note.transcript}"</div>
      </div>

      <!-- Extracted Data (Dynamic Custom Fields) -->
      ${renderExtractedData(note.extracted_data || note.extractedData)}

      <!-- Status Badge -->
      ${note.status ? `
        <div class="confidence-badge" style="background: ${note.status === 'completed' ? '#d1fae5' : '#fef3c7'}; color: ${note.status === 'completed' ? '#065f46' : '#92400e'};">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          ${note.status === 'completed' ? 'Processed' : note.status === 'processing' ? 'Processing...' : 'Pending'}
        </div>
      ` : note.confidence ? `
        <div class="confidence-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          ${Math.round(note.confidence * 100)}% AI Confidence
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Dynamic renderer for extracted custom fields
function renderExtractedData(extractedData) {
  // Handle both new dynamic structure and old hardcoded structure
  if (!extractedData || Object.keys(extractedData).length === 0) {
    return `
      <div class="extracted-data">
        <div class="empty-extraction">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>No data extracted yet</p>
        </div>
      </div>
    `;
  }

  // Check if it's the old hardcoded structure (for demo compatibility)
  if (extractedData.contact || extractedData.details || extractedData.followUp || extractedData.calendar) {
    return `
      <div class="extracted-data">
        ${renderContactData(extractedData.contact)}
        ${renderDetailsData(extractedData.details)}
        ${renderFollowUpData(extractedData.followUp)}
        ${renderCalendarData(extractedData.calendar)}
      </div>
    `;
  }

  // New dynamic custom fields structure
  const fieldTypeIcons = {
    'text': '📝',
    'number': '🔢',
    'currency': '💰',
    'date': '📅',
    'datetime': '🕐',
    'phone': '📞',
    'email': '📧',
    'url': '🔗'
  };

  // Get field metadata if available
  const getFieldMeta = (fieldName) => {
    const field = voiceState.customFields.find(f => f.field_name === fieldName);
    return field || { field_type: 'text' };
  };

  const formatValue = (value, fieldType) => {
    if (value === null || value === undefined) return 'N/A';

    switch (fieldType) {
      case 'currency':
        return typeof value === 'number' ? `$${value.toFixed(2)}` : value;
      case 'phone':
        return `<a href="tel:${value}" style="color: inherit; text-decoration: none;">${value}</a>`;
      case 'email':
        return `<a href="mailto:${value}" style="color: inherit; text-decoration: none;">${value}</a>`;
      case 'url':
        return `<a href="${value}" target="_blank" rel="noopener" style="color: #667eea; text-decoration: underline;">${value}</a>`;
      default:
        return value;
    }
  };

  const entries = Object.entries(extractedData);

  return `
    <div class="extracted-data">
      <div class="data-group custom-fields">
        <div class="data-label">✨ Extracted Information</div>
        <div class="custom-fields-grid">
          ${entries.map(([fieldName, value]) => {
            const field = getFieldMeta(fieldName);
            const icon = fieldTypeIcons[field.field_type] || '📋';

            return `
              <div class="custom-field-item">
                <div class="field-icon">${icon}</div>
                <div class="field-content">
                  <div class="field-label">${fieldName}</div>
                  <div class="field-value">${formatValue(value, field.field_type)}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderContactData(contact) {
  if (!contact || !contact.name) return '';

  return `
    <div class="data-group contact-info">
      <div class="data-label">👤 Contact</div>
      <div class="data-value">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        ${contact.name}${contact.vip ? ' ⭐ VIP' : ''}
      </div>
      <div class="data-items">
        ${contact.company ? `
          <div class="data-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            ${contact.company}
          </div>
        ` : ''}
        ${contact.phone ? `
          <div class="data-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
            ${contact.phone}
          </div>
        ` : ''}
        ${contact.email ? `
          <div class="data-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            ${contact.email}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderDetailsData(details) {
  if (!details || Object.keys(details).length === 0) return '';

  return `
    <div class="data-group details">
      <div class="data-label">📋 Details</div>
      <div class="data-items">
        ${Object.entries(details).map(([key, value]) => {
          if (Array.isArray(value)) {
            return value.map(item => `
              <div class="data-item">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                ${item}
              </div>
            `).join('');
          }
          return `
            <div class="data-item">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <strong>${formatKey(key)}:</strong> ${value}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderFollowUpData(followUp) {
  if (!followUp) return '';

  return `
    <div class="data-group follow-up">
      <div class="data-label">📅 Follow-Up</div>
      <div class="data-items">
        <div class="data-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <strong>When:</strong> ${followUp.when}
        </div>
        <div class="data-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <strong>Action:</strong> ${followUp.action}
        </div>
        ${followUp.notes ? `
          <div class="data-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            ${followUp.notes}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderCalendarData(calendar, noteId) {
  if (!calendar) return '';

  return `
    <div class="data-group" style="background: #f0f9ff; border-color: #bae6fd;">
      <div class="data-label">📆 Calendar Reminder</div>
      <div class="data-items">
        <div class="data-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          </svg>
          <strong>${calendar.title}</strong>
        </div>
        <div class="data-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          ${calendar.date} at ${calendar.time}
        </div>
        ${calendar.description ? `
          <div class="data-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            ${calendar.description}
          </div>
        ` : ''}
      </div>
      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="btn-export" onclick="exportToGoogleCalendar(${noteId})" style="flex: 1; padding: 10px 16px; background: #4285f4; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
          </svg>
          Google Calendar
        </button>
        <button class="btn-export" onclick="exportToAppleCalendar(${noteId})" style="flex: 1; padding: 10px 16px; background: #1a1a1a; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
          </svg>
          Apple Calendar
        </button>
      </div>
    </div>
  `;
}

// ============================================
// Calendar Export Functions
// ============================================

function exportToGoogleCalendar(noteId) {
  const note = voiceState.notes.find(n => n.id === noteId);
  if (!note || !note.extractedData.calendar) return;

  const cal = note.extractedData.calendar;

  // Parse date/time (in production, this would be more sophisticated)
  const eventDate = parseNaturalDate(cal.date, cal.time);
  const startTime = encodeURIComponent(formatDateForGoogle(eventDate));
  const endTime = encodeURIComponent(formatDateForGoogle(new Date(eventDate.getTime() + 3600000))); // +1 hour

  // Build Google Calendar URL
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(cal.title)}` +
    `&dates=${startTime}/${endTime}` +
    `&details=${encodeURIComponent(cal.description || '')}` +
    `&sf=true&output=xml`;

  window.open(googleUrl, '_blank');
}

function exportToAppleCalendar(noteId) {
  const note = voiceState.notes.find(n => n.id === noteId);
  if (!note || !note.extractedData.calendar) return;

  const cal = note.extractedData.calendar;
  const eventDate = parseNaturalDate(cal.date, cal.time);

  // Generate .ics file content
  const icsContent = generateICS(cal.title, cal.description || '', eventDate);

  // Create download link
  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${cal.title.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateICS(title, description, startDate) {
  const endDate = new Date(startDate.getTime() + 3600000); // +1 hour

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CyberCheck//Voice CRM//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@cybercheck.com`,
    `DTSTAMP:${formatDateForICS(new Date())}`,
    `DTSTART:${formatDateForICS(startDate)}`,
    `DTEND:${formatDateForICS(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

function formatDateForICS(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatDateForGoogle(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function parseNaturalDate(dateStr, timeStr) {
  // Simplified parser (in production, use a library like chrono-node)
  const now = new Date();
  let targetDate = new Date(now);

  // Parse day
  if (dateStr.toLowerCase().includes('friday')) {
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    targetDate.setDate(now.getDate() + daysUntilFriday);
  } else if (dateStr.toLowerCase().includes('wednesday')) {
    const daysUntilWednesday = (3 - now.getDay() + 7) % 7 || 7;
    targetDate.setDate(now.getDate() + daysUntilWednesday);
  } else if (dateStr.toLowerCase().includes('next')) {
    targetDate.setDate(now.getDate() + 7);
  }

  // Parse time
  const timeMatch = timeStr.match(/(\d+):?(\d+)?\s*(AM|PM)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]) || 0;
    const meridiem = timeMatch[3];

    if (meridiem && meridiem.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (meridiem && meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;

    targetDate.setHours(hours, minutes, 0, 0);
  }

  return targetDate;
}

// ============================================
// Utility Functions
// ============================================

function formatTimestamp(date) {
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function formatKey(key) {
  return key.replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

function playAudio(audioUrl) {
  const audio = new Audio(audioUrl);
  audio.play();
}

async function deleteNote(noteId) {
  if (!confirm('Delete this voice note?')) {
    return;
  }

  try {
    if (voiceState.useRealData) {
      await apiDelete(`/voice-notes/${noteId}`);
    }

    voiceState.notes = voiceState.notes.filter(note => note.id !== noteId);
    renderNotes();
  } catch (error) {
    console.error('Failed to delete voice note:', error);
    alert('Failed to delete voice note: ' + error.message);
  }
}

// ============================================
// View Management Functions
// ============================================

/**
 * Switch between table and card view
 */
function switchView(view) {
  voiceState.currentView = view;

  // Update active button
  document.getElementById('tableViewBtn').classList.toggle('active', view === 'table');
  document.getElementById('cardViewBtn').classList.toggle('active', view === 'card');

  // Re-render
  renderNotes();
}

/**
 * Filter notes by search query
 */
function filterNotes() {
  voiceState.searchQuery = document.getElementById('searchInput').value.toLowerCase();
  renderNotes();
}

/**
 * Filter notes based on current search query
 */
function filterNotesBySearch(notes) {
  if (!voiceState.searchQuery) return notes;

  return notes.filter(note => {
    // Search in transcription
    if ((note.transcription || note.transcript || '').toLowerCase().includes(voiceState.searchQuery)) {
      return true;
    }

    // Search in extracted data
    const extractedData = note.extracted_data || note.extractedData || {};
    const extractedValues = Object.values(extractedData).map(v => String(v).toLowerCase());

    return extractedValues.some(v => v.includes(voiceState.searchQuery));
  });
}

/**
 * Format value for table cell
 */
function formatTableCellValue(value, fieldType) {
  if (value === null || value === undefined || value === '') return null;

  switch (fieldType) {
    case 'currency':
      return typeof value === 'number' ? `$${value.toFixed(2)}` : value;
    case 'phone':
      return `<a href="tel:${value}" style="color: inherit;">${value}</a>`;
    case 'email':
      return `<a href="mailto:${value}" style="color: inherit;">${value}</a>`;
    case 'url':
      return `<a href="${value}" target="_blank" rel="noopener" style="color: #667eea;">${truncate(value, 30)}</a>`;
    case 'date':
    case 'datetime':
      return value;
    default:
      return escapeHTML(String(value));
  }
}

/**
 * Truncate text
 */
function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return escapeHTML(text);
  return escapeHTML(text.substring(0, maxLength)) + '...';
}

/**
 * Escape HTML
 */
function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// CSV Export Functions
// ============================================

/**
 * Export voice notes to CSV with dynamic custom fields
 */
function exportToCSV() {
  if (voiceState.notes.length === 0) {
    alert('No voice notes to export');
    return;
  }

  try {
    // Get all unique custom field names across all notes
    const allFieldNames = new Set();
    voiceState.notes.forEach(note => {
      const extractedData = note.extracted_data || note.extractedData;
      if (extractedData && typeof extractedData === 'object') {
        // Handle both new dynamic structure and old hardcoded structure
        if (extractedData.contact || extractedData.details || extractedData.followUp || extractedData.calendar) {
          // Old structure - flatten it
          if (extractedData.contact) {
            Object.keys(extractedData.contact).forEach(key => allFieldNames.add(`contact_${key}`));
          }
          if (extractedData.details) {
            Object.keys(extractedData.details).forEach(key => allFieldNames.add(`details_${key}`));
          }
          if (extractedData.followUp) {
            Object.keys(extractedData.followUp).forEach(key => allFieldNames.add(`followUp_${key}`));
          }
          if (extractedData.calendar) {
            Object.keys(extractedData.calendar).forEach(key => allFieldNames.add(`calendar_${key}`));
          }
        } else {
          // New dynamic structure
          Object.keys(extractedData).forEach(key => allFieldNames.add(key));
        }
      }
    });

    const fieldNames = Array.from(allFieldNames).sort();

    // Build CSV header
    const headers = [
      'Date',
      'Time',
      'Transcription',
      ...fieldNames,
      'Status',
      'Audio URL'
    ];

    // Build CSV rows
    const rows = voiceState.notes.map(note => {
      const date = new Date(note.created_at || note.timestamp);
      const extractedData = note.extracted_data || note.extractedData || {};

      // Flatten extracted data
      const flattenedData = {};

      if (extractedData.contact || extractedData.details || extractedData.followUp || extractedData.calendar) {
        // Old structure
        if (extractedData.contact) {
          Object.entries(extractedData.contact).forEach(([key, value]) => {
            flattenedData[`contact_${key}`] = formatValueForCSV(value);
          });
        }
        if (extractedData.details) {
          Object.entries(extractedData.details).forEach(([key, value]) => {
            flattenedData[`details_${key}`] = formatValueForCSV(value);
          });
        }
        if (extractedData.followUp) {
          Object.entries(extractedData.followUp).forEach(([key, value]) => {
            flattenedData[`followUp_${key}`] = formatValueForCSV(value);
          });
        }
        if (extractedData.calendar) {
          Object.entries(extractedData.calendar).forEach(([key, value]) => {
            flattenedData[`calendar_${key}`] = formatValueForCSV(value);
          });
        }
      } else {
        // New structure
        Object.entries(extractedData).forEach(([key, value]) => {
          flattenedData[key] = formatValueForCSV(value);
        });
      }

      // Build row
      const row = [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        escapeCSV(note.transcription || note.transcript || ''),
        ...fieldNames.map(field => flattenedData[field] || ''),
        note.status || 'completed',
        note.audio_url || note.audioUrl || ''
      ];

      return row;
    });

    // Generate CSV content
    const csvContent = [
      headers.map(h => escapeCSV(h)).join(','),
      ...rows.map(row => row.map(cell => escapeCSV(cell)).join(','))
    ].join('\n');

    // Download CSV
    downloadCSV(csvContent, `voice-notes-${new Date().toISOString().split('T')[0]}.csv`);

    console.log(`Exported ${voiceState.notes.length} voice notes to CSV`);
  } catch (error) {
    console.error('Failed to export CSV:', error);
    alert('Failed to export CSV: ' + error.message);
  }
}

/**
 * Format value for CSV export
 */
function formatValueForCSV(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join('; ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Escape CSV special characters
 */
function escapeCSV(str) {
  if (str === null || str === undefined) return '';
  const stringValue = String(str);

  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Download CSV file
 */
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('%cVoice AI CRM Initializing...', 'font-size: 16px; font-weight: bold; color: #667eea;');

  // Check if user is authenticated
  if (!requireAuth()) {
    return;
  }

  try {
    // Load custom fields configuration and voice notes in parallel
    await Promise.all([
      loadCustomFields(),
      loadVoiceNotes()
    ]);

    console.log('%cVoice AI CRM Ready', 'font-size: 16px; font-weight: bold; color: #667eea;');
    console.log(`🎤 ${voiceState.notes.length} voice notes loaded`);
    console.log(`✨ ${voiceState.customFields.length} custom fields configured`);
    console.log('📅 Start recording or upload audio to capture CRM data');
  } catch (error) {
    console.error('Initialization error:', error);
    console.warn('Falling back to demo mode');
    voiceState.useRealData = false;
    voiceState.notes = [...sampleNotes];
    renderNotes();
  }
});
