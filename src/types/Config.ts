/**
 * Configuration interfaces for the Steam client
 */

/**
 * Main configuration interface for SteamClient
 */
export interface SteamClientConfig {
  /** Steam Web API key (required) */
  apiKey: string;

  /** Cache TTL in milliseconds (default: 3600000 = 1 hour) */
  cacheTTL?: number;

  /** Maximum number of cache entries (default: 1000) */
  cacheSize?: number;

  /** Rate limiting configuration */
  rateLimit?: {
    /** Maximum number of requests (default: 200) */
    requests: number;
    /** Time window in milliseconds (default: 300000 = 5 minutes) */
    perMs: number;
  };

  /** Custom user agent string */
  userAgent?: string;

  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Search options for game queries
 */
export interface SearchOptions {
  /** Fuse.js fuzzy match threshold 0-1 (default: 0.3, lower = stricter) */
  fuzzyThreshold?: number;

  /** Include adult content games in results (default: false) */
  includeAdult?: boolean;

  /** Skip cache lookup and fetch fresh data (default: false) */
  bypassCache?: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of entries in app list cache */
  appListSize: number;

  /** Number of entries in details cache */
  detailsCacheSize: number;

  /** Cache hit rate (0-1) */
  hitRate: number;
}
