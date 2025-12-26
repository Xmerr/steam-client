import { SteamClient } from '../../src/client/SteamClient';
import { GameNotFoundError } from '../../src/errors/SteamErrors';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Import test fixtures
import steamApiResponses from '../fixtures/steamApiResponses.json';

describe('SteamClient Integration Tests', () => {
  let client: SteamClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a mock axios instance with all the methods we need
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
    };

    // Setup axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Initialize client
    client = new SteamClient({
      apiKey: 'test-api-key',
      cacheTTL: 3600000,
      cacheSize: 1000,
    });
  });

  describe('searchGame', () => {
    it('should find Cyberpunk 2077 from app list', async () => {
      // Mock app list response (IStoreService/GetAppList format)
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          response: {
            apps: [
              { appid: 1091500, name: 'Cyberpunk 2077', last_modified: 1234567890, price_change_number: 123 },
              { appid: 570, name: 'Dota 2', last_modified: 1234567890, price_change_number: 456 },
            ],
            have_more_results: false,
          },
        },
      });

      const game = await client.searchGame('Cyberpunk 2077');

      expect(game).not.toBeNull();
      expect(game?.name).toBe('Cyberpunk 2077');
      expect(game?.appId).toBe('1091500');
    });

    it('should handle fuzzy matching', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          response: {
            have_more_results: false,
            apps: [
              { appid: 1091500, name: 'Cyberpunk 2077', last_modified: 1234567890, price_change_number: 123 },
              { appid: 570, name: 'Dota 2', last_modified: 1234567890, price_change_number: 123 },
            ],
          },
        },
      });

      const game = await client.searchGame('Cyberpnk 2077', { fuzzyThreshold: 0.4 });

      expect(game).not.toBeNull();
      expect(game?.appId).toBe('1091500');
    });

    it('should return null for non-existent game', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          response: {
            have_more_results: false,
            apps: [{ appid: 570, name: 'Dota 2', last_modified: 1234567890, price_change_number: 123 }],
          },
        },
      });

      const game = await client.searchGame('Nonexistent Game 12345');

      expect(game).toBeNull();
    });

    it('should filter adult content when includeAdult is false', async () => {
      // Mock app list
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          response: {
            have_more_results: false,
            apps: [{ appid: 1234567, name: 'Adult Only Game', last_modified: 1234567890, price_change_number: 123 }],
          },
        },
      });

      // Mock game details (adult game)
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.adultGame,
      });

      const game = await client.searchGame('Adult Only Game', { includeAdult: false });

      expect(game).toBeNull();
    });

    it('should include adult content when includeAdult is true', async () => {
      // Mock app list
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          response: {
            have_more_results: false,
            apps: [{ appid: 1234567, name: 'Adult Only Game', last_modified: 1234567890, price_change_number: 123 }],
          },
        },
      });

      // Mock game details (adult game)
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.adultGame,
      });

      const game = await client.searchGame('Adult Only Game', { includeAdult: true });

      expect(game).not.toBeNull();
      expect(game?.name).toBe('Adult Only Game');
    });
  });

  describe('searchGames', () => {
    it('should return multiple matching games', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          response: {
            have_more_results: false,
            apps: [
              { appid: 271590, name: 'Grand Theft Auto V', last_modified: 1234567890, price_change_number: 123 },
              { appid: 12345, name: 'Grand Theft Auto IV', last_modified: 1234567890, price_change_number: 123 },
              { appid: 12346, name: 'Grand Theft Auto: San Andreas', last_modified: 1234567890, price_change_number: 123 },
            ],
          },
        },
      });

      const games = await client.searchGames('Grand Theft Auto', 3);

      expect(games.length).toBeGreaterThan(0);
      expect(games.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getGameDetails', () => {
    it('should fetch and parse Cyberpunk 2077 details', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.cyberpunk2077,
      });

      const details = await client.getGameDetails('1091500');

      expect(details.name).toBe('Cyberpunk 2077');
      expect(details.appId).toBe('1091500');
      expect(details.type).toBe('game');
      expect(details.requiredAge).toBe(17);
      expect(details.isFree).toBe(false);
      expect(details.priceOverview?.finalFormatted).toBe('$59.99');
      expect(details.publishers).toContain('CD PROJEKT RED');
      expect(details.developers).toContain('CD PROJEKT RED');
      expect(details.metacritic?.score).toBe(86);
    });

    it('should fetch and parse Dota 2 (free-to-play) details', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.dota2,
      });

      const details = await client.getGameDetails('570');

      expect(details.name).toBe('Dota 2');
      expect(details.isFree).toBe(true);
      expect(details.priceOverview).toBeUndefined();
    });

    it('should throw GameNotFoundError for non-existent game', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.notFound,
      });

      await expect(client.getGameDetails('9999999')).rejects.toThrow(GameNotFoundError);
    });

    it('should cache game details', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.cyberpunk2077,
      });

      // First call
      await client.getGameDetails('1091500');

      // Second call (should use cache)
      const details = await client.getGameDetails('1091500');

      expect(details.name).toBe('Cyberpunk 2077');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('enrichMetadata', () => {
    it('should enrich metadata from title only', async () => {
      // Mock app list
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          response: {
            have_more_results: false,
            apps: [{ appid: 1091500, name: 'Cyberpunk 2077', last_modified: 1234567890, price_change_number: 123 }],
          },
        },
      });

      // Mock game details
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.cyberpunk2077,
      });

      const enriched = await client.enrichMetadata({ title: 'Cyberpunk 2077' });

      expect(enriched.steamId).toBe('1091500');
      expect(enriched.steamUrl).toBe('https://store.steampowered.com/app/1091500/');
      expect(enriched.price).toBe('$59.99');
      expect(enriched.releaseDate).toBe('Dec 10, 2020');
      expect(enriched.categories).toContain('Action');
      expect(enriched.rating?.metacritic).toBe(86);
      expect(enriched.screenshots).toHaveLength(3);
      expect(enriched.isAdult).toBe(false);
    });

    it('should enrich metadata from Steam ID', async () => {
      // Mock game details
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.dota2,
      });

      const enriched = await client.enrichMetadata({
        title: 'Dota 2',
        steamId: '570',
      });

      expect(enriched.steamId).toBe('570');
      expect(enriched.price).toBe('Free to Play');
      expect(enriched.isAdult).toBe(false);
    });

    it('should detect adult content in enrichment', async () => {
      // Mock app list
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          response: {
            have_more_results: false,
            apps: [{ appid: 1234567, name: 'Adult Only Game', last_modified: 1234567890, price_change_number: 123 }],
          },
        },
      });

      // Mock game details
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.adultGame,
      });

      const enriched = await client.enrichMetadata({ title: 'Adult Only Game' });

      expect(enriched.isAdult).toBe(true);
    });

    it('should throw GameNotFoundError if game not found', async () => {
      // Mock app list (empty)
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          response: {
            have_more_results: false,
            apps: [],
          },
        },
      });

      await expect(
        client.enrichMetadata({ title: 'Nonexistent Game' })
      ).rejects.toThrow(GameNotFoundError);
    });
  });

  describe('isAdultContent', () => {
    it('should detect adult content from age restriction', async () => {
      // Mock game details with age 18+
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.adultGame,
      });

      const game = { appId: '1234567', name: 'Adult Only Game' };
      const isAdult = await client.isAdultContent(game);

      expect(isAdult).toBe(true);
    });

    it('should return false for non-adult game', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.cyberpunk2077,
      });

      const game = { appId: '1091500', name: 'Cyberpunk 2077' };
      const isAdult = await client.isAdultContent(game);

      expect(isAdult).toBe(false);
    });
  });

  describe('extractScreenshots', () => {
    it('should extract screenshot URLs', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.cyberpunk2077,
      });

      const details = await client.getGameDetails('1091500');
      const screenshots = client.extractScreenshots(details, 5);

      expect(screenshots.length).toBeGreaterThan(0);
      expect(screenshots[0]).toContain('full');
    });

    it('should limit screenshots to specified count', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.cyberpunk2077,
      });

      const details = await client.getGameDetails('1091500');
      const screenshots = client.extractScreenshots(details, 2);

      expect(screenshots.length).toBeLessThanOrEqual(2);
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      // Setup some cached data
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          response: {
            have_more_results: false,
            apps: [{ appid: 1091500, name: 'Cyberpunk 2077', last_modified: 1234567890, price_change_number: 123 }],
          },
        },
      });

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: steamApiResponses.cyberpunk2077,
      });

      await client.searchGame('Cyberpunk 2077');
      await client.getGameDetails('1091500');

      // Clear cache
      client.clearCache();

      // Next requests should hit API again
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          response: {
            have_more_results: false,
            apps: [{ appid: 1091500, name: 'Cyberpunk 2077', last_modified: 1234567890, price_change_number: 123 }],
          },
        },
      });

      await client.searchGame('Cyberpunk 2077');

      // Should have made new requests after cache clear
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = client.getCacheStats();

      expect(stats).toHaveProperty('appListSize');
      expect(stats).toHaveProperty('detailsCacheSize');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.hitRate).toBe('number');
    });
  });
});
