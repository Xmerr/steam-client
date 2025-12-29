import { SteamClientConfig, SearchOptions, CacheStats } from '../types/Config';
import { SteamGame } from '../types/SteamGame';
import { SteamGameDetails } from '../types/SteamGameDetails';
import { EnrichedGameData, PartialGameData } from '../types/EnrichedGameData';
import { ApiClient } from '../infrastructure/ApiClient';
import { Cache } from '../infrastructure/Cache';
import { GameMatcher } from '../services/GameMatcher';
import { MetadataExtractor } from '../services/MetadataExtractor';
import { AdultContentDetector } from '../services/AdultContentDetector';
import { GameNotFoundError } from '../errors/SteamErrors';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  cacheTTL: 3600000, // 1 hour
  cacheSize: 1000, // 1000 entries
  rateLimit: {
    requests: 200,
    perMs: 300000, // 5 minutes
  },
  timeout: 10000, // 10 seconds
  userAgent: '@xmer/steam-client v1.0.0',
};

/**
 * Default search options
 */
const DEFAULT_SEARCH_OPTIONS: Required<SearchOptions> = {
  fuzzyThreshold: 0.3,
  includeAdult: false,
  bypassCache: false,
};

/**
 * Main Steam client for game search, metadata enrichment, and caching
 */
export class SteamClient {
  private apiClient: ApiClient;
  private appListCache: Cache<string, SteamGame[]>;
  private detailsCache: Cache<string, SteamGameDetails>;
  private gameMatcher: GameMatcher;
  private metadataExtractor: MetadataExtractor;
  private adultContentDetector: AdultContentDetector;

  /**
   * Create a new Steam client
   *
   * @param config - Client configuration with API key and optional settings
   *
   * @example
   * ```typescript
   * const client = new SteamClient({
   *   apiKey: 'YOUR_STEAM_API_KEY',
   *   cacheTTL: 3600000, // 1 hour
   *   cacheSize: 1000,
   * });
   * ```
   */
  constructor(config: SteamClientConfig) {
    // Merge with defaults
    const mergedConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      rateLimit: config.rateLimit || DEFAULT_CONFIG.rateLimit,
    };

    // Initialize infrastructure layer
    this.apiClient = new ApiClient(
      mergedConfig.apiKey,
      mergedConfig.userAgent,
      mergedConfig.timeout,
      mergedConfig.rateLimit
    );

    // Initialize caches (app list gets 24h TTL, details get configured TTL)
    this.appListCache = new Cache<string, SteamGame[]>(1, 86400000); // Single entry, 24h
    this.detailsCache = new Cache<string, SteamGameDetails>(
      mergedConfig.cacheSize,
      mergedConfig.cacheTTL
    );

