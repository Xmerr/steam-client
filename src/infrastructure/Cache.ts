import { LRUCache } from 'lru-cache';

/**
 * LRU cache with TTL support and statistics tracking
 */
export class Cache<K extends {}, V extends {}> {
  private cache: LRUCache<K, V, unknown>;
  private hits: number = 0;
  private misses: number = 0;

  /**
   * Create an LRU cache with TTL support
   *
   * @param maxSize - Maximum number of entries in cache
   * @param ttl - Time to live in milliseconds (default: 1 hour)
   *
   * @example
   * ```typescript
   * // Cache with max 1000 entries, 1 hour TTL
   * const cache = new Cache<string, GameDetails>(1000, 3600000);
   * ```
   */
  constructor(maxSize: number, ttl: number = 3600000) {
    this.cache = new LRUCache<K, V>({
      max: maxSize,
      ttl: ttl,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });
  }

  /**
   * Get value from cache
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found or expired
   *
   * @example
   * ```typescript
   * const details = cache.get('1091500');
   * if (details) {
   *   console.log('Cache hit!');
   * }
   * ```
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);

    if (value !== undefined) {
      this.hits++;
    } else {
      this.misses++;
    }

    return value;
  }

  /**
   * Set value in cache with optional custom TTL
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional custom TTL in milliseconds (overrides default)
   *
   * @example
   * ```typescript
   * cache.set('1091500', gameDetails);
   * // Or with custom TTL (24 hours)
   * cache.set('applist', allGames, 86400000);
   * ```
   */
  set(key: K, value: V, ttl?: number): void {
    this.cache.set(key, value, { ttl });
  }

  /**
   * Check if key exists in cache and is not expired
   *
   * @param key - Cache key
   * @returns true if key exists and not expired, false otherwise
   *
   * @example
   * ```typescript
   * if (cache.has('1091500')) {
   *   console.log('Key exists in cache');
   * }
   * ```
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear all cached entries and reset statistics
   *
   * @example
   * ```typescript
   * cache.clear();
   * console.log(cache.getStats()); // { size: 0, hitRate: 0 }
   * ```
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   *
   * @returns Object with cache size and hit rate
   *
   * @example
   * ```typescript
   * const stats = cache.getStats();
   * console.log(`Size: ${stats.size}, Hit rate: ${stats.hitRate}`);
   * ```
   */
  getStats(): { size: number; hitRate: number } {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      size: this.cache.size,
      hitRate,
    };
  }
}
