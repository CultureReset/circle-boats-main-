/**
 * CSV Import System for GCR Business Data
 * Handles importing business data from CSV with 9 record types
 */

class CSVImportSystem {
  constructor() {
    this.recordTypes = {
      BUSINESS: 'BUSINESS',
      HOURS: 'HOURS',
      SERVICE_WINDOW: 'SERVICE_WINDOW',
      MENU_SECTION: 'MENU_SECTION',
      MENU_ITEM: 'MENU_ITEM',
      OPTION_GROUP: 'OPTION_GROUP',
      OPTION: 'OPTION',
      EVENT: 'EVENT',
      POLICY: 'POLICY'
    };

    this.menuTypes = ['breakfast', 'brunch', 'lunch', 'dinner', 'sunset', 'cocktails', 'wine', 'beer', 'desserts', 'happyhour', 'happy_hour'];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Parse CSV file and return structured data
   * @param {File} file - CSV file
   * @returns {Promise<Object>} Parsed business data
   */
  async parseCSV(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const csvText = e.target.result;
          const rows = this.parseCSVText(csvText);
          const businesses = this.processRows(rows);

          if (this.errors.length > 0) {
            reject({
              errors: this.errors,
              warnings: this.warnings
            });
          } else {
            resolve({
              businesses: businesses,
              warnings: this.warnings
            });
          }
        } catch (error) {
          reject({ errors: [error.message] });
        }
      };

