/**
 * CSV Import Manager - Handles import modes and merging
 * Supports: REPLACE, MERGE, and UPDATE SPECIFIC sections
 */

class CSVImportManager {
  constructor() {
    this.csvParser = new CSVImportSystem();
    this.importModes = {
      REPLACE: 'replace',
      MERGE: 'merge',
      UPDATE: 'update'
    };
  }

  /**
   * Import CSV with specified mode
   * @param {File} file - CSV file
   * @param {String} mode - Import mode (replace/merge/update)
   * @param {Array} sections - Sections to update (for UPDATE mode)
   * @returns {Promise<Object>} Import result
   */
  async importCSV(file, mode = 'replace', sections = []) {
    try {
      // Parse CSV
      const parsed = await this.csvParser.parseCSV(file);
      const newBusinesses = parsed.businesses;

      // Get existing businesses
      const existingBusinesses = window.gcrDataLoader.getAllBusinesses();

      let result;

      switch (mode) {
        case this.importModes.REPLACE:
          result = this.replaceMode(newBusinesses, existingBusinesses);
          break;

        case this.importModes.MERGE:
          result = this.mergeMode(newBusinesses, existingBusinesses);
          break;

        case this.importModes.UPDATE:
          result = this.updateMode(newBusinesses, existingBusinesses, sections);
          break;

        default:
          throw new Error('Invalid import mode');
      }

      // Save to localStorage
      localStorage.setItem('gcr_business_data', JSON.stringify(result.businesses));
      window.allBusinesses = result.businesses;

      // Sync to Supabase backend
      const syncResult = await this.syncToSupabase(result.businesses, mode);

      return {
        success: true,
        mode: mode,
        businessesAffected: result.affectedBusinessIds,
        itemsAdded: result.itemsAdded || 0,
        duplicatesSkipped: result.duplicatesSkipped || 0,
        warnings: parsed.warnings || [],
        supabaseSync: syncResult
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Import failed',
        errors: error.errors || []
      };
    }
  }

  /**
   * REPLACE MODE - Overwrite all data (keep images)
   */
  replaceMode(newBusinesses, existingBusinesses) {
    const affectedBusinessIds = [];

    newBusinesses.forEach(newBiz => {
      const existing = existingBusinesses.find(b => b.id === newBiz.id);

      if (existing && existing.image) {
        // Keep existing image
        newBiz.image = existing.image;
      }

      affectedBusinessIds.push(newBiz.id);
    });

    // Remove old businesses with same IDs, add new ones
    const otherBusinesses = existingBusinesses.filter(
      b => !affectedBusinessIds.includes(b.id)
    );

    return {
      businesses: [...otherBusinesses, ...newBusinesses],
      affectedBusinessIds: affectedBusinessIds
    };
  }

  /**
   * MERGE MODE - Add to existing with duplicate detection
   */
  mergeMode(newBusinesses, existingBusinesses) {
    let itemsAdded = 0;
    let duplicatesSkipped = 0;
    const affectedBusinessIds = [];

    newBusinesses.forEach(newBiz => {
      const existingIndex = existingBusinesses.findIndex(b => b.id === newBiz.id);

      if (existingIndex === -1) {
        // New business - add it
        existingBusinesses.push(newBiz);
        affectedBusinessIds.push(newBiz.id);
        itemsAdded++;
      } else {
        // Business exists - merge data
        const existing = existingBusinesses[existingIndex];

        // Merge menus
        if (newBiz.menus) {
          Object.keys(newBiz.menus).forEach(menuType => {
            if (!existing.menus) existing.menus = {};

            if (!existing.menus[menuType]) {
              // New menu type - add it
              existing.menus[menuType] = newBiz.menus[menuType];
              itemsAdded++;
            } else {
              // Menu exists - merge sections
              const newMenu = newBiz.menus[menuType];
              const existingMenu = existing.menus[menuType];

              Object.keys(newMenu.sections || {}).forEach(sectionKey => {
                if (!existingMenu.sections) existingMenu.sections = {};

                if (!existingMenu.sections[sectionKey]) {
                  // New section - add it
                  existingMenu.sections[sectionKey] = newMenu.sections[sectionKey];
                  itemsAdded += newMenu.sections[sectionKey].items.length;
                } else {
                  // Section exists - merge items
                  const newItems = newMenu.sections[sectionKey].items;
                  const existingItems = existingMenu.sections[sectionKey].items;

                  newItems.forEach(newItem => {
                    const isDuplicate = existingItems.some(
                      item => item.id === newItem.id || item.name === newItem.name
                    );

                    if (!isDuplicate) {
                      existingItems.push(newItem);
                      itemsAdded++;
                    } else {
                      duplicatesSkipped++;
                    }
                  });
                }
              });
            }
          });
        }

        // Merge specials
        if (newBiz.specials) {
          if (!existing.specials) existing.specials = [];

          newBiz.specials.forEach(newSpecial => {
            const isDuplicate = existing.specials.some(
              s => s.name === newSpecial.name && s.schedule === newSpecial.schedule
            );

            if (!isDuplicate) {
              existing.specials.push(newSpecial);
              itemsAdded++;
            } else {
              duplicatesSkipped++;
            }
          });
        }

        // Merge events
        if (newBiz.events) {
          if (!existing.events) existing.events = [];

          newBiz.events.forEach(newEvent => {
            const isDuplicate = existing.events.some(
              e => e.name === newEvent.name && e.day === newEvent.day && e.time === newEvent.time
            );

            if (!isDuplicate) {
              existing.events.push(newEvent);
              itemsAdded++;
            } else {
              duplicatesSkipped++;
            }
          });
        }

        // Merge happy hour
        if (newBiz.happyHour) {
          if (!existing.happyHour) {
            existing.happyHour = newBiz.happyHour;
            itemsAdded++;
          } else {
            // Merge happy hour items
            newBiz.happyHour.items.forEach(newItem => {
              const isDuplicate = existing.happyHour.items.some(
                item => item.id === newItem.id || item.name === newItem.name
              );

              if (!isDuplicate) {
                existing.happyHour.items.push(newItem);
                itemsAdded++;
              } else {
                duplicatesSkipped++;
              }
            });
          }
        }

        // Merge policies
        if (newBiz.policies) {
          if (!existing.policies) existing.policies = [];

          newBiz.policies.forEach(newPolicy => {
            const isDuplicate = existing.policies.some(
              p => p.type === newPolicy.type
            );

            if (!isDuplicate) {
              existing.policies.push(newPolicy);
              itemsAdded++;
            } else {
              // Update existing policy
              const existingPolicy = existing.policies.find(p => p.type === newPolicy.type);
              existingPolicy.value = newPolicy.value;
            }
          });
        }

        affectedBusinessIds.push(newBiz.id);
      }
    });

    return {
      businesses: existingBusinesses,
      affectedBusinessIds: affectedBusinessIds,
      itemsAdded: itemsAdded,
      duplicatesSkipped: duplicatesSkipped
    };
  }

