import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { TokenBucket } from './TokenBucket';
import { SteamGameDetails } from '../types/SteamGameDetails';
import {
  SteamApiError,
  GameNotFoundError,
  RateLimitError,
  InvalidApiKeyError,
} from '../errors/SteamErrors';

/**
 * Steam API response format for app list (IStoreService - current)
 */
interface AppListResponse {
  response: {
    apps: Array<{
      appid: number;
      name: string;
      last_modified: number;
      price_change_number: number;
    }>;
    have_more_results: boolean;
    last_appid?: number;
  };
}

/**
 * Steam Store API response format for game details
 */
interface StoreApiResponse {
  [appId: string]: {
    success: boolean;
    data?: any;
  };
}

/**
 * Steam Store search API response format
 */
interface StoreSearchResponse {
  total: number;
  items: Array<{
    id: number;
    type: number;
    name: string;
    discounted: boolean;
    discount_percent: number;
    original_price: number;
    final_price: number;
    currency: string;
    large_capsule_image: string;
    small_capsule_image: string;
    windows_available: boolean;
    mac_available: boolean;
    linux_available: boolean;
    streamingvideo_available: boolean;
    discount_expiration?: number;
    header_image: string;
    controller_support?: string;
  }>;
}

/**
 * HTTP client with token bucket rate limiting for Steam API
 */
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter: TokenBucket;

  /**
   * Create an API client with rate limiting
   *
   * @param apiKey - Steam Web API key
   * @param userAgent - User agent string for requests
   * @param timeout - Request timeout in milliseconds
   * @param rateLimit - Rate limit configuration (requests per time window)
   *
   * @example
   * ```typescript
   * const client = new ApiClient(
   *   'YOUR_API_KEY',
   *   '@xmer/steam-client v1.0.0',
   *   10000,
   *   { requests: 200, perMs: 300000 }
   * );
   * ```
   */
  constructor(
    private readonly apiKey: string,
    userAgent: string,
    timeout: number,
    rateLimit: { requests: number; perMs: number }
  ) {
    this.axiosInstance = axios.create({
      timeout,
      headers: {
        'User-Agent': userAgent,
      },
    });

    this.rateLimiter = new TokenBucket(rateLimit.requests, rateLimit.perMs);
  }

  /**
   * Fetch all Steam apps list
   *
   * @returns Array of all Steam apps with ID and name
   * @throws {RateLimitError} If rate limit exceeded
   * @throws {SteamApiError} If API request fails
   * @throws {InvalidApiKeyError} If API key is invalid
   *
   * @example
   * ```typescript
   * const apps = await client.getAppList();
   * console.log(`Found ${apps.length} Steam apps`);
   * ```
   */
  async getAppList(): Promise<Array<{ appid: number; name: string }>> {
    this.checkRateLimit();

    try {
      // Use IStoreService/GetAppList (recommended replacement for deprecated ISteamApps/GetAppList)
      // This endpoint supports pagination, so we may need multiple requests
      let allApps: Array<{ appid: number; name: string }> = [];
      let lastAppId: number | undefined = undefined;
      let hasMoreResults = true;

      // Fetch all apps with pagination (max 50000 per request)
      while (hasMoreResults) {
        const apiResponse: AxiosResponse<AppListResponse> = await this.axiosInstance.get<AppListResponse>(
          'https://api.steampowered.com/IStoreService/GetAppList/v1/',
          {
            params: {
              key: this.apiKey,
              include_games: true,
              include_dlc: false,
              include_software: false,
              include_videos: false,
              include_hardware: false,
              max_results: 50000,
              last_appid: lastAppId,
            },
          }
        );

        // Transform to simpler format (only appid and name)
        const apps = apiResponse.data.response.apps.map(
          (app: { appid: number; name: string; last_modified: number; price_change_number: number }) => ({
            appid: app.appid,
            name: app.name,
          })
        );

        allApps = allApps.concat(apps);

        // Check if there are more results
        hasMoreResults = apiResponse.data.response.have_more_results;
        lastAppId = apiResponse.data.response.last_appid;

        // Rate limit check for next iteration
        if (hasMoreResults) {
          this.checkRateLimit();
        }
      }

      return allApps;
    } catch (error) {
      this.handleError(error, 'Failed to fetch Steam app list');
    }
  }

  /**
   * Search for games using Steam Store search API
   *
   * @param term - Search term
   * @param limit - Maximum number of results (default: 25, max: 100)
   * @returns Array of matching games
   * @throws {RateLimitError} If rate limit exceeded
   * @throws {SteamApiError} If API request fails
   *
   * @example
   * ```typescript
   * const results = await client.searchGames('Cyberpunk', 10);
   * console.log(`Found ${results.length} games matching "Cyberpunk"`);
   * ```
   */
  async searchGames(
    term: string,
    limit: number = 25
  ): Promise<Array<{ appid: number; name: string }>> {
    this.checkRateLimit();

    if (!term || term.trim().length === 0) {
      return [];
    }

    try {
      const response = await this.axiosInstance.get<StoreSearchResponse>(
        'https://store.steampowered.com/api/storesearch/',
        {
          params: {
            term: term.trim(),
            l: 'english',
            cc: 'US',
          },
        }
      );

      // Transform store search results to match app list format
      const results = response.data.items
        .slice(0, limit)
        .map((item) => ({
          appid: item.id,
          name: item.name,
        }));

      return results;
    } catch (error) {
      this.handleError(error, `Failed to search Steam store for term: ${term}`);
    }
  }

  /**
   * Fetch detailed game information from Steam Store API
   *
   * @param appId - Steam application ID
   * @returns Full game details
   * @throws {RateLimitError} If rate limit exceeded
   * @throws {SteamApiError} If API request fails
   * @throws {GameNotFoundError} If game not found
   * @throws {InvalidApiKeyError} If API key is invalid
   *
   * @example
   * ```typescript
   * const details = await client.getGameDetails('1091500');
   * console.log(`Game: ${details.name}`);
   * ```
   */
  async getGameDetails(appId: string): Promise<SteamGameDetails> {
    this.checkRateLimit();

    try {
      // Use Steam Store API which provides comprehensive game data
      const response = await this.axiosInstance.get<StoreApiResponse>(
        `https://store.steampowered.com/api/appdetails`,
        {
          params: {
            appids: appId,
            key: this.apiKey,
          },
        }
      );

      const gameData = response.data[appId];

      if (!gameData || !gameData.success) {
        throw new GameNotFoundError(`App ID: ${appId}`);
      }

      const data = gameData.data;

      // Transform Steam API response to our SteamGameDetails format
      return {
        appId: appId,
        name: data.name || '',
        type: data.type || 'game',
        requiredAge: data.required_age || 0,
        isFree: data.is_free || false,
        detailedDescription: data.detailed_description || '',
        shortDescription: data.short_description || '',
        headerImage: data.header_image || '',
        publishers: data.publishers || [],
        developers: data.developers || [],
        priceOverview: data.price_overview
          ? {
              currency: data.price_overview.currency,
              initial: data.price_overview.initial,
              final: data.price_overview.final,
              discountPercent: data.price_overview.discount_percent,
              initialFormatted: data.price_overview.initial_formatted,
              finalFormatted: data.price_overview.final_formatted,
            }
          : undefined,
        releaseDate: {
          comingSoon: data.release_date?.coming_soon || false,
          date: data.release_date?.date || '',
        },
        categories: (data.categories || []).map((cat: any) => ({
          id: cat.id,
          description: cat.description,
        })),
        genres: (data.genres || []).map((genre: any) => ({
          id: String(genre.id),
          description: genre.description,
        })),
        screenshots: (data.screenshots || []).map((screenshot: any) => ({
          id: screenshot.id,
          pathThumbnail: screenshot.path_thumbnail,
          pathFull: screenshot.path_full,
        })),
        metacritic: data.metacritic
          ? {
              score: data.metacritic.score,
              url: data.metacritic.url,
            }
          : undefined,
        recommendations: data.recommendations
          ? {
              total: data.recommendations.total,
            }
          : undefined,
        contentDescriptors: {
          ids: data.content_descriptors?.ids || [],
          notes: data.content_descriptors?.notes,
        },
      };
    } catch (error) {
      if (error instanceof GameNotFoundError) {
        throw error;
      }
      this.handleError(error, `Failed to fetch game details for app ID: ${appId}`);
    }
  }

  /**
   * Check if request can proceed (rate limit check)
   *
   * @returns true if request allowed, false if rate limited
   *
   * @example
   * ```typescript
   * if (client.canMakeRequest()) {
   *   // Safe to make request
   * }
   * ```
   */
  canMakeRequest(): boolean {
    return this.rateLimiter.tryConsume();
  }

  /**
   * Get time until next request is allowed
   *
   * @returns Milliseconds until next token refill
   *
   * @example
   * ```typescript
   * const retryAfter = client.getRetryAfter();
   * console.log(`Wait ${retryAfter - Date.now()}ms before retrying`);
   * ```
   */
  getRetryAfter(): number {
    return this.rateLimiter.getRetryAfter();
  }

  /**
   * Check rate limit and throw error if exceeded
   * @throws {RateLimitError} If rate limit exceeded
   */
  private checkRateLimit(): void {
    if (!this.canMakeRequest()) {
      const retryAfter = this.getRetryAfter();
      throw new RateLimitError(retryAfter);
    }
  }

  /**
   * Handle API errors and transform to custom error types
   * @param error - Error from axios or other source
   * @param context - Context message for the error
   * @throws {InvalidApiKeyError} For 401 unauthorized errors
   * @throws {SteamApiError} For other API errors
   */
  private handleError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Check for authentication errors
      if (axiosError.response?.status === 401) {
        throw new InvalidApiKeyError();
      }

      // Throw Steam API error with status code
      throw new SteamApiError(
        `${context}: ${axiosError.message}`,
        axiosError.response?.status || 0,
        axiosError.response?.data
      );
    }

    // Re-throw if already a custom error
    if (
      error instanceof SteamApiError ||
      error instanceof InvalidApiKeyError ||
      error instanceof RateLimitError ||
      error instanceof GameNotFoundError
    ) {
      throw error;
    }

    // Unknown error type
    throw new SteamApiError(
      `${context}: ${error instanceof Error ? error.message : String(error)}`,
      0
    );
  }
}
