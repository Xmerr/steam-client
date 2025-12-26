/**
 * Token bucket rate limiter implementation
 *
 * Implements the token bucket algorithm for rate limiting API requests.
 * Tokens are consumed on each request and refilled over time.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  /**
   * Create a token bucket rate limiter
   *
   * @param capacity - Maximum number of tokens (max requests)
   * @param refillInterval - Time in milliseconds to fully refill the bucket
   *
   * @example
   * ```typescript
   * // 200 requests per 5 minutes
   * const bucket = new TokenBucket(200, 300000);
   * ```
   */
  constructor(
    private readonly capacity: number,
    private readonly refillInterval: number
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume a token from the bucket
   *
   * @returns true if token consumed (request allowed), false if bucket empty
   *
   * @example
   * ```typescript
   * if (bucket.tryConsume()) {
   *   // Make API request
   * } else {
   *   // Rate limited - wait before retrying
   * }
   * ```
   */
  tryConsume(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get the timestamp when next request will be allowed
   *
   * @returns Millisecond timestamp of next available token
   *
   * @example
   * ```typescript
   * const retryAfter = bucket.getRetryAfter();
   * const waitMs = retryAfter - Date.now();
   * ```
   */
  getRetryAfter(): number {
    this.refill();

    if (this.tokens >= 1) {
      return Date.now();
    }

    // Calculate when next token will be available
    const timePerToken = this.refillInterval / this.capacity;
    const tokensNeeded = 1 - this.tokens;
    const timeUntilNextToken = Math.ceil(tokensNeeded * timePerToken);

    return Date.now() + timeUntilNextToken;
  }

  /**
   * Refill tokens based on elapsed time since last refill
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed > 0) {
      const tokensToAdd = (elapsed / this.refillInterval) * this.capacity;
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Get current number of available tokens
   * @returns Number of tokens currently in bucket
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}