    // Initialize service layer
    this.gameMatcher = new GameMatcher(this.apiClient, this.appListCache);
    this.metadataExtractor = new MetadataExtractor();
    this.adultContentDetector = new AdultContentDetector();
  }

  /**
   * Search for a game on Steam by title
   *
   * Uses fuzzy matching to find the best match from the Steam app list.
   * Returns null if no match is found above the threshold.
   *
   * @param title - Game title to search for
   * @param options - Search options (fuzzy threshold, adult filter, cache bypass)
   * @returns Steam game with app ID and name, or null if not found
   * @throws {RateLimitError} If Steam API rate limit is exceeded
   * @throws {SteamApiError} If Steam API request fails
   *
   * @example
   * ```typescript
   * const game = await client.searchGame('Cyberpunk 2077');
   * if (game) {
   *   console.log(`Found: ${game.name} (${game.appId})`);
   * }
   * ```
   */
  async searchGame(title: string, options?: SearchOptions): Promise<SteamGame | null> {
    const opts = { ...DEFAULT_SEARCH_OPTIONS, ...options };

    const match = await this.gameMatcher.findBestMatch(title, opts.fuzzyThreshold);

    if (!match) {
      return null;
    }

    // Filter adult content if requested
    if (!opts.includeAdult && !(await this.isAdultContentFiltered(match))) {
      return null;
    }

    return match;
  }

  /**
   * Search for multiple games matching a title
   *
   * Returns multiple matches sorted by relevance score.
   *
   * @param title - Game title to search for
   * @param limit - Maximum number of results (default: 5)
   * @returns Array of matching Steam games
   * @throws {RateLimitError} If Steam API rate limit is exceeded
   * @throws {SteamApiError} If Steam API request fails
   *
   * @example
   * ```typescript
   * const games = await client.searchGames('Grand Theft Auto', 5);
   * games.forEach(game => {
   *   console.log(`${game.name} (score: ${game.matchScore})`);
   * });
   * ```
   */
  async searchGames(title: string, limit: number = 5): Promise<SteamGame[]> {
    return this.gameMatcher.findMatches(title, limit, DEFAULT_SEARCH_OPTIONS.fuzzyThreshold);
  }

  /**
   * Get detailed game information from Steam
   *
   * Fetches comprehensive metadata including price, release date, categories,
   * ratings, screenshots, and adult content flags.
   *
   * @param appId - Steam application ID
   * @returns Full game details
   * @throws {RateLimitError} If Steam API rate limit is exceeded
   * @throws {SteamApiError} If Steam API request fails
   * @throws {GameNotFoundError} If game not found
   *
   * @example
   * ```typescript
   * const details = await client.getGameDetails('1091500');
   * console.log(`${details.name} - ${details.priceOverview?.finalFormatted}`);
   * ```
   */
  async getGameDetails(appId: string): Promise<SteamGameDetails> {
    // Check cache first
    const cached = this.detailsCache.get(appId);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const details = await this.apiClient.getGameDetails(appId);

    // Cache the result
    this.detailsCache.set(appId, details);

    return details;
  }

  /**
   * Enrich partial game data with Steam metadata
   *
   * Takes a game title (and optionally a Steam ID) and returns enriched
   * metadata including price, release date, categories, ratings, and screenshots.
   *
   * @param partialGame - Partial game data with title and optional Steam ID
   * @returns Enriched game data
   * @throws {RateLimitError} If Steam API rate limit is exceeded
   * @throws {SteamApiError} If Steam API request fails
   * @throws {GameNotFoundError} If game not found
   *
   * @example
   * ```typescript
   * const enriched = await client.enrichMetadata({ title: 'Cyberpunk 2077' });
   * console.log(`Price: ${enriched.price}`);
   * console.log(`Release: ${enriched.releaseDate}`);
   * console.log(`Adult: ${enriched.isAdult}`);
   * ```
   */
  async enrichMetadata(partialGame: PartialGameData): Promise<EnrichedGameData> {
    let appId = partialGame.steamId;

    // If no Steam ID provided, search for it
    if (!appId) {
      const match = await this.searchGame(partialGame.title, {
        includeAdult: true, // Include adult games in enrichment
      });

      if (!match) {
        throw new GameNotFoundError(partialGame.title);
      }

      appId = match.appId;
    }

    // Get detailed information
    const details = await this.getGameDetails(appId);

    // Fetch review statistics for accurate rating percentage
    const reviewStats = await this.apiClient.getReviewStats(appId);

    // Extract metadata with review stats
    const enriched = this.metadataExtractor.extractMetadata(details, reviewStats);

    // Add adult content flag
    enriched.isAdult = this.adultContentDetector.isAdult(details);

    return enriched;
  }

  /**
   * Check if a game contains adult content
   *
   * Uses multiple detection signals including age restrictions,
   * content descriptors, and category tags.
   *
   * @param game - Steam game to check
   * @returns true if adult content detected, false otherwise
   *
   * @example
   * ```typescript
   * const game = await client.searchGame('Adult Game');
   * if (game && await client.isAdultContent(game)) {
   *   console.log('Adult content detected');
   * }
   * ```
   */
  async isAdultContent(game: SteamGame): Promise<boolean> {
    try {
      const details = await this.getGameDetails(game.appId);
      return this.adultContentDetector.isAdult(details);
    } catch (error) {
      // If we can't get details, assume not adult
      return false;
    }
  }

  /**
   * Extract screenshot URLs from game details
   *
   * @param details - Steam game details
   * @param limit - Maximum number of screenshots (default: 3)
   * @returns Array of screenshot URLs
   *
   * @example
   * ```typescript
   * const details = await client.getGameDetails('1091500');
   * const screenshots = client.extractScreenshots(details, 5);
   * ```
   */
  extractScreenshots(details: SteamGameDetails, limit: number = 3): string[] {
    return this.metadataExtractor.extractScreenshots(details, limit);
  }

  /**
   * Clear all caches
   *
   * Removes all cached app list and game details data.
   *
   * @example
   * ```typescript
   * client.clearCache();
   * console.log('All caches cleared');
   * ```
   */
  clearCache(): void {
    this.appListCache.clear();
    this.detailsCache.clear();
  }

  /**
   * Get cache statistics
   *
   * Returns information about cache size and hit rates.
   *
   * @returns Cache statistics
   *
   * @example
   * ```typescript
   * const stats = client.getCacheStats();
   * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
   * ```
   */
  getCacheStats(): CacheStats {
    const appListStats = this.appListCache.getStats();
    const detailsStats = this.detailsCache.getStats();

    // Calculate combined hit rate
    const totalHits = appListStats.hitRate * appListStats.size +
                      detailsStats.hitRate * detailsStats.size;
    const totalSize = appListStats.size + detailsStats.size;
    const combinedHitRate = totalSize > 0 ? totalHits / totalSize : 0;

    return {
      appListSize: appListStats.size,
      detailsCacheSize: detailsStats.size,
      hitRate: combinedHitRate,
    };
  }

  /**
   * Check if game should be filtered due to adult content
   * @param game - Steam game to check
   * @returns true if game should be filtered (is adult), false if safe
   */
  private async isAdultContentFiltered(game: SteamGame): Promise<boolean> {
    return !(await this.isAdultContent(game));
  }
}
