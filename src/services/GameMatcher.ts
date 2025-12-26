import Fuse, { IFuseOptions } from 'fuse.js';
import { SteamGame } from '../types/SteamGame';
import { Cache } from '../infrastructure/Cache';
import { ApiClient } from '../infrastructure/ApiClient';
import { TitleNormalizer } from '../utils/TitleNormalizer';

/**
 * Cache key for storing the full Steam app list
 */
const APP_LIST_CACHE_KEY = 'steam_app_list';

/**
 * Fuse.js configuration for fuzzy searching
 */
const FUSE_OPTIONS: IFuseOptions<SteamGame> = {
  keys: ['name'],
  includeScore: true,
  threshold: 0.3, // Default threshold, can be overridden per search
  ignoreLocation: true,
  useExtendedSearch: false,
};

/**
 * Handles exact and fuzzy game matching using the Steam app list
 */
export class GameMatcher {
  private fuse: Fuse<SteamGame> | null = null;

  /**
   * Create a game matcher
   *
   * @param apiClient - API client for fetching Steam app list
   * @param appListCache - Cache for storing app list (24h TTL)
   *
   * @example
   * ```typescript
   * const matcher = new GameMatcher(apiClient, appListCache);
   * const game = await matcher.findBestMatch('Cyberpunk 2077', 0.3);
   * ```
   */
  constructor(
    private readonly apiClient: ApiClient,
    private readonly appListCache: Cache<string, SteamGame[]>
  ) {}

  /**
   * Find best matching game using fuzzy search
   *
   * Normalizes the title before searching and returns the best match
   * if it meets the threshold requirement.
   *
   * @param title - Game title to search
   * @param threshold - Fuse.js match threshold (0-1, lower = stricter match)
   * @returns Best match or null if no match above threshold
   * @throws {RateLimitError} If rate limit exceeded when fetching app list
   * @throws {SteamApiError} If API request fails
   *
   * @example
   * ```typescript
   * const game = await matcher.findBestMatch('Cyberpunk 2077', 0.3);
   * if (game) {
   *   console.log(`Found: ${game.name} (score: ${game.matchScore})`);
   * }
   * ```
   */
  async findBestMatch(title: string, threshold: number): Promise<SteamGame | null> {
    if (!title || title.trim().length === 0) {
      return null;
    }

    // Try exact match first (faster)
    const exactMatch = await this.getExactMatch(title);
    if (exactMatch) {
      return { ...exactMatch, matchScore: 1.0 };
    }

    // Fall back to fuzzy search
    const matches = await this.findMatches(title, 1, threshold);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Find multiple matching games
   *
   * @param title - Game title to search
   * @param limit - Maximum number of results
   * @param threshold - Fuse.js match threshold (0-1, lower = stricter match)
   * @returns Array of matches sorted by score (best first)
   * @throws {RateLimitError} If rate limit exceeded when fetching app list
   * @throws {SteamApiError} If API request fails
   *
   * @example
   * ```typescript
   * const games = await matcher.findMatches('Grand Theft Auto', 5, 0.3);
   * games.forEach(game => {
   *   console.log(`${game.name} (score: ${game.matchScore})`);
   * });
   * ```
   */
  async findMatches(
    title: string,
    limit: number,
    threshold: number
  ): Promise<SteamGame[]> {
    if (!title || title.trim().length === 0) {
      return [];
    }

    // Ensure Fuse instance is initialized with app list
    await this.ensureFuseInitialized();

    if (!this.fuse) {
      return [];
    }

    // Normalize the search title
    const normalizedTitle = TitleNormalizer.normalize(title);

    // Perform fuzzy search
    const results = this.fuse.search(normalizedTitle, { limit });

    // Filter by threshold and transform results
    return results
      .filter((result) => result.score !== undefined && result.score <= threshold)
      .map((result) => ({
        appId: result.item.appId,
        name: result.item.name,
        matchScore: result.score !== undefined ? 1 - result.score : 0,
      }));
  }

  /**
   * Get exact match by title
   *
   * Performs case-insensitive exact match on normalized titles.
   *
   * @param title - Exact game title
   * @returns Game if exact match found, null otherwise
   * @throws {RateLimitError} If rate limit exceeded when fetching app list
   * @throws {SteamApiError} If API request fails
   *
   * @example
   * ```typescript
   * const game = await matcher.getExactMatch('Cyberpunk 2077');
   * if (game) {
   *   console.log(`Exact match: ${game.name}`);
   * }
   * ```
   */
  async getExactMatch(title: string): Promise<SteamGame | null> {
    const appList = await this.getAppList();
    const normalizedTitle = TitleNormalizer.normalize(title);

    // Search for exact match in normalized titles
    const match = appList.find(
      (app) => TitleNormalizer.normalize(app.name) === normalizedTitle
    );

    return match || null;
  }

  /**
   * Get Steam app list from cache or API
   *
   * @returns Array of all Steam games
   * @throws {RateLimitError} If rate limit exceeded
   * @throws {SteamApiError} If API request fails
   */
  private async getAppList(): Promise<SteamGame[]> {
    // Check cache first
    const cached = this.appListCache.get(APP_LIST_CACHE_KEY);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const rawAppList = await this.apiClient.getAppList();

    // Transform to SteamGame format
    const appList: SteamGame[] = rawAppList.map((app) => ({
      appId: String(app.appid),
      name: app.name,
    }));

    // Cache with 24 hour TTL
    this.appListCache.set(APP_LIST_CACHE_KEY, appList, 86400000);

    return appList;
  }

  /**
   * Ensure Fuse.js instance is initialized with app list
   */
  private async ensureFuseInitialized(): Promise<void> {
    if (this.fuse) {
      return;
    }

    const appList = await this.getAppList();
    this.fuse = new Fuse(appList, FUSE_OPTIONS);
  }
}
