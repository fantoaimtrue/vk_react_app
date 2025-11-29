/**
 * Tracking utilities for VK Ads campaign parameters
 * Handles parsing, persistence, and URL building for leads.tech integration
 */

/**
 * @typedef {Object} TrackingData
 * @property {string} [ref] - Campaign ref parameter
 * @property {string} [ref_source] - Campaign ref_source parameter
 * @property {string} [utm_source] - UTM source
 * @property {string} [utm_medium] - UTM medium
 * @property {string} [utm_campaign] - UTM campaign
 * @property {string} [utm_content] - UTM content
 * @property {string} [utm_term] - UTM term
 * @property {string|number} [vk_user_id] - VK user ID
 */

const STORAGE_KEY = '__vk_tracking__';

/**
 * Filters out invalid tracking values
 * @param {string} value - Value to filter
 * @returns {string|null} - Filtered value or null
 */
const filterValue = (value) => {
  if (!value) return null;
  
  let cleanValue = String(value);
  
  // Decode URL encoding
  try {
    cleanValue = decodeURIComponent(cleanValue);
  } catch (e) {
    // If decoding fails, keep as is
  }
  
  // Check for unreplaced VK macros
  if (cleanValue.includes('{{') || cleanValue.includes('}}')) {
    return null;
  }
  
  // Remove single braces { } (incorrect VK format)
  cleanValue = cleanValue.replace(/^\{([^}]+)\}$/, '$1');
  
  // Check for empty after cleanup
  if (!cleanValue || cleanValue.trim() === '') return null;
  
  const lowerValue = cleanValue.toLowerCase();
  // Filter out invalid values
  if (['other', 'unknown', 'null', 'undefined', 'none', 'test', ''].includes(lowerValue)) {
    return null;
  }
  
  return cleanValue.trim();
};

/**
 * Extracts tracking parameters from URL (both query string and hash)
 * @returns {TrackingData} - Extracted tracking data
 */
export const extractTrackingFromURL = () => {
  const trackingData = {};

  // Get parameters from query string (?param=value)
  const urlParams = new URLSearchParams(window.location.search);
  
  // Get parameters from hash (#param=value or #/?param=value)
  // VK Mini Apps often pass parameters in hash!
  let hashToUse = window.location.hash;
  const savedHash = sessionStorage.getItem('originalHash');
  if (savedHash && savedHash !== '#' && savedHash !== '#/') {
    hashToUse = savedHash;
  }
  
  let hashString = hashToUse.substring(1); // Remove #
  // Remove leading slashes and question marks
  hashString = hashString.replace(/^[\/\?]+/, '');
  const hashParams = new URLSearchParams(hashString);

  // Keys to extract
  const trackingKeys = [
    'ref', 'ref_source',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'vk_user_id', 'user_id'
  ];

  // Extract from query string first
  trackingKeys.forEach(key => {
    const value = urlParams.get(key);
    if (value) {
      const filtered = filterValue(value);
      if (filtered) {
        trackingData[key] = filtered;
      }
    }
  });

  // Extract from hash (hash has priority if value is not empty)
  trackingKeys.forEach(key => {
    const value = hashParams.get(key);
    if (value) {
      const filtered = filterValue(value);
      if (filtered) {
        trackingData[key] = filtered;
      }
    }
  });

  // Normalize vk_user_id and user_id
  if (trackingData.user_id && !trackingData.vk_user_id) {
    trackingData.vk_user_id = trackingData.user_id;
  }

  return trackingData;
};

/**
 * Saves tracking data to localStorage
 * @param {TrackingData} trackingData - Tracking data to save
 */
export const saveTrackingToStorage = (trackingData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trackingData));
  } catch (error) {
    console.warn('Failed to save tracking data to localStorage:', error);
  }
};

/**
 * Loads tracking data from localStorage
 * @returns {TrackingData|null} - Loaded tracking data or null
 */
export const loadTrackingFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load tracking data from localStorage:', error);
  }
  return null;
};

/**
 * Builds a tracked URL by appending sub2, sub3, sub4 and sub5 parameters to the base URL
 * sub2 = vk_bot (always)
 * sub3 = vk_mini_app (always)
 * sub4 = ref (if exists)
 * sub5 = ref_source (if exists)
 * 
 * @param {string} baseUrl - Base URL to append parameters to
 * @param {TrackingData} tracking - Tracking data containing ref and ref_source
 * @returns {string} - URL with sub2, sub3, sub4 and sub5 appended
 */
export const buildTrackedUrl = (baseUrl, tracking) => {
  if (!baseUrl) {
    return '';
  }

  if (!tracking) {
    tracking = {};
  }

  try {
    // Try to parse as absolute URL
    const url = new URL(baseUrl);
    
    // Always append sub2 and sub3
    url.searchParams.set('sub2', 'vk_bot');
    url.searchParams.set('sub3', 'vk_mini_app');
    
    // Append sub4 if ref exists
    if (tracking.ref) {
      url.searchParams.set('sub4', tracking.ref);
    }
    
    // Append sub5 if ref_source exists
    if (tracking.ref_source) {
      url.searchParams.set('sub5', tracking.ref_source);
    }
    
    return url.toString();
  } catch (e) {
    // If URL parsing fails (relative URL or invalid), append manually
    const separator = baseUrl.includes('?') ? '&' : '?';
    const params = [];
    
    // Always add sub2 and sub3
    params.push('sub2=vk_bot');
    params.push('sub3=vk_mini_app');
    
    // Append sub4 if ref exists
    if (tracking.ref) {
      params.push(`sub4=${encodeURIComponent(tracking.ref)}`);
    }
    
    // Append sub5 if ref_source exists
    if (tracking.ref_source) {
      params.push(`sub5=${encodeURIComponent(tracking.ref_source)}`);
    }
    
    return `${baseUrl}${separator}${params.join('&')}`;
  }
};

