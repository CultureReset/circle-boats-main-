// ============================================
// CyberCheck - Onboarding Wizard JavaScript
// ============================================

// Onboarding data storage
let onboardingData = {
  industry: '',
  businessName: '',
  username: '',
  tagline: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  hours: '',
  logo: null,
  colorScheme: 'blue',
  aiResponses: []
};

let currentStep = 1;
let aiConversationStep = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeStep1();
  initializeStep2();
  initializeStep3();
  initializeStep4();
  initializeSkipButton();
});

// ============================================
// Step 1: Industry Selection
// ============================================

function initializeStep1() {
  const industryInputs = document.querySelectorAll('input[name="industry"]');
  const nextBtn = document.getElementById('step1Next');

  industryInputs.forEach(input => {
    input.addEventListener('change', () => {
      onboardingData.industry = input.value;
      nextBtn.disabled = false;
    });
  });

  if (nextBtn) {
    nextBtn.addEventListener('click', () => goToStep(2));
  }
}

// ============================================
// Step 2: Business Information
// ============================================

function initializeStep2() {
  const form = document.getElementById('businessInfoForm');
  const backBtn = document.getElementById('step2Back');
  const nextBtn = document.getElementById('step2Next');

  // Real-time username validation
  const usernameInput = document.getElementById('username');
  const usernameHint = document.getElementById('usernameHint');

  if (usernameInput) {
    usernameInput.addEventListener('input', (e) => {
      const username = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
      e.target.value = username;

      if (username.length < 3) {
        usernameHint.innerHTML = '<span class="hint-icon">⚠️</span> Username must be at least 3 characters';
        usernameHint.style.color = 'var(--warning, #F59E0B)';
      } else if (checkUsernameAvailability(username)) {
        usernameHint.innerHTML = '<span class="hint-icon">✓</span> Username is available!';
        usernameHint.style.color = 'var(--success)';
      } else {
        usernameHint.innerHTML = '<span class="hint-icon">✗</span> Username is already taken';
        usernameHint.style.color = 'var(--error, #EF4444)';
      }
    });
  }

  // Hours presets
  const hoursPresets = document.querySelectorAll('.hours-preset');
  hoursPresets.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      hoursPresets.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onboardingData.hours = btn.dataset.hours;

      if (btn.dataset.hours === 'custom') {
        document.getElementById('customHoursSection').style.display = 'block';
      } else {
        document.getElementById('customHoursSection').style.display = 'none';
      }
    });
  });

  // Live preview updates
  const businessNameInput = document.getElementById('businessName');
  const taglineInput = document.getElementById('tagline');

  if (businessNameInput) {
    businessNameInput.addEventListener('input', (e) => {
      document.getElementById('previewName').textContent = e.target.value || 'Your Business';
    });
  }

  if (taglineInput) {
    taglineInput.addEventListener('input', (e) => {
      document.getElementById('previewTagline').textContent = e.target.value || 'Your tagline here';
    });
  }

  // Navigation
  if (backBtn) {
    backBtn.addEventListener('click', () => goToStep(1));
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (validateStep2()) {
        saveStep2Data();
        goToStep(3);
      }
    });
  }
}

function checkUsernameAvailability(username) {
  // In production, this would be an API call
  // For demo, simulate some taken usernames
  const takenUsernames = ['admin', 'test', 'demo', 'cybercheck', 'support'];
  return !takenUsernames.includes(username) && username.length >= 3;
}

function validateStep2() {
  const businessName = document.getElementById('businessName').value;
  const username = document.getElementById('username').value;
  const phone = document.getElementById('phone').value;

  if (!businessName || !username || !phone) {
    alert('Please fill in all required fields');
    return false;
  }

  if (username.length < 3) {
    alert('Username must be at least 3 characters');
    return false;
  }

  if (!checkUsernameAvailability(username)) {
    alert('Username is already taken. Please choose another.');
    return false;
  }

  return true;
}

function saveStep2Data() {
  onboardingData.businessName = document.getElementById('businessName').value;
  onboardingData.username = document.getElementById('username').value;
  onboardingData.tagline = document.getElementById('tagline').value;
  onboardingData.phone = document.getElementById('phone').value;
  onboardingData.email = document.getElementById('email').value;
  onboardingData.address = document.getElementById('address').value;
  onboardingData.city = document.getElementById('city').value;
  onboardingData.state = document.getElementById('state').value;
  onboardingData.zip = document.getElementById('zip').value;
}

// ============================================
// Step 3: Branding
// ============================================

