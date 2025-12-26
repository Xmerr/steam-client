/**
 * Custom error classes for Steam client
 */

/**
 * Base error class for all Steam client errors
 */
export abstract class SteamClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when Steam API request fails
 */
export class SteamApiError extends SteamClientError {
  /**
   * Create a Steam API error
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @param responseData - Optional response data from API
   */
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseData?: any
  ) {
    super(message);
  }
}

/**
 * Error thrown when no game is found for a search query
 */
export class GameNotFoundError extends SteamClientError {
  /**
   * Create a game not found error
   * @param title - Game title that was searched
   */
  constructor(public readonly title: string) {
    super(`Game not found: ${title}`);
  }
}

/**
 * Error thrown when Steam API rate limit is exceeded
 */
export class RateLimitError extends SteamClientError {
  /**
   * Create a rate limit error
   * @param retryAfter - Timestamp (ms) when next request can be made
   */
  constructor(public readonly retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${new Date(retryAfter).toISOString()}`);
  }
}

/**
 * Error thrown when Steam API key is invalid or missing
 */
export class InvalidApiKeyError extends SteamClientError {
  constructor() {
    super('Invalid or missing Steam API key. Get one at https://steamcommunity.com/dev/apikey');
  }
}
