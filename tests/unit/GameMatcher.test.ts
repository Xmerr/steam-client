import { GameMatcher } from '../../src/services/GameMatcher';
import { ApiClient } from '../../src/infrastructure/ApiClient';
import { Cache } from '../../src/infrastructure/Cache';
import { SteamGame } from '../../src/types/SteamGame';

// Mock dependencies
jest.mock('../../src/infrastructure/ApiClient');
jest.mock('../../src/infrastructure/Cache');

describe('GameMatcher', () => {
  let gameMatcher: GameMatcher;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockAppListCache: jest.Mocked<Cache<string, SteamGame[]>>;

  const mockAppList = [
    { appid: 1091500, name: 'Cyberpunk 2077' },
    { appid: 570, name: 'Dota 2' },
    { appid: 271590, name: 'Grand Theft Auto V' },
    { appid: 1234, name: 'Test Game Complete Edition' },
  ];

  beforeEach(() => {
    mockApiClient = new ApiClient('test-key', 'test-ua', 10000, {
      requests: 200,
      perMs: 300000,
    }) as jest.Mocked<ApiClient>;

    mockAppListCache = new Cache<string, SteamGame[]>(1, 86400000) as jest.Mocked<Cache<
      string,
      SteamGame[]
    >>;

    gameMatcher = new GameMatcher(mockApiClient, mockAppListCache);
  });

  describe('getExactMatch', () => {
    beforeEach(() => {
      mockAppListCache.get.mockReturnValue(undefined);
      mockApiClient.getAppList.mockResolvedValue(mockAppList);
    });

    it('should find exact match (case insensitive)', async () => {
      const result = await gameMatcher.getExactMatch('CYBERPUNK 2077');

      expect(result).toEqual({
        appId: '1091500',
        name: 'Cyberpunk 2077',
      });
    });

    it('should find exact match with normalized title', async () => {
      const result = await gameMatcher.getExactMatch('Test Game');

      expect(result).toEqual({
        appId: '1234',
        name: 'Test Game Complete Edition',
      });
    });

    it('should return null for non-existent game', async () => {
      const result = await gameMatcher.getExactMatch('Nonexistent Game 12345');

      expect(result).toBeNull();
    });

    it('should use cached app list', async () => {
      const cachedList: SteamGame[] = [
        { appId: '570', name: 'Dota 2' },
      ];
      mockAppListCache.get.mockReturnValue(cachedList);

      const result = await gameMatcher.getExactMatch('Dota 2');

      expect(result).toEqual({
        appId: '570',
        name: 'Dota 2',
      });
      expect(mockApiClient.getAppList).not.toHaveBeenCalled();
    });
  });

  describe('findBestMatch', () => {
    beforeEach(() => {
      mockAppListCache.get.mockReturnValue(undefined);
      mockApiClient.getAppList.mockResolvedValue(mockAppList);
    });

    it('should return null for empty title', async () => {
      const result = await gameMatcher.findBestMatch('', 0.3);

      expect(result).toBeNull();
    });

    it('should return null for whitespace-only title', async () => {
      const result = await gameMatcher.findBestMatch('   ', 0.3);

      expect(result).toBeNull();
    });

    it('should prefer exact match over fuzzy match', async () => {
      const result = await gameMatcher.findBestMatch('Cyberpunk 2077', 0.3);

      expect(result).toEqual({
        appId: '1091500',
        name: 'Cyberpunk 2077',
        matchScore: 1.0,
      });
    });
  });

  describe('findMatches', () => {
    beforeEach(() => {
      mockAppListCache.get.mockReturnValue(undefined);
      mockApiClient.getAppList.mockResolvedValue(mockAppList);
    });

    it('should return empty array for empty title', async () => {
      const results = await gameMatcher.findMatches('', 5, 0.3);

      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace-only title', async () => {
      const results = await gameMatcher.findMatches('   ', 5, 0.3);

      expect(results).toEqual([]);
    });

    it('should limit number of results', async () => {
      const results = await gameMatcher.findMatches('game', 2, 0.8);

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('caching behavior', () => {
    it('should cache app list after fetching', async () => {
      mockAppListCache.get.mockReturnValue(undefined);
      mockApiClient.getAppList.mockResolvedValue(mockAppList);

      await gameMatcher.getExactMatch('Cyberpunk 2077');

      expect(mockApiClient.getAppList).toHaveBeenCalledTimes(1);
      expect(mockAppListCache.set).toHaveBeenCalledWith(
        'steam_app_list',
        expect.any(Array),
        86400000 // 24h TTL
      );
    });
  });
});