      reader.onerror = () => reject({ errors: ['Failed to read file'] });
      reader.readAsText(file);
    });
  }

  /**
   * Parse CSV text into rows
   */
  parseCSVText(csvText) {
    const lines = csvText.split('\n');
    const headers = this.parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = this.parseCSVLine(lines[i]);
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse single CSV line (handles quoted fields)
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Process rows into business objects
   */
  processRows(rows) {
    const businessesMap = new Map();

    // First pass: Create business objects
    rows.forEach(row => {
      if (row.RecordType === this.recordTypes.BUSINESS) {
        const businessId = row.BusinessID;
        businessesMap.set(businessId, this.createBusinessObject(row));
      }
    });

    // Second pass: Add all other data
    rows.forEach(row => {
      const businessId = row.BusinessID;
      const business = businessesMap.get(businessId);

      if (!business) {
        this.warnings.push(`No business found for ${row.RecordType} record with BusinessID: ${businessId}`);
        return;
      }

      switch (row.RecordType) {
        case this.recordTypes.HOURS:
          this.addHours(business, row);
          break;
        case this.recordTypes.SERVICE_WINDOW:
          this.addServiceWindow(business, row);
          break;
        case this.recordTypes.MENU_SECTION:
          this.addMenuSection(business, row);
          break;
        case this.recordTypes.MENU_ITEM:
          this.addMenuItem(business, row);
          break;
        case this.recordTypes.OPTION_GROUP:
          this.addOptionGroup(business, row);
          break;
        case this.recordTypes.OPTION:
          this.addOption(business, row);
          break;
        case this.recordTypes.EVENT:
          this.addEvent(business, row);
          break;
        case this.recordTypes.POLICY:
          this.addPolicy(business, row);
          break;
      }
    });

    return Array.from(businessesMap.values());
  }

  /**
   * Create base business object
   */
  createBusinessObject(row) {
    // Parse tags - handle both pipe and comma separators
    let tags = [];
    if (row.Tags) {
      tags = row.Tags.includes('|')
        ? row.Tags.split('|').map(t => t.trim())
        : row.Tags.split(',').map(t => t.trim());
    }

    return {
      id: row.BusinessID || '',
      name: row.BusinessName || '',
      category: row.Category || 'restaurants', // Read from CSV, default to restaurants
      cuisine: row.Cuisine || '',
      location: row.City || '',
      address: row.Address || '',
      coordinates: {
        lat: parseFloat(row.Latitude) || 0,
        lng: parseFloat(row.Longitude) || 0
      },
      phone: row.Phone || '',
      email: row.Email || '',
      facebook: row.Facebook || '',
      instagram: row.Instagram || '',
      website: row.Website || '',
      image: row.ImageURL || '',
      rating: parseFloat(row.Rating) || 4.5,
      priceLevel: row.PriceLevel || '$$',
      reservationMethod: row.ReservationMethod || '',
      reservationPhone: row.ReservationPhone || '',
      reservationURL: row.ReservationURL || '',
      tags: tags,
      description: row.Description || '',
      hours: {},
      menus: {},
      happyHour: null,
      happyHourSpecials: [],
      specials: [],
      events: [],
      policies: []
    };
  }

  /**
   * Add hours to business
   */
  addHours(business, row) {
    const days = row.Days || '';
    const startTime = row.StartTimeLocal || '';
    const endTime = row.EndTimeLocal || '';
    const service = row.Service || '';

    if (days && startTime && endTime) {
      // Convert to day-by-day format for better parsing
      const daysList = this.parseDayRange(days);

      daysList.forEach(day => {
        const dayKey = day.toLowerCase();
        if (!business.hours[dayKey]) {
          business.hours[dayKey] = [];
        }

        business.hours[dayKey].push({
          service: service,
          open: startTime,
          close: endTime,
          display: `${startTime} - ${endTime}`
        });
      });
    }
  }

  /**
   * Parse day range into individual days
   */
  parseDayRange(dayString) {
    const days = [];
    const dayMap = {
      'sunday': 'Sunday', 'sun': 'Sunday',
      'monday': 'Monday', 'mon': 'Monday',
      'tuesday': 'Tuesday', 'tue': 'Tuesday', 'tues': 'Tuesday',
      'wednesday': 'Wednesday', 'wed': 'Wednesday',
      'thursday': 'Thursday', 'thu': 'Thursday', 'thurs': 'Thursday',
      'friday': 'Friday', 'fri': 'Friday',
      'saturday': 'Saturday', 'sat': 'Saturday'
    };

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const lower = dayString.toLowerCase();

    // Handle "daily" or "every day"
    if (lower.includes('daily') || lower === 'every day') {
      return allDays;
    }

    // Handle day ranges like "Monday-Friday"
    if (lower.includes('-')) {
      const parts = lower.split('-').map(p => p.trim());
      if (parts.length === 2) {
        const startDay = dayMap[parts[0]];
        const endDay = dayMap[parts[1]];

        if (startDay && endDay) {
          const startIndex = allDays.indexOf(startDay);
          const endIndex = allDays.indexOf(endDay);

          if (startIndex !== -1 && endIndex !== -1) {
            for (let i = startIndex; i <= endIndex; i++) {
              days.push(allDays[i]);
            }
            return days;
          }
        }
      }
    }

    // Check for individual day
    for (const [key, value] of Object.entries(dayMap)) {
      if (lower === key) {
        return [value];
      }
    }

    return days;
  }

  /**
   * Add service window (happy hours, specials, or service times)
   */
  addServiceWindow(business, row) {
    const days = row.Days || '';
    const startTime = row.StartTimeLocal || '';
    const endTime = row.EndTimeLocal || '';
    const windowName = row.WindowName || '';
    const isSpecial = row.IsSpecial === 'TRUE' || row.IsSpecial === 'true';
    const specialType = row.SpecialType || '';

    if (!days || !startTime || !endTime || !windowName) {
      this.warnings.push(`Incomplete SERVICE_WINDOW record: ${windowName}`);
      return;
    }

    // Parse days into array
    const daysList = this.parseDayRange(days);

    if (isSpecial) {
      // This is a price special (happy hour, daily deal, etc.)
      if (specialType === 'happy_hour') {
        // Add to happy hour specials array
        business.happyHourSpecials.push({
          name: windowName,
          days: daysList,
          day: days, // Keep original for display
          startTime: startTime,
          endTime: endTime,
          time: `${startTime} - ${endTime}`,
          category: 'Happy Hour',
          items: [] // Items will be added by MENU_ITEM records
        });
      } else {
        // Add to regular specials array (Taco Tuesday, Wing Wednesday, etc.)
        business.specials.push({
          name: windowName,
          days: daysList,
          day: days,
          startTime: startTime,
          endTime: endTime,
          time: `${startTime} - ${endTime}`,
          category: specialType || 'Special',
          description: windowName,
          items: []
        });
      }
    } else {
      // This is just a service time window (brunch, sunset menu, etc.)
      // Store in a serviceWindows array for reference
      if (!business.serviceWindows) {
        business.serviceWindows = [];
      }

      business.serviceWindows.push({
        name: windowName,
        days: daysList,
        startTime: startTime,
        endTime: endTime,
        type: specialType
      });
    }
  }

  /**
   * Add menu section
   */
  addMenuSection(business, row) {
    const menuId = row.MenuID ? row.MenuID.toLowerCase() : '';
    const mealPeriod = row.MealPeriod || '';
    const sectionId = row.SectionID || '';
    const sectionName = row.SectionName || '';

    // Detect menu type from MenuID (e.g., "menu_lunch" -> "lunch")
    const menuType = this.detectMenuType(menuId, mealPeriod);

    if (!menuType) {
      this.warnings.push(`Could not detect menu type from: ${menuId} / ${mealPeriod}`);
      return;
    }

    // Initialize menu if not exists
    if (!business.menus[menuType]) {
      business.menus[menuType] = {
        name: mealPeriod || this.capitalizeWords(menuType),
        hours: '',
        sections: {}
      };
    }

    // Add section
    const sectionKey = this.sanitizeKey(sectionName);
    if (!business.menus[menuType].sections[sectionKey]) {
      business.menus[menuType].sections[sectionKey] = {
        id: sectionId,
        name: sectionName,
        items: []
      };

      // Check if this is kids meals section
      if (sectionName.toLowerCase().includes('kids')) {
        business.menus[menuType].sections[sectionKey].ageRestriction = row.AgeMax || '12 and under';
      }
    }
  }

  /**
   * Add menu item
   */
  addMenuItem(business, row) {
    const menuId = row.MenuID ? row.MenuID.toLowerCase() : '';
    const mealPeriod = row.MealPeriod || '';
    const sectionName = row.SectionName || '';
    const itemId = row.ItemID || '';
    const itemName = row.ItemName || '';
    const price = row.Price || '';
    const priceType = row.PriceType || 'fixed';
    const description = row.ItemDescription || '';
    const size = row.Size || '';
    const itemTags = row.ItemTags || '';
    const optionGroupIDs = row.OptionGroupIDs || '';

    // Detect menu type
    const menuType = this.detectMenuType(menuId, mealPeriod);

    if (!menuType) {
      this.warnings.push(`Could not detect menu type for item: ${itemName}`);
      return;
    }

    // Initialize menu if not exists
    if (!business.menus[menuType]) {
      business.menus[menuType] = {
        name: mealPeriod || this.capitalizeWords(menuType),
        hours: '',
        sections: {}
      };
    }

    // Initialize section if not exists
    const sectionKey = this.sanitizeKey(sectionName);
    if (!business.menus[menuType].sections[sectionKey]) {
      business.menus[menuType].sections[sectionKey] = {
        name: sectionName,
        items: []
      };
    }

    // Parse tags
    const tags = itemTags ? (itemTags.includes('|') ? itemTags.split('|') : itemTags.split(',')).map(t => t.trim()) : [];

    // Create item object
    const item = {
      id: itemId,
      name: itemName,
      price: priceType === 'market' || price === 'market' ? 'Market Price' : price,
      priceType: priceType,
      description: description,
      size: size,
      tags: tags,
      optionGroupIDs: optionGroupIDs ? optionGroupIDs.split('|').map(id => id.trim()) : [],
      optionGroups: []
    };

    // Add to section
    business.menus[menuType].sections[sectionKey].items.push(item);
  }

  /**
   * Add option group (stores globally, linked by ID)
   */
  addOptionGroup(business, row) {
    const groupId = row.OptionGroupID || '';
    const groupName = row.OptionGroupName || '';
    const required = row.Required === 'TRUE' || row.Required === 'true';
    const minSelections = parseInt(row.MinSelections) || 0;
    const maxSelections = parseInt(row.MaxSelections) || 1;

    // Store option groups globally on business
    if (!business.optionGroups) {
      business.optionGroups = {};
    }

    business.optionGroups[groupId] = {
      id: groupId,
      name: groupName,
      required: required,
      minSelections: minSelections,
      maxSelections: maxSelections,
      options: []
    };
  }

  /**
   * Add option to option group
   */
  addOption(business, row) {
    const groupId = row.OptionGroupID || '';
    const optionName = row.OptionName || '';
    const priceDelta = parseFloat(row.OptionPriceDelta) || 0;
    const description = row.OptionDescription || '';
    const optionTags = row.OptionTags || '';

    if (!business.optionGroups || !business.optionGroups[groupId]) {
      this.warnings.push(`Option group ${groupId} not found for option: ${optionName}`);
      return;
    }

    // Add option to the group
    business.optionGroups[groupId].options.push({
      name: optionName,
      priceDelta: priceDelta,
      description: description,
      tags: optionTags ? optionTags.split('|').map(t => t.trim()) : []
    });
  }

  /**
   * Add event (entertainment/activity, NOT price promotion)
   */
  addEvent(business, row) {
    const eventId = row.EventID || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const eventCategory = row.EventCategory || '';
    const eventTitle = row.EventTitle || '';
    const startDate = row.StartDate || '';
    const startTime = row.StartTime || '';
    const endTime = row.EndTime || '';
    const recurrence = row.Recurrence || '';
    const artistName = row.ArtistName || '';
    const description = row.EventDescription || '';
    const admission = row.Admission || '';
    const eventPrice = row.EventPrice || '';

    // Parse recurrence into days array
    const daysOfWeek = this.parseRecurrenceIntoDays(recurrence);

    business.events.push({
      id: eventId,
      category: eventCategory,
      title: eventTitle,
      name: eventTitle, // Alias for compatibility
      startDate: startDate,
      startTime: startTime,
      endTime: endTime,
      time: `${startTime} - ${endTime}`,
      recurrence: recurrence,
      recurring: !startDate || recurrence.toLowerCase().includes('weekly') || recurrence.toLowerCase().includes('daily'),
      daysOfWeek: daysOfWeek,
      artist: artistName,
      description: description,
      admission: admission,
      price: eventPrice
    });
  }

  /**
   * Parse recurrence string into days of week array
   */
  parseRecurrenceIntoDays(recurrence) {
    const days = [];
    const lower = recurrence.toLowerCase();

    if (lower.includes('daily') || lower.includes('every day')) {
      return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    }

    if (lower.includes('sunday')) days.push('Sunday');
    if (lower.includes('monday')) days.push('Monday');
    if (lower.includes('tuesday')) days.push('Tuesday');
    if (lower.includes('wednesday')) days.push('Wednesday');
    if (lower.includes('thursday')) days.push('Thursday');
    if (lower.includes('friday')) days.push('Friday');
    if (lower.includes('saturday')) days.push('Saturday');

    return days;
  }

  /**
   * Add policy
   */
  addPolicy(business, row) {
    const policyType = row.PolicyType || '';
    const ageMax = row.AgeMax || '';
    const notes = row.Notes || '';

    business.policies.push({
      type: policyType,
      ageMax: ageMax,
      notes: notes,
      value: notes // Alias for compatibility
    });
  }


  /**
   * Detect menu type from MenuID or MenuName
   */
  detectMenuType(menuId, menuName) {
    const searchString = `${menuId} ${menuName}`.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check for happy hour variations first
    if (searchString.includes('happyhour') || searchString.includes('hh')) {
      return 'happyhour';
    }

    for (const type of this.menuTypes) {
      const cleanType = type.replace(/_/g, '');
      if (searchString.includes(cleanType)) {
        return type === 'happy_hour' ? 'happyhour' : type;
      }
    }

    return null;
  }

  /**
   * Sanitize key for object property
   */
  sanitizeKey(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Capitalize words
   */
  capitalizeWords(str) {
    return str.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.CSVImportSystem = CSVImportSystem;
}
