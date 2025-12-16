import { CACHE_TTL } from '@/src/lib/constants';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class AIResponseCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly storagePrefix = 'jhq:cache:';

  /**
   * Generate a cache key from input parameters
   */
  generateKey(prefix: string, ...args: unknown[]): string {
    const hash = JSON.stringify(args);
    return `${prefix}:${this.simpleHash(hash)}`;
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    // Check memory cache first
    const memoryEntry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (memoryEntry) {
      if (Date.now() - memoryEntry.timestamp < memoryEntry.ttl) {
        return memoryEntry.data;
      }
      this.cache.delete(key);
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(this.storagePrefix + key);
      if (stored) {
        const entry = JSON.parse(stored) as CacheEntry<T>;
        if (Date.now() - entry.timestamp < entry.ttl) {
          // Restore to memory cache
          this.cache.set(key, entry);
          return entry.data;
        }
        // Expired, remove from storage
        localStorage.removeItem(this.storagePrefix + key);
      }
    } catch {
      // Ignore storage errors
    }

    return null;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl: number = CACHE_TTL.ANALYSIS): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Store in memory
    this.cache.set(key, entry);

    // Store in localStorage for persistence
    try {
      localStorage.setItem(this.storagePrefix + key, JSON.stringify(entry));
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }

  /**
   * Remove item from cache
   */
  remove(key: string): void {
    this.cache.delete(key);
    try {
      localStorage.removeItem(this.storagePrefix + key);
    } catch {
      // Ignore
    }
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.cache.clear();

    // Clear localStorage items with our prefix
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.storagePrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { memorySize: number; storageKeys: number } {
    let storageKeys = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.storagePrefix)) {
          storageKeys++;
        }
      }
    } catch {
      // Ignore
    }

    return {
      memorySize: this.cache.size,
      storageKeys,
    };
  }
}

// Export singleton instance
export const aiCache = new AIResponseCache();

// Helper functions for specific cache types
export const cacheKeys = {
  analysis: (jdHash: string) => `analysis:${jdHash}`,
  research: (company: string) => `research:${company.toLowerCase().replace(/\s+/g, '-')}`,
  storyMatch: (question: string, storyIds: string[]) =>
    `match:${aiCache.generateKey('match', question, storyIds.sort())}`,
};
