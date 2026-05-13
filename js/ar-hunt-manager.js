/**
 * Gulf Coast Radar - AR Treasure Hunt System (Pokémon GO Style)
 *
 * Location-based AR scavenger hunts scattered across town
 * - Sponsor-based hunts (each business creates their own)
 * - GPS-based AR items placed anywhere (beaches, parks, streets, landmarks)
 * - Sponsors set their own prizes and number of items
 * - Multiple hunts run simultaneously
 * - Users collect items from different sponsors
 * - Integration with rewards points system
 */

class ARHuntManager {
  constructor() {
    this.storageKey = 'gcr_ar_hunts';
    this.progressKey = 'gcr_ar_progress';
    this.hunts = this.loadHunts();
    this.userProgress = this.loadUserProgress();

    console.log('🎯 AR Hunt Manager initialized');
  }

  // Load hunts from storage
  loadHunts() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading AR hunts:', error);
      return [];
    }
  }

  // Save hunts to storage
  saveHunts() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.hunts));
    } catch (error) {
      console.error('Error saving AR hunts:', error);
    }
  }

  // Load user progress
  loadUserProgress() {
    try {
      const stored = localStorage.getItem(this.progressKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading user progress:', error);
      return {};
    }
  }

  // Save user progress
  saveUserProgress() {
    try {
      localStorage.setItem(this.progressKey, JSON.stringify(this.userProgress));
    } catch (error) {
      console.error('Error saving user progress:', error);
    }
  }

  // Create new sponsor hunt (business creates their own hunt)
  createSponsorHunt(sponsorData) {
    const hunt = {
      id: 'hunt_' + Date.now(),
      sponsorId: sponsorData.sponsorId,
      sponsorName: sponsorData.sponsorName,
      sponsorLogo: sponsorData.sponsorLogo || null,
      name: sponsorData.name, // e.g., "The Gulf's Beach Treasure Hunt"
      description: sponsorData.description,
      prize: {
        type: sponsorData.prize.type, // 'discount', 'free_item', 'gift_card', 'experience', 'custom'
        value: sponsorData.prize.value, // e.g., "$50 gift card", "Free appetizer", "20% off"
        description: sponsorData.prize.description,
        code: sponsorData.prize.code || this.generatePrizeCode()
      },
      numItems: sponsorData.numItems || 5, // Sponsor decides how many items
      items: [], // Will be populated with GPS locations
      active: sponsorData.active !== undefined ? sponsorData.active : true,
      startDate: sponsorData.startDate || new Date().toISOString(),
      endDate: sponsorData.endDate || null, // null = no end date (ongoing)
      createdAt: new Date().toISOString(),
      stats: {
        participants: 0,
        completions: 0,
        totalCollections: 0
      }
    };

    this.hunts.push(hunt);
    this.saveHunts();

    console.log(`🎯 Created sponsor hunt: ${hunt.name} by ${hunt.sponsorName}`);
    return hunt;
  }

  // Add GPS-located item to hunt (can be anywhere in town)
  addItemToHunt(huntId, itemData) {
    const hunt = this.hunts.find(h => h.id === huntId);
    if (!hunt) {
      console.error('Hunt not found');
      return false;
    }

    const item = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: itemData.name,
      description: itemData.description,
      hint: itemData.hint, // e.g., "Near the lighthouse at sunset beach"
      location: {
        lat: itemData.location.lat,
        lng: itemData.location.lng,
        address: itemData.location.address || null, // Optional address
        placeName: itemData.location.placeName || null // e.g., "Gulf State Park Pier"
      },
      captureRadius: itemData.captureRadius || 50, // Meters - how close user needs to be
      modelUrl: itemData.modelUrl, // URL to 3D model (GLTF/GLB)
      modelType: itemData.modelType || 'gltf', // gltf, glb, or image
      imageUrl: itemData.imageUrl, // Fallback 2D image
      icon: itemData.icon || '🎁',
      points: itemData.points || 25,
      qrCode: this.generateQRCode(huntId, item.id), // QR code as backup
      collectedCount: 0,
      addedAt: new Date().toISOString()
    };

    hunt.items.push(item);
    this.saveHunts();

    console.log(`Added item "${item.name}" at ${item.location.placeName || 'location'}`);
    return item;
  }

  // Remove item from hunt
  removeItemFromHunt(huntId, itemId) {
    const hunt = this.hunts.find(h => h.id === huntId);
    if (!hunt) return false;

    const index = hunt.items.findIndex(i => i.id === itemId);
    if (index === -1) return false;

    hunt.items.splice(index, 1);
    this.saveHunts();
    return true;
  }

  // Update item location (move it to a new spot)
  updateItemLocation(huntId, itemId, newLocation) {
    const hunt = this.hunts.find(h => h.id === huntId);
    if (!hunt) return false;

    const item = hunt.items.find(i => i.id === itemId);
    if (!item) return false;

    item.location = {
      ...item.location,
      ...newLocation,
      updatedAt: new Date().toISOString()
    };

    this.saveHunts();
    return true;
  }

  // Generate QR code (backup for GPS)
  generateQRCode(huntId, itemId) {
    return `GCR_AR_${huntId}_${itemId}_${Date.now().toString(36)}`.toUpperCase();
  }

  // Generate prize redemption code
  generatePrizeCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'PRIZE-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Get all active hunts
  getActiveHunts() {
    const now = new Date();
    return this.hunts.filter(hunt => {
      if (!hunt.active) return false;

      // Check if expired
      if (hunt.endDate) {
        const end = new Date(hunt.endDate);
        if (now > end) return false;
      }

      return true;
    });
  }

  // Get nearby items (Pokémon GO style - show items near user)
  getNearbyItems(userLat, userLng, radiusMeters = 500) {
    const activeHunts = this.getActiveHunts();
    const nearbyItems = [];

    for (const hunt of activeHunts) {
      for (const item of hunt.items) {
        const distance = this.calculateDistance(
          userLat, userLng,
          item.location.lat, item.location.lng
        );

        if (distance <= radiusMeters) {
          nearbyItems.push({
            ...item,
            huntId: hunt.id,
            huntName: hunt.name,
            sponsorName: hunt.sponsorName,
            distance: distance,
            prize: hunt.prize
          });
        }
      }
    }

    return nearbyItems.sort((a, b) => a.distance - b.distance);
  }

  // Calculate distance between two GPS points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Check if user is in range to collect item
  canCollectItem(userLat, userLng, itemLat, itemLng, captureRadius) {
    const distance = this.calculateDistance(userLat, userLng, itemLat, itemLng);
    return distance <= captureRadius;
  }

  // Get user's progress for a specific hunt
  getUserProgress(phoneNumber, huntId) {
    const normalized = this.normalizePhone(phoneNumber);

    if (!this.userProgress[normalized]) {
      this.userProgress[normalized] = {};
    }

    if (!this.userProgress[normalized][huntId]) {
      this.userProgress[normalized][huntId] = {
        phone: phoneNumber,
        huntId: huntId,
        collectedItems: [],
        startedAt: new Date().toISOString(),
        completedAt: null,
        prizeRedeemed: false,
        prizeRedeemedAt: null,
        totalPoints: 0
      };
      this.saveUserProgress();
    }

    return this.userProgress[normalized][huntId];
  }

  // Normalize phone number
  normalizePhone(phone) {
    return phone.replace(/\D/g, '');
  }

  // Collect item (when user is in GPS range or scans QR)
  collectItem(phoneNumber, huntId, itemId, userLocation = null) {
    const hunt = this.hunts.find(h => h.id === huntId);
    if (!hunt) {
      return { success: false, error: 'Hunt not found' };
    }

    const item = hunt.items.find(i => i.id === itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    const progress = this.getUserProgress(phoneNumber, huntId);

    // Check if already collected
    if (progress.collectedItems.some(ci => ci.itemId === itemId)) {
      return { success: false, error: 'Already collected', alreadyCollected: true };
    }

    // Verify GPS proximity (if location provided)
    if (userLocation) {
      const inRange = this.canCollectItem(
        userLocation.lat, userLocation.lng,
        item.location.lat, item.location.lng,
        item.captureRadius
      );

      if (!inRange) {
        return {
          success: false,
          error: 'Too far away',
          distance: this.calculateDistance(
            userLocation.lat, userLocation.lng,
            item.location.lat, item.location.lng
          )
        };
      }
    }

    // Add to collected items
    const collection = {
      itemId: item.id,
      itemName: item.name,
      location: item.location,
      points: item.points,
      collectedAt: new Date().toISOString(),
      userLocation: userLocation
    };

    progress.collectedItems.push(collection);
    progress.totalPoints += item.points;

    // Check if hunt is complete
    const huntComplete = progress.collectedItems.length === hunt.items.length;
    if (huntComplete) {
      progress.completedAt = new Date().toISOString();
      hunt.stats.completions++;

      // Award completion bonus
      const completionBonus = 50;
      progress.totalPoints += completionBonus;

      console.log(`🎉 ${phoneNumber} completed hunt: ${hunt.name}`);
    }

    // Update stats
    if (progress.collectedItems.length === 1) {
      hunt.stats.participants++;
    }
    hunt.stats.totalCollections++;
    item.collectedCount++;

    this.saveUserProgress();
    this.saveHunts();

    // Award points via rewards system
    if (window.rewardsManager) {
      window.rewardsManager.awardPoints(phoneNumber, 'ar_game_complete', {
        huntId: huntId,
        huntName: hunt.name,
        itemId: itemId,
        itemName: item.name,
        sponsorName: hunt.sponsorName
      });

      // Award completion bonus if hunt completed
      if (huntComplete) {
        window.rewardsManager.awardPoints(phoneNumber, 'ar_game_complete', {
          huntId: huntId,
          huntName: hunt.name,
          completionBonus: true
        });
      }
    }

    // Track in Google Analytics
    if (typeof gtag === 'function') {
      gtag('event', 'ar_item_collected', {
        hunt_id: huntId,
        hunt_name: hunt.name,
        item_id: itemId,
        item_name: item.name,
        sponsor: hunt.sponsorName,
        event_category: 'AR Hunt',
        event_label: 'Item Collected'
      });

      if (huntComplete) {
        gtag('event', 'ar_hunt_completed', {
          hunt_id: huntId,
          hunt_name: hunt.name,
          sponsor: hunt.sponsorName,
          items_count: hunt.items.length,
          event_category: 'AR Hunt',
          event_label: 'Hunt Completed'
        });
      }
    }

    return {
      success: true,
      item: item,
      progress: progress,
      pointsEarned: item.points,
      huntComplete: huntComplete,
      completionBonus: huntComplete ? 50 : 0,
      prize: huntComplete ? hunt.prize : null
    };
  }

  // Redeem prize (after completing hunt)
  redeemPrize(phoneNumber, huntId) {
    const progress = this.getUserProgress(phoneNumber, huntId);
    const hunt = this.hunts.find(h => h.id === huntId);

    if (!hunt) {
      return { success: false, error: 'Hunt not found' };
    }

    if (!progress.completedAt) {
      return { success: false, error: 'Hunt not completed yet' };
    }

    if (progress.prizeRedeemed) {
      return { success: false, error: 'Prize already redeemed' };
    }

    // Mark prize as redeemed
    progress.prizeRedeemed = true;
    progress.prizeRedeemedAt = new Date().toISOString();
    this.saveUserProgress();

    return {
      success: true,
      prize: hunt.prize,
      message: `Prize redeemed! Show code to ${hunt.sponsorName}`
    };
  }

  // Get all hunts for a specific sponsor
  getSponsorHunts(sponsorId) {
    return this.hunts.filter(h => h.sponsorId === sponsorId);
  }

  // Get hunt by ID
  getHunt(huntId) {
    return this.hunts.find(h => h.id === huntId);
  }

  // Get all hunts (admin use)
  getAllHunts() {
    return this.hunts;
  }

  // Create new hunt
  createHunt(huntData) {
    const hunt = {
      id: `hunt_${Date.now()}`,
      brandName: huntData.brandName,
      brandImage: huntData.brandImage,
      description: huntData.description || '',
      location: {
        lat: huntData.location.lat,
        lng: huntData.location.lng,
        address: huntData.location.address || '',
        hint: huntData.location.hint || '',
        isCustom: huntData.location.isCustom !== false
      },
      difficulty: huntData.difficulty || 'medium',
      reward: {
        type: huntData.reward?.type || 'custom',
        value: huntData.reward?.value || '',
        description: huntData.reward?.description || '',
        code: huntData.reward?.code || this.generateRewardCode()
      },
      pointsValue: huntData.pointsValue || 100,
      active: huntData.active !== false,
      createdAt: new Date().toISOString(),
      captures: 0,
      captureLocations: []
    };

    this.hunts.push(hunt);
    this.saveHunts();

    console.log(`✅ AR Hunt created: ${hunt.brandName} (${hunt.id})`);
    return hunt;
  }

  // Generate reward code
  generateRewardCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Update hunt
  updateHunt(huntId, updates) {
    const hunt = this.hunts.find(h => h.id === huntId);
    if (!hunt) return false;

    Object.assign(hunt, updates);
    this.saveHunts();
    return true;
  }

  // Delete hunt
  deleteHunt(huntId) {
    const index = this.hunts.findIndex(h => h.id === huntId);
    if (index === -1) return false;

    this.hunts.splice(index, 1);
    this.saveHunts();
    return true;
  }

  // Capture hunt (user found and photographed AR object)
  captureHunt(huntId, phoneNumber, location, photoData = null) {
    const hunt = this.getHunt(huntId);
    if (!hunt) {
      console.error('Hunt not found:', huntId);
      return { success: false, error: 'Hunt not found' };
    }

    if (!hunt.active) {
      return { success: false, error: 'Hunt is not active' };
    }

    const normalized = this.normalizePhone(phoneNumber);

    // Initialize capture history if it doesn't exist
    if (!hunt.captureHistory) {
      hunt.captureHistory = [];
    }

    // Check if user already captured this hunt
    const alreadyCaptured = hunt.captureHistory.some(
      capture => capture.phone === normalized
    );

    if (alreadyCaptured) {
      return {
        success: false,
        error: 'You already captured this hunt!',
        duplicate: true
      };
    }

    // Record the capture
    const capture = {
      id: `capture_${Date.now()}`,
      phone: normalized,
      timestamp: new Date().toISOString(),
      location: {
        lat: location.lat,
        lng: location.lng
      },
      photoData: photoData, // Base64 or URL of captured photo
      rewardCode: hunt.reward?.code || null,
      pointsEarned: hunt.pointsValue || 100
    };

    hunt.captureHistory.push(capture);
    hunt.captures = (hunt.captures || 0) + 1;

    // Update user progress
    if (!this.userProgress[normalized]) {
      this.userProgress[normalized] = {};
    }

    if (!this.userProgress[normalized][huntId]) {
      this.userProgress[normalized][huntId] = {
        phone: phoneNumber,
        captures: [],
        totalPoints: 0,
        firstCaptureAt: null
      };
    }

    const userHuntProgress = this.userProgress[normalized][huntId];
    userHuntProgress.captures.push(capture);
    userHuntProgress.totalPoints += capture.pointsEarned;

    if (!userHuntProgress.firstCaptureAt) {
      userHuntProgress.firstCaptureAt = capture.timestamp;
    }

    // Save everything
    this.saveHunts();
    this.saveUserProgress();

    console.log(`✅ Hunt captured by ${phoneNumber}: ${hunt.brandName}`);

    return {
      success: true,
      capture: capture,
      totalPoints: userHuntProgress.totalPoints,
      reward: hunt.reward
    };
  }

  // Get capture history for a hunt
  getCaptureHistory(huntId) {
    const hunt = this.getHunt(huntId);
    if (!hunt) return [];
    return hunt.captureHistory || [];
  }

  // Get user's capture history
  getUserCaptures(phoneNumber) {
    const normalized = this.normalizePhone(phoneNumber);
    const userProgress = this.userProgress[normalized] || {};

    const captures = [];
    for (const [huntId, progress] of Object.entries(userProgress)) {
      const hunt = this.getHunt(huntId);
      if (hunt && progress.captures) {
        progress.captures.forEach(capture => {
          captures.push({
            ...capture,
            huntId: huntId,
            huntName: hunt.brandName,
            huntImage: hunt.brandImage
          });
        });
      }
    }

    return captures.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  // Get all captures across all hunts (for admin)
  getAllCaptures() {
    const allCaptures = [];

    this.hunts.forEach(hunt => {
      if (hunt.captureHistory) {
        hunt.captureHistory.forEach(capture => {
          allCaptures.push({
            ...capture,
            huntId: hunt.id,
            huntName: hunt.brandName,
            huntImage: hunt.brandImage,
            huntDifficulty: hunt.difficulty
          });
        });
      }
    });

    return allCaptures.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  // Get user's overview (all hunts progress)
  getUserOverview(phoneNumber) {
    const normalized = this.normalizePhone(phoneNumber);
    const userProgress = this.userProgress[normalized] || {};
    const activeHunts = this.getActiveHunts();

    return activeHunts.map(hunt => {
      const progress = userProgress[hunt.id] || {
        collectedItems: [],
        completedAt: null,
        prizeRedeemed: false,
        totalPoints: 0
      };

      return {
        huntId: hunt.id,
        huntName: hunt.name,
        sponsorName: hunt.sponsorName,
        sponsorLogo: hunt.sponsorLogo,
        prize: hunt.prize,
        totalItems: hunt.items.length,
        collectedItems: progress.collectedItems.length,
        percentage: Math.round((progress.collectedItems.length / hunt.items.length) * 100),
        completed: !!progress.completedAt,
        prizeRedeemed: progress.prizeRedeemed,
        totalPoints: progress.totalPoints
      };
    });
  }

  // Get leaderboard for a hunt
  getHuntLeaderboard(huntId, limit = 10) {
    const leaderboard = [];

    for (const [phone, hunts] of Object.entries(this.userProgress)) {
      if (hunts[huntId]) {
        const progress = hunts[huntId];
        leaderboard.push({
          phone: progress.phone.slice(-4),
          collected: progress.collectedItems.length,
          completed: !!progress.completedAt,
          completedAt: progress.completedAt,
          totalPoints: progress.totalPoints
        });
      }
    }

    return leaderboard
      .sort((a, b) => {
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        if (a.collected !== b.collected) return b.collected - a.collected;
        if (a.completedAt && b.completedAt) {
          return new Date(a.completedAt) - new Date(b.completedAt);
        }
        return 0;
      })
      .slice(0, limit)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry
      }));
  }

  // Get stats for a hunt (admin/sponsor view)
  getHuntStats(huntId) {
    const hunt = this.getHunt(huntId);
    if (!hunt) return null;

    const participants = [];
    for (const [phone, hunts] of Object.entries(this.userProgress)) {
      if (hunts[huntId]) {
        participants.push(hunts[huntId]);
      }
    }

    const completed = participants.filter(p => p.completedAt).length;
    const prizesRedeemed = participants.filter(p => p.prizeRedeemed).length;

    return {
      huntId: hunt.id,
      huntName: hunt.name,
      sponsorName: hunt.sponsorName,
      participants: participants.length,
      completed: completed,
      inProgress: participants.length - completed,
      completionRate: participants.length > 0 ? Math.round((completed / participants.length) * 100) : 0,
      prizesRedeemed: prizesRedeemed,
      prizeRedemptionRate: completed > 0 ? Math.round((prizesRedeemed / completed) * 100) : 0,
      totalCollections: hunt.stats.totalCollections
    };
  }
}

// Initialize global AR Hunt Manager
window.arHuntManager = new ARHuntManager();