  /**
   * UPDATE MODE - Replace only specific sections
   */
  updateMode(newBusinesses, existingBusinesses, sections) {
    let itemsAdded = 0;
    const affectedBusinessIds = [];

    newBusinesses.forEach(newBiz => {
      const existingIndex = existingBusinesses.findIndex(b => b.id === newBiz.id);

      if (existingIndex === -1) {
        // Business doesn't exist - add it with only selected sections
        const filteredBiz = this.filterBusinessSections(newBiz, sections);
        existingBusinesses.push(filteredBiz);
        affectedBusinessIds.push(newBiz.id);
        itemsAdded++;
      } else {
        // Business exists - update only selected sections
        const existing = existingBusinesses[existingIndex];

        sections.forEach(section => {
          switch (section) {
            case 'menus':
              existing.menus = newBiz.menus || {};
              break;
            case 'specials':
              existing.specials = newBiz.specials || [];
              break;
            case 'events':
              existing.events = newBiz.events || [];
              break;
            case 'happyHour':
              existing.happyHour = newBiz.happyHour || null;
              break;
            case 'hours':
              existing.hours = newBiz.hours || '';
              break;
            case 'policies':
              existing.policies = newBiz.policies || [];
              break;
          }
        });

        affectedBusinessIds.push(newBiz.id);
        itemsAdded++;
      }
    });

    return {
      businesses: existingBusinesses,
      affectedBusinessIds: affectedBusinessIds,
      itemsAdded: itemsAdded
    };
  }

  /**
   * Filter business to include only specified sections
   */
  filterBusinessSections(business, sections) {
    const filtered = {
      id: business.id,
      name: business.name,
      category: business.category,
      location: business.location
    };

    sections.forEach(section => {
      if (business[section]) {
        filtered[section] = business[section];
      }
    });

    return filtered;
  }

  /**
   * Sync businesses to Supabase backend
   * @param {Array} businesses - Businesses to sync
   * @param {String} mode - Import mode
   * @returns {Promise<Object>} Sync result
   */
  async syncToSupabase(businesses, mode) {
    try {
      console.log(`📤 Syncing ${businesses.length} businesses to Supabase...`);

      const adminToken = localStorage.getItem('cc_admin_token') || '';
      const response = await fetch((window.CC_API_BASE || 'https://cybercheck-api-database.vercel.app') + '/api/admin/gcr/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + adminToken
        },
        body: JSON.stringify({
          businesses: businesses,
          mode: mode
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Supabase sync successful: ${result.count} businesses saved`);

      return {
        success: true,
        count: result.count,
        message: result.message
      };

    } catch (error) {
      console.error('❌ Supabase sync failed:', error);
      return {
        success: false,
        error: error.message,
        warning: 'Data saved to localStorage but not synced to Supabase. Changes may not persist on page reload.'
      };
    }
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.CSVImportManager = CSVImportManager;
}
