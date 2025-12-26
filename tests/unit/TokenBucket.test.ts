import { TokenBucket } from '../../src/infrastructure/TokenBucket';

describe('TokenBucket', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('tryConsume', () => {
    it('should allow consuming tokens when bucket is full', () => {
      const bucket = new TokenBucket(10, 60000);

      expect(bucket.tryConsume()).toBe(true);
      expect(bucket.tryConsume()).toBe(true);
      expect(bucket.getAvailableTokens()).toBe(8);
    });

    it('should block when bucket is empty', () => {
      const bucket = new TokenBucket(2, 60000);

      expect(bucket.tryConsume()).toBe(true);
      expect(bucket.tryConsume()).toBe(true);
      expect(bucket.tryConsume()).toBe(false);
      expect(bucket.getAvailableTokens()).toBe(0);
    });

    it('should refill tokens over time', () => {
      const bucket = new TokenBucket(10, 10000); // 10 tokens per 10 seconds

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        bucket.tryConsume();
      }

      expect(bucket.tryConsume()).toBe(false);

      // Advance time by 5 seconds (should refill 5 tokens)
      jest.advanceTimersByTime(5000);

      expect(bucket.getAvailableTokens()).toBe(5);
      expect(bucket.tryConsume()).toBe(true);
    });

    it('should not exceed capacity when refilling', () => {
      const bucket = new TokenBucket(10, 10000);

      // Consume 2 tokens
      bucket.tryConsume();
      bucket.tryConsume();

      // Advance time by 20 seconds (more than refill time)
      jest.advanceTimersByTime(20000);

      // Should be capped at capacity (10), not 10 + 8 = 18
      expect(bucket.getAvailableTokens()).toBe(10);
    });
  });

  describe('getRetryAfter', () => {
    it('should return current time if tokens available', () => {
      const bucket = new TokenBucket(10, 60000);
      const before = Date.now();
      const retryAfter = bucket.getRetryAfter();

      expect(retryAfter).toBeGreaterThanOrEqual(before);
    });

    it('should return future time when bucket is empty', () => {
      const bucket = new TokenBucket(2, 10000);

      // Consume all tokens
      bucket.tryConsume();
      bucket.tryConsume();

      const now = Date.now();
      const retryAfter = bucket.getRetryAfter();

      // Should be sometime in the future
      expect(retryAfter).toBeGreaterThan(now);
    });

    it('should calculate correct retry time for partial refill', () => {
      const bucket = new TokenBucket(10, 10000); // 1 token per second

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        bucket.tryConsume();
      }

      const retryAfter = bucket.getRetryAfter();
      const waitTime = retryAfter - Date.now();

      // Should wait approximately 1 second for next token
      expect(waitTime).toBeGreaterThan(900);
      expect(waitTime).toBeLessThan(1100);
    });
  });

  describe('getAvailableTokens', () => {
    it('should return correct number of available tokens', () => {
      const bucket = new TokenBucket(10, 60000);

      expect(bucket.getAvailableTokens()).toBe(10);

      bucket.tryConsume();
      expect(bucket.getAvailableTokens()).toBe(9);

      bucket.tryConsume();
      bucket.tryConsume();
      expect(bucket.getAvailableTokens()).toBe(7);
    });

    it('should return floor of fractional tokens', () => {
      const bucket = new TokenBucket(10, 10000);

      // Consume 8 tokens
      for (let i = 0; i < 8; i++) {
        bucket.tryConsume();
      }

      // Advance by 1.5 seconds (should refill 1.5 tokens)
      jest.advanceTimersByTime(1500);

      // Should return 3 (2 + floor(1.5) = 3)
      expect(bucket.getAvailableTokens()).toBe(3);
    });
  });

  describe('Steam API rate limit scenario (200 req / 5 min)', () => {
    it('should handle Steam API rate limit correctly', () => {
      const bucket = new TokenBucket(200, 300000); // 200 requests per 5 minutes

      // Make 200 requests
      for (let i = 0; i < 200; i++) {
        expect(bucket.tryConsume()).toBe(true);
      }

      // 201st request should fail
      expect(bucket.tryConsume()).toBe(false);

      // Advance time by 2.5 minutes (half the refill time)
      jest.advanceTimersByTime(150000);

      // Should have ~100 tokens available
      const available = bucket.getAvailableTokens();
      expect(available).toBeGreaterThanOrEqual(99);
      expect(available).toBeLessThanOrEqual(101);
    });
  });
});
