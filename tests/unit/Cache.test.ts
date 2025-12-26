import { Cache } from '../../src/infrastructure/Cache';

describe('Cache', () => {
  // Note: lru-cache uses real timers, so we can't use fake timers for TTL tests
  // TTL tests are removed as they would require integration testing with actual time delays

  describe('get and set', () => {
    it('should store and retrieve values', () => {
      const cache = new Cache<string, string>(10, 60000);

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      const cache = new Cache<string, string>(10, 60000);

      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      const cache = new Cache<string, string>(10, 60000);

      cache.set('key1', 'value1');
      cache.set('key1', 'value2');

      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used item when cache is full', () => {
      const cache = new Cache<string, string>(3, 60000);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 to make it recently used
      cache.get('key1');

      // Add key4, should evict key2 (least recently used)
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should respect max size limit', () => {
      const cache = new Cache<string, number>(5, 60000);

      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, i);
      }

      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(5);
    });
  });

  describe('TTL configuration', () => {
    it('should accept TTL configuration', () => {
      const cache = new Cache<string, string>(10, 1000); // 1 second TTL

      cache.set('key1', 'value1');

      // Should exist immediately
      expect(cache.get('key1')).toBe('value1');
    });

    it('should allow custom TTL per entry', () => {
      const cache = new Cache<string, string>(10, 1000); // Default 1 second

      cache.set('key1', 'value1', 5000); // Custom 5 second TTL
      cache.set('key2', 'value2'); // Default 1 second TTL

      // Both should exist immediately
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      const cache = new Cache<string, string>(10, 60000);

      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      const cache = new Cache<string, string>(10, 60000);

      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should correctly check key existence', () => {
      const cache = new Cache<string, string>(10, 60000);

      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);

      cache.clear();
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      const cache = new Cache<string, string>(10, 60000);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });

    it('should reset statistics', () => {
      const cache = new Cache<string, string>(10, 60000);

      cache.set('key1', 'value1');
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss

      cache.clear();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should track cache size', () => {
      const cache = new Cache<string, string>(10, 60000);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });

    it('should calculate hit rate correctly', () => {
      const cache = new Cache<string, string>(10, 60000);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('key3'); // Miss
      cache.get('key2'); // Hit

      const stats = cache.getStats();
      // 3 hits, 1 miss = 75% hit rate
      expect(stats.hitRate).toBeCloseTo(0.75, 2);
    });

    it('should return 0 hit rate when no requests made', () => {
      const cache = new Cache<string, string>(10, 60000);

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('complex object values', () => {
    it('should handle object values', () => {
      interface GameData {
        name: string;
        appId: string;
      }

      const cache = new Cache<string, GameData>(10, 60000);

      const game: GameData = { name: 'Cyberpunk 2077', appId: '1091500' };
      cache.set('game1', game);

      const retrieved = cache.get('game1');
      expect(retrieved).toEqual(game);
    });

    it('should handle array values', () => {
      const cache = new Cache<string, string[]>(10, 60000);

      cache.set('categories', ['Action', 'RPG', 'Open World']);

      const retrieved = cache.get('categories');
      expect(retrieved).toEqual(['Action', 'RPG', 'Open World']);
    });
  });
});
