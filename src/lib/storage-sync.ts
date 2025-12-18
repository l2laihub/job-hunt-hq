/**
 * Cross-tab localStorage synchronization utility
 *
 * This module provides utilities for synchronizing Zustand stores across
 * browser tabs/windows using the 'storage' event and BroadcastChannel API.
 */

type StoreSyncCallback = (newValue: unknown) => void;

interface SyncSubscription {
  key: string;
  callback: StoreSyncCallback;
}

// Track active subscriptions
const subscriptions = new Map<string, Set<StoreSyncCallback>>();

// BroadcastChannel for same-origin sync (more reliable than storage event)
let broadcastChannel: BroadcastChannel | null = null;

/**
 * Initialize the cross-tab sync system
 */
export function initStorageSync(): void {
  // Set up storage event listener for cross-tab sync
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);

    // Use BroadcastChannel if available (better for same-origin tabs)
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('jobhunt-hq-sync');
      broadcastChannel.onmessage = handleBroadcastMessage;
    }
  }
}

/**
 * Clean up the sync system
 */
export function destroyStorageSync(): void {
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', handleStorageEvent);
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  }
  subscriptions.clear();
}

/**
 * Handle storage events from other tabs
 */
function handleStorageEvent(event: StorageEvent): void {
  if (!event.key || !event.newValue) return;

  const callbacks = subscriptions.get(event.key);
  if (callbacks) {
    try {
      const parsed = JSON.parse(event.newValue);
      callbacks.forEach(callback => callback(parsed));
    } catch (error) {
      console.error('[StorageSync] Failed to parse storage event:', error);
    }
  }
}

/**
 * Handle broadcast messages from same-origin tabs
 */
function handleBroadcastMessage(event: MessageEvent): void {
  const { key, value } = event.data;
  if (!key || value === undefined) return;

  const callbacks = subscriptions.get(key);
  if (callbacks) {
    callbacks.forEach(callback => callback(value));
  }
}

/**
 * Subscribe to changes for a specific storage key
 */
export function subscribeToStorage(key: string, callback: StoreSyncCallback): () => void {
  if (!subscriptions.has(key)) {
    subscriptions.set(key, new Set());
  }
  subscriptions.get(key)!.add(callback);

  // Return unsubscribe function
  return () => {
    const callbacks = subscriptions.get(key);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        subscriptions.delete(key);
      }
    }
  };
}

/**
 * Broadcast a storage change to other tabs
 */
export function broadcastStorageChange(key: string, value: unknown): void {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ key, value });
  }
}

/**
 * Create a Zustand storage that syncs across tabs
 * This wraps the default localStorage with cross-tab sync capabilities
 */
export function createSyncedStorage() {
  return {
    getItem: (name: string): string | null => {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(name);
    },
    setItem: (name: string, value: string): void => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(name, value);
      // Broadcast to other tabs
      try {
        broadcastStorageChange(name, JSON.parse(value));
      } catch {
        // Ignore parse errors
      }
    },
    removeItem: (name: string): void => {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(name);
    },
  };
}

/**
 * Hook to sync a Zustand store with cross-tab updates
 * Call this in your store definition to enable cross-tab sync
 */
export function setupStoreSync<T>(
  storageKey: string,
  setState: (state: Partial<T>) => void,
  getPersistedKeys: () => (keyof T)[]
): () => void {
  return subscribeToStorage(storageKey, (newValue: unknown) => {
    if (newValue && typeof newValue === 'object' && 'state' in newValue) {
      const persistedState = (newValue as { state: Partial<T> }).state;
      const keys = getPersistedKeys();

      // Only update the persisted keys
      const updates: Partial<T> = {};
      for (const key of keys) {
        if (key in persistedState) {
          updates[key] = persistedState[key];
        }
      }

      if (Object.keys(updates).length > 0) {
        setState(updates);
      }
    }
  });
}
