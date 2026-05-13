/**
 * Modular Payment Processor
 * Supports: Stripe, Square, PayPal, etc.
 * Each processor implements: init(), createToken(), charge(), refund()
 */

const PaymentProcessor = {
  _current: null,
  _processors: {},

  // Register a payment processor
  register(name, processor) {
    this._processors[name] = processor;
  },

  // Set active processor
  setProcessor(name) {
    if (!this._processors[name]) throw new Error(`Processor ${name} not registered`);
    this._current = this._processors[name];
    console.log(`Switched to ${name} payment processor`);
  },

  // Get current processor
  getCurrent() {
    return this._current;
  },

  // Init processor (loads scripts, sets up SDK)
  async init(config) {
    if (!this._current) throw new Error('No payment processor set');
    return await this._current.init(config);
  },

  // Create payment token
  async createToken(card) {
    if (!this._current) throw new Error('No payment processor set');
    return await this._current.createToken(card);
  },

  // Charge customer
  async charge(amount, token, metadata) {
    if (!this._current) throw new Error('No payment processor set');
    return await this._current.charge(amount, token, metadata);
  },

  // Refund transaction
  async refund(chargeId, amount) {
    if (!this._current) throw new Error('No payment processor set');
    return await this._current.refund(chargeId, amount);
  }
};

// ============================================
// STRIPE PROCESSOR
// ============================================
const StripeProcessor = {
  _stripe: null,
  _elements: null,

  async init(config) {
    if (!config.publicKey) throw new Error('Stripe publicKey required');
    this._stripe = Stripe(config.publicKey);
    this._elements = this._stripe.elements();
    return true;
  },

  async createToken(cardElement) {
    const { token, error } = await this._stripe.createToken(cardElement);
    if (error) throw new Error(error.message);
    return { id: token.id, provider: 'stripe' };
  },

  async charge(amount, token, metadata) {
    const response = await fetch('/api/payment/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, token: token.id, provider: 'stripe', ...metadata })
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
  },

  async refund(chargeId, amount) {
    const response = await fetch('/api/payment/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chargeId, amount, provider: 'stripe' })
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
  }
};

// ============================================
// SQUARE PROCESSOR
// ============================================
const SquareProcessor = {
  _square: null,
  _web: null,

  async init(config) {
    if (!config.appId || !config.locationId) throw new Error('Square appId and locationId required');
    // Load Square Web Payments SDK
    const script = document.createElement('script');
    script.src = 'https://web.squarecdn.com/v1/square.js';
    document.head.appendChild(script);
    await new Promise(r => { script.onload = r; });
    
    this._square = window.Square;
    this._web = await this._square.web.payments(config.appId);
    return true;
  },

  async createToken(cardElement) {
    const { token, error } = await this._web.requestCardNonce();
    if (error) throw new Error(error.message);
    return { id: token, provider: 'square' };
  },

  async charge(amount, token, metadata) {
    const response = await fetch('/api/payment/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, token: token.id, provider: 'square', ...metadata })
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
  },

  async refund(chargeId, amount) {
    const response = await fetch('/api/payment/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chargeId, amount, provider: 'square' })
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
  }
};

// ============================================
// PAYPAL PROCESSOR
// ============================================
const PayPalProcessor = {
  _paypal: null,

  async init(config) {
    if (!config.clientId) throw new Error('PayPal clientId required');
    // Load PayPal SDK
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${config.clientId}`;
    document.head.appendChild(script);
    await new Promise(r => { script.onload = r; });
    
    this._paypal = window.paypal;
    return true;
  },

  async createToken(details) {
    // PayPal uses a different flow - no token needed upfront
    return { provider: 'paypal', ...details };
  },

  async charge(amount, token, metadata) {
    const response = await fetch('/api/payment/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, provider: 'paypal', ...metadata, ...token })
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
  },

  async refund(chargeId, amount) {
    const response = await fetch('/api/payment/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chargeId, amount, provider: 'paypal' })
    });
    const result = await response.json();
    if (result.error) throw new Error(result.error);
    return result;
  }
};

// Register all processors
PaymentProcessor.register('stripe', StripeProcessor);
PaymentProcessor.register('square', SquareProcessor);
PaymentProcessor.register('paypal', PayPalProcessor);

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PaymentProcessor;
}
