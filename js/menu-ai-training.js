/**
 * Menu AI Training - Real Backend Integration
 * Handles voice recording, API calls, and AI training display
 */

const API_BASE = '/api/menu';
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let currentItemId = null;
let currentItemName = null;

// =============================================
// Modal Control
// =============================================

function openAITrainingModal(itemId, itemName) {
  currentItemId = itemId;
  currentItemName = itemName;
  document.getElementById('aiTrainingModal').style.display = 'flex';
  document.getElementById('aiTrainingTitle').textContent = `🎤 AI Sales Training - ${itemName}`;
  resetAITrainingModal();

  // Check if item already has training
  checkExistingTraining(itemId);
}

function closeAITrainingModal() {
  // Stop any ongoing recording
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }

  document.getElementById('aiTrainingModal').style.display = 'none';
  resetAITrainingModal();
}

function resetAITrainingModal() {
  document.getElementById('step-choose-method').style.display = 'block';
  document.getElementById('voiceRecorder').classList.remove('active');
  document.getElementById('textInputContainer').classList.remove('active');
  document.getElementById('processingStatus').classList.remove('active');
  document.getElementById('aiTrainingPreview').classList.remove('active');
  document.getElementById('submitContextBtn').style.display = 'none';
  document.getElementById('saveTrainingBtn').style.display = 'none';

  // Reset form
  document.getElementById('contextText').value = '';
  document.getElementById('charCount').textContent = '0';
  audioChunks = [];
}

// =============================================
// Check Existing Training
// =============================================

async function checkExistingTraining(itemId) {
  try {
    const response = await fetch(`${API_BASE}/items/${itemId}/ai-context`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.ai_context_processed) {
        // Show existing training immediately
        document.getElementById('step-choose-method').style.display = 'none';
        displayExistingTraining(data.ai_context_processed);
      }
    }
  } catch (error) {
    console.error('Error checking existing training:', error);
    // Continue with fresh training if check fails
  }
}

function displayExistingTraining(trainingContent) {
  document.getElementById('aiTrainingContent').textContent = trainingContent;
  document.getElementById('aiTrainingPreview').classList.add('active');
  document.getElementById('saveTrainingBtn').style.display = 'inline-flex';

  // Change button text to "Update Training" since it already exists
  document.getElementById('saveTrainingBtn').textContent = 'Training Already Saved';
  document.getElementById('saveTrainingBtn').disabled = true;
}

// =============================================
// Method Selection
// =============================================

function selectContextMethod(method) {
  document.getElementById('step-choose-method').style.display = 'none';

  if (method === 'voice') {
    startVoiceRecording();
  } else {
    document.getElementById('textInputContainer').classList.add('active');
    document.getElementById('submitContextBtn').style.display = 'inline-flex';
  }
}

// =============================================
// Voice Recording (Real Implementation)
// =============================================

async function startVoiceRecording() {
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Show recording UI
    document.getElementById('voiceRecorder').classList.add('active');

    // Initialize MediaRecorder
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());

      // Create audio blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

      // Send to backend
      await uploadVoiceTraining(audioBlob);
    };

    // Start recording
    mediaRecorder.start();
    recordingStartTime = Date.now();
    updateRecordingTime();

    // Auto-stop after 30 seconds
    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
      }
    }, 30000);

  } catch (error) {
    console.error('Error starting recording:', error);
    alert('Unable to access microphone. Please check permissions and try again.');
    document.getElementById('voiceRecorder').classList.remove('active');
    document.getElementById('step-choose-method').style.display = 'block';
  }
}

function updateRecordingTime() {
  if (!recordingStartTime || !mediaRecorder || mediaRecorder.state !== 'recording') {
    return;
  }

  const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  document.getElementById('recordingTime').textContent =
    `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Continue updating
  setTimeout(updateRecordingTime, 100);
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  document.getElementById('voiceRecorder').classList.remove('active');
}

// =============================================
// Upload Voice Training
// =============================================

async function uploadVoiceTraining(audioBlob) {
  showProcessing('Uploading voice note...');

  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'training.webm');
    formData.append('duration', Math.floor((Date.now() - recordingStartTime) / 1000));

    const response = await fetch(`${API_BASE}/items/${currentItemId}/ai-context/voice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload voice note');
    }

    // Wait for processing
    await pollForProcessingComplete();

  } catch (error) {
    console.error('Error uploading voice training:', error);
    alert('Failed to upload voice note. Please try again.');
    closeAITrainingModal();
  }
}

// =============================================
// Text Input Submission
// =============================================