function initializeStep3() {
  const backBtn = document.getElementById('step3Back');
  const nextBtn = document.getElementById('step3Next');

  // Logo upload
  const logoUploadArea = document.getElementById('logoUploadArea');
  const logoInput = document.getElementById('logoInput');
  const logoPreview = document.getElementById('logoPreview');

  if (logoUploadArea && logoInput) {
    logoUploadArea.addEventListener('click', () => {
      logoInput.click();
    });

    logoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          logoPreview.innerHTML = `<img src="${event.target.result}" alt="Logo">`;
          document.getElementById('previewAvatarImg').src = event.target.result;
          onboardingData.logo = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Color scheme selection
  const colorInputs = document.querySelectorAll('input[name="colorScheme"]');
  colorInputs.forEach(input => {
    input.addEventListener('change', () => {
      onboardingData.colorScheme = input.value;
      document.querySelectorAll('.color-preset').forEach(preset => {
        preset.classList.remove('active');
      });
      input.closest('.color-preset').classList.add('active');
    });
  });

  // Navigation
  if (backBtn) {
    backBtn.addEventListener('click', () => goToStep(2));
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => goToStep(4));
  }
}

// ============================================
// Step 4: AI Setup
// ============================================

function initializeStep4() {
  const backBtn = document.getElementById('step4Back');
  const completeBtn = document.getElementById('step4Complete');

  // Quick reply buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('message-quick-reply')) {
      const reply = e.target.dataset.reply;
      handleQuickReply(reply);
    }
  });

  // AI chat input
  const aiInput = document.getElementById('aiInput');
  const aiSendBtn = document.getElementById('aiSendBtn');

  if (aiSendBtn && aiInput) {
    aiSendBtn.addEventListener('click', () => sendAIMessage());
    aiInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendAIMessage();
      }
    });
  }

  // Navigation
  if (backBtn) {
    backBtn.addEventListener('click', () => goToStep(3));
  }

  if (completeBtn) {
    completeBtn.addEventListener('click', () => completeOnboarding());
  }
}

function handleQuickReply(reply) {
  if (reply === 'yes') {
    addUserMessage("Yes, let's go!");
    aiConversationStep = 1;
    setTimeout(() => askAIQuestion(), 1000);
  } else if (reply === 'skip') {
    addUserMessage("Skip for now");
    setTimeout(() => {
      addBotMessage("No problem! You can always add this information later from your dashboard. Let's finish setting up your profile.");
      document.getElementById('step4Complete').style.display = 'flex';
    }, 1000);
  }
}

function sendAIMessage() {
  const aiInput = document.getElementById('aiInput');
  const message = aiInput.value.trim();

  if (!message) return;

  addUserMessage(message);
  aiInput.value = '';

  onboardingData.aiResponses.push({
    step: aiConversationStep,
    response: message
  });

  setTimeout(() => {
    processAIResponse(message);
  }, 1000);
}

function askAIQuestion() {
  const questions = [
    {
      step: 1,
      question: `Great! First, tell me about your ${onboardingData.industry} business. What makes it special or unique?`
    },
    {
      step: 2,
      question: "What are your 3-5 most popular items or services? (Just list them briefly)"
    },
    {
      step: 3,
      question: "Do you have any special promotions, happy hours, or recurring events I should know about?"
    },
    {
      step: 4,
      question: "Last question! What's the best way for customers to contact you - call, text, or both?"
    }
  ];

  const question = questions.find(q => q.step === aiConversationStep);
  if (question) {
    addBotMessage(question.question);
    document.getElementById('aiInputArea').style.display = 'flex';
  }
}

function processAIResponse(message) {
  aiConversationStep++;

  if (aiConversationStep <= 4) {
    addBotMessage("Got it! Thanks for that info.");
    setTimeout(() => askAIQuestion(), 1500);
  } else {
    // All questions answered
    addBotMessage("Perfect! I have everything I need. Let me set up your profile now...");

    setTimeout(() => {
      document.getElementById('aiChatContainer').style.display = 'none';
      document.getElementById('aiInputArea').style.display = 'none';
      document.getElementById('aiProgress').style.display = 'block';
      simulateProfileSetup();
    }, 2000);
  }
}

