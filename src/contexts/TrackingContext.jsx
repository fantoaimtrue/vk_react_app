import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import vkBridge from '@vkontakte/vk-bridge';
import {
  extractTrackingFromURL,
  saveTrackingToStorage,
  loadTrackingFromStorage,
  buildTrackedUrl
} from '../utils/tracking';
import logger from '../utils/logger';

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

const TrackingContext = createContext(null);

/**
 * TrackingProvider - Provides tracking data throughout the app
 * Initializes tracking on app start, persists to localStorage, and provides tracking utilities
 */
export const TrackingProvider = ({ children }) => {
  const [tracking, setTracking] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initializes tracking data from URL, VK Bridge, and localStorage
   */
  const initializeTracking = useCallback(async () => {
    try {
      logger.debug('🔍 [TrackingProvider] Initializing tracking...');

      // Start with URL parameters (fastest, synchronous)
      const urlTracking = extractTrackingFromURL();
      logger.debug('🔍 [TrackingProvider] URL tracking data:', urlTracking);

      // Try to get VK user ID from VK Bridge
      let vkUserId = urlTracking.vk_user_id || urlTracking.user_id;
      
      try {
        const vkDataPromise = vkBridge.send('VKWebAppGetUserInfo').catch(() => ({}));
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('VK Bridge timeout')), 1000)
        );
        
        const userInfo = await Promise.race([vkDataPromise, timeoutPromise]);
        if (userInfo && userInfo.id) {
          vkUserId = userInfo.id;
        }
      } catch (vkError) {
        logger.debug('⚠️ [TrackingProvider] VK Bridge unavailable (not critical):', vkError);
      }

      // Combine URL tracking with VK user ID
      const combinedTracking = {
        ...urlTracking,
        vk_user_id: vkUserId || urlTracking.vk_user_id || urlTracking.user_id || null
      };

      // If we have tracking data, save it
      if (Object.keys(combinedTracking).length > 0) {
        saveTrackingToStorage(combinedTracking);
        logger.info('✅ [TrackingProvider] Tracking data initialized:', combinedTracking);
      } else {
        // Try to load from localStorage if URL has no tracking data
        const stored = loadTrackingFromStorage();
        if (stored) {
          // Merge stored data with any new VK user ID
          const merged = {
            ...stored,
            vk_user_id: vkUserId || stored.vk_user_id || null
          };
          setTracking(merged);
          saveTrackingToStorage(merged);
          logger.info('✅ [TrackingProvider] Loaded tracking data from storage:', merged);
          setIsInitialized(true);
          return;
        }
      }

      setTracking(combinedTracking);
      setIsInitialized(true);

      // Optional: Send tracking session to backend for analytics
      if (combinedTracking.vk_user_id && (combinedTracking.ref || combinedTracking.ref_source)) {
        // Call backend asynchronously, don't block initialization
        fetch('/api/track-session/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vk_user_id: combinedTracking.vk_user_id,
            ref: combinedTracking.ref,
            ref_source: combinedTracking.ref_source,
            utm_source: combinedTracking.utm_source,
            utm_medium: combinedTracking.utm_medium,
            utm_campaign: combinedTracking.utm_campaign,
            utm_content: combinedTracking.utm_content,
            utm_term: combinedTracking.utm_term
          })
        }).catch(err => {
          logger.debug('⚠️ [TrackingProvider] Failed to send session to backend (not critical):', err);
        });
      }
    } catch (error) {
      logger.error('❌ [TrackingProvider] Error initializing tracking:', error);
      // Try to load from storage as fallback
      const stored = loadTrackingFromStorage();
      if (stored) {
        setTracking(stored);
      } else {
        setTracking({});
      }
      setIsInitialized(true);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeTracking();
  }, [initializeTracking]);

  /**
   * Updates tracking data (for dynamic changes)
   */
  const updateTracking = useCallback((newData) => {
    setTracking(prev => {
      const updated = { ...prev, ...newData };
      saveTrackingToStorage(updated);
      return updated;
    });
  }, []);

  /**
   * Builds a tracked URL with sub4/sub5 parameters
   */
  const buildUrl = useCallback((baseUrl) => {
    return buildTrackedUrl(baseUrl, tracking || {});
  }, [tracking]);

  const value = {
    tracking: tracking || {},
    isInitialized,
    updateTracking,
    buildUrl
  };

  return (
    <TrackingContext.Provider value={value}>
      {children}
    </TrackingContext.Provider>
  );
};

/**
 * Hook to access tracking data and utilities
 * @returns {{ tracking: TrackingData, isInitialized: boolean, updateTracking: Function, buildUrl: Function }}
 */
export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error('useTracking must be used within TrackingProvider');
  }
  return context;
};