async function submitAIContext() {
  const text = document.getElementById('contextText').value.trim();

  if (!text) {
    alert('Please enter training details');
    return;
  }

  document.getElementById('textInputContainer').classList.remove('active');
  document.getElementById('submitContextBtn').style.display = 'none';
  showProcessing('Processing training...');

  try {
    const response = await fetch(`${API_BASE}/items/${currentItemId}/ai-context/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error('Failed to submit training');
    }

    // Wait for processing
    await pollForProcessingComplete();

  } catch (error) {
    console.error('Error submitting text training:', error);
    alert('Failed to submit training. Please try again.');
    closeAITrainingModal();
  }
}

// =============================================
// Processing & Polling
// =============================================

function showProcessing(message = 'Processing AI Training...') {
  document.getElementById('processingStatus').classList.add('active');
  document.querySelector('#processingStatus h3').textContent = message;

  // Reset processing steps
  const steps = document.querySelectorAll('#aiTrainingModal .processing-step');
  steps[0].classList.add('complete');
  steps[1].classList.remove('complete');
  steps[1].classList.add('active');
  steps[2].classList.remove('complete', 'active');
}

async function pollForProcessingComplete() {
  // Exponential backoff: 2s, 4s, 8s, 16s, 16s, 16s … capped at 16s, max 90s total
  const DELAYS = [2000, 4000, 8000, 16000];
  const MAX_WAIT_MS = 90000;
  let elapsed = 0;
  let attempt = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE}/items/${currentItemId}/ai-context`, {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) throw new Error('Failed to check processing status');

        const data = await response.json();

        if (data.ai_context_processing_status === 'processing') {
          const steps = document.querySelectorAll('#aiTrainingModal .processing-step');
          steps[1].classList.remove('active');
          steps[1].classList.add('complete');
          steps[2].classList.add('active');
        }

        if (data.ai_context_processing_status === 'completed' && data.ai_context_processed) {
          const steps = document.querySelectorAll('#aiTrainingModal .processing-step');
          steps.forEach(step => { step.classList.remove('active'); step.classList.add('complete'); });
          setTimeout(() => { showAITraining(data.ai_context_processed); resolve(); }, 500);
          return;
        }

        if (data.ai_context_processing_status === 'failed') {
          reject(new Error(data.ai_context_processing_error || 'Processing failed'));
          alert('AI training processing failed. Please try again.');
          closeAITrainingModal();
          return;
        }

        // Schedule next poll with backoff
        const delay = DELAYS[Math.min(attempt, DELAYS.length - 1)];
        elapsed += delay;
        attempt++;

        if (elapsed >= MAX_WAIT_MS) {
          reject(new Error('Processing timeout'));
          alert('Processing is taking longer than expected. Please check back in a moment.');
          closeAITrainingModal();
          return;
        }

        setTimeout(poll, delay);

      } catch (error) {
        reject(error);
        console.error('Error polling for completion:', error);
        alert('Error checking processing status. Please try again.');
        closeAITrainingModal();
      }
    };

    setTimeout(poll, DELAYS[0]);
  });
}

// =============================================
// Display AI Training Result
// =============================================

function showAITraining(trainingContent) {
  document.getElementById('processingStatus').classList.remove('active');
  document.getElementById('aiTrainingContent').textContent = trainingContent;
  document.getElementById('aiTrainingPreview').classList.add('active');
  document.getElementById('saveTrainingBtn').style.display = 'inline-flex';
  document.getElementById('saveTrainingBtn').textContent = 'Training Complete';
  document.getElementById('saveTrainingBtn').disabled = false;
}

// =============================================
// Save Training (Close Modal)
// =============================================

function saveAITraining() {
  // Update button status in the menu item card
  const itemCards = document.querySelectorAll('.menu-item-card');
  itemCards.forEach(card => {
    if (card.dataset.itemId === currentItemId ||
        card.querySelector('[onclick*="' + currentItemId + '"]')) {
      const btn = card.querySelector('.ai-training-btn');
      if (btn) {
        btn.classList.remove('ai-none');
        btn.classList.add('ai-ready');
        btn.innerHTML = '<span class="ai-indicator"></span> 🤖 AI Ready';
        btn.title = 'AI Training: Ready';
      }
    }
  });

  // Show success message
  showToast('✓ AI Training Saved! Your Phone AI can now sell this item like an expert.', 'success');

  // Close modal
  closeAITrainingModal();
}

// =============================================
// Utility Functions
// =============================================

function getAuthToken() {
  // Try to get from localStorage, sessionStorage, or cookie
  return localStorage.getItem('auth_token') ||
         sessionStorage.getItem('auth_token') ||
         getCookie('auth_token') ||
         '';
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function showToast(message, type = 'info') {
  // Create toast if doesn't exist
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 400px;
      font-size: 14px;
      display: none;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // Set color based on type
  const colors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6'
  };

  toast.style.borderLeft = `4px solid ${colors[type] || colors.info}`;
  toast.textContent = message;
  toast.style.display = 'block';

  // Auto-hide after 4 seconds
  setTimeout(() => {
    toast.style.display = 'none';
  }, 4000);
}

// =============================================
// Character Counter for Text Input
// =============================================

const contextTextarea = document.getElementById('contextText');
if (contextTextarea) {
  contextTextarea.addEventListener('input', (e) => {
    document.getElementById('charCount').textContent = e.target.value.length;
  });
}

// =============================================
// Export functions for global access
// =============================================

window.openAITrainingModal = openAITrainingModal;
window.closeAITrainingModal = closeAITrainingModal;
window.selectContextMethod = selectContextMethod;
window.stopRecording = stopRecording;
window.submitAIContext = submitAIContext;
window.saveAITraining = saveAITraining;

console.log('✓ Menu AI Training system loaded');