function simulateProfileSetup() {
  const progressFill = document.getElementById('aiProgressFill');
  const progressText = document.getElementById('aiProgressText');

  const steps = [
    { progress: 20, text: 'Creating your profile...' },
    { progress: 40, text: 'Setting up your menu...' },
    { progress: 60, text: 'Configuring features...' },
    { progress: 80, text: 'Training your AI assistant...' },
    { progress: 100, text: 'Finishing up...' }
  ];

  let currentStepIndex = 0;

  const interval = setInterval(() => {
    if (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      progressFill.style.width = `${step.progress}%`;
      progressText.textContent = step.text;
      currentStepIndex++;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        document.getElementById('step4Complete').style.display = 'flex';
      }, 500);
    }
  }, 1000);
}

function addUserMessage(message) {
  const messagesContainer = document.getElementById('aiMessages');
  const messageEl = document.createElement('div');
  messageEl.className = 'ai-message user-message';
  messageEl.innerHTML = `
    <div class="message-avatar">👤</div>
    <div class="message-content">
      <div class="message-bubble">${message}</div>
    </div>
  `;
  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addBotMessage(message) {
  const messagesContainer = document.getElementById('aiMessages');
  const messageEl = document.createElement('div');
  messageEl.className = 'ai-message';
  messageEl.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="message-bubble">${message}</div>
    </div>
  `;
  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ============================================
// Step Navigation
// ============================================

function goToStep(stepNumber) {
  // Hide current step
  document.querySelector('.onboarding-step.active').classList.remove('active');

  // Show new step
  document.getElementById(`step${stepNumber}`).classList.add('active');

  // Update progress indicator
  document.querySelectorAll('.progress-step').forEach((step, index) => {
    step.classList.remove('active', 'completed');
    if (index + 1 === stepNumber) {
      step.classList.add('active');
    } else if (index + 1 < stepNumber) {
      step.classList.add('completed');
    }
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  currentStep = stepNumber;
}

// ============================================
// Complete Onboarding
// ============================================

function completeOnboarding() {
  console.log('Completing onboarding with data:', onboardingData);

  // In production, send data to API
  // await fetch('/api/onboarding', { method: 'POST', body: JSON.stringify(onboardingData) });

  // Hide step 4
  document.getElementById('step4').classList.remove('active');

  // Update success screen with data
  document.getElementById('successBusinessName').textContent = onboardingData.businessName;
  document.getElementById('successProfileUrl').textContent = `cybercheck.com/@${onboardingData.username}`;

  if (onboardingData.logo) {
    document.getElementById('successAvatar').src = onboardingData.logo;
  }

  // Show success screen
  document.getElementById('successScreen').style.display = 'block';

  // Hide header progress
  document.querySelector('.progress-indicator').style.display = 'none';
}

// ============================================
// Copy URL
// ============================================

document.addEventListener('click', (e) => {
  if (e.target.closest('#copyUrlBtn')) {
    const urlText = document.getElementById('successProfileUrl').textContent;
    navigator.clipboard.writeText(`https://${urlText}`).then(() => {
      const btn = e.target.closest('#copyUrlBtn');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(() => {
        btn.innerHTML = originalHTML;
      }, 2000);
    });
  }
});

// ============================================
// Skip Setup
// ============================================

function initializeSkipButton() {
  const skipBtn = document.getElementById('skipBtn');

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to skip setup? You can complete it later from your dashboard.')) {
        // Set minimum required data
        onboardingData.businessName = 'My Business';
        onboardingData.username = `user${Date.now()}`;

        completeOnboarding();
      }
    });
  }
}

// ============================================
// Form Validation Helpers
// ============================================

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(phone);
}

function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phone;
}

// Auto-format phone number
const phoneInput = document.getElementById('phone');
if (phoneInput) {
  phoneInput.addEventListener('blur', (e) => {
    e.target.value = formatPhone(e.target.value);
  });
}

// ============================================
// Prevent accidental navigation away
// ============================================

window.addEventListener('beforeunload', (e) => {
  if (currentStep > 1 && currentStep < 5 && !document.getElementById('successScreen').style.display) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ============================================
// Keyboard shortcuts
// ============================================

document.addEventListener('keydown', (e) => {
  // Enter on step buttons
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
    const activeStep = document.querySelector('.onboarding-step.active');
    if (activeStep) {
      const nextBtn = activeStep.querySelector('.btn-primary');
      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click();
      }
    }
  }
});

// ============================================
// Analytics
// ============================================

console.log('%cCyberCheck Onboarding', 'font-size: 20px; font-weight: bold; color: #4DA6FF;');
console.log('Step 1: Industry Selection');

// Track step completion (in production, send to analytics)
function trackStepCompletion(step) {
  console.log(`Onboarding Step ${step} completed`);
  // gtag('event', 'onboarding_step', { step: step });
}
