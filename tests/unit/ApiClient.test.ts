import { ApiClient } from '../../src/infrastructure/ApiClient';
import {
  SteamApiError,
  GameNotFoundError,
  RateLimitError,
  InvalidApiKeyError,
} from '../../src/errors/SteamErrors';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockedAxios as any);

    apiClient = new ApiClient(
      'test-api-key',
      'test-user-agent',
      10000,
      { requests: 200, perMs: 300000 }
    );
  });

  describe('getAppList', () => {
    it('should return app list on success', async () => {
      const mockAppList = [
        { appid: 1091500, name: 'Cyberpunk 2077' },
        { appid: 570, name: 'Dota 2' },
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            apps: [
              {
                appid: 1091500,
                name: 'Cyberpunk 2077',
                last_modified: 1234567890,
                price_change_number: 123,
              },
              {
                appid: 570,
                name: 'Dota 2',
                last_modified: 1234567890,
                price_change_number: 456,
              },
            ],
            have_more_results: false,
          },
        },
      });

      const result = await apiClient.getAppList();

      expect(result).toEqual(mockAppList);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.steampowered.com/IStoreService/GetAppList/v1/',
        {
          params: {
            key: 'test-api-key',
            include_games: true,
            include_dlc: false,
            include_software: false,
            include_videos: false,
            include_hardware: false,
            max_results: 50000,
            last_appid: undefined,
          },
        }
      );
    });

    it('should handle pagination when have_more_results is true', async () => {
      // First page
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            apps: [
              {
                appid: 1,
                name: 'Game 1',
                last_modified: 1234567890,
                price_change_number: 123,
              },
            ],
            have_more_results: true,
            last_appid: 1,
          },
        },
      });

      // Second page
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            apps: [
              {
                appid: 2,
                name: 'Game 2',
                last_modified: 1234567890,
                price_change_number: 456,
              },
            ],
            have_more_results: false,
          },
        },
      });

      const result = await apiClient.getAppList();

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { appid: 1, name: 'Game 1' },
        { appid: 2, name: 'Game 2' },
      ]);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should throw InvalidApiKeyError on 401 response', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 401,
          data: {},
        },
        message: 'Unauthorized',
      });

      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      await expect(apiClient.getAppList()).rejects.toThrow(InvalidApiKeyError);
    });

    it('should throw SteamApiError on other HTTP errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 500,
          data: {},
        },
        message: 'Internal Server Error',
      });

      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      await expect(apiClient.getAppList()).rejects.toThrow(SteamApiError);
    });
  });

  describe('searchGames', () => {
    it('should return search results on success', async () => {
      const mockSearchResults = {
        total: 2,
        items: [
          {
            id: 1091500,
            type: 0,
            name: 'Cyberpunk 2077',
            discounted: false,
            discount_percent: 0,
            original_price: 5999,
            final_price: 5999,
            currency: 'USD',
            large_capsule_image: 'https://example.com/large.jpg',
            small_capsule_image: 'https://example.com/small.jpg',
            windows_available: true,
            mac_available: false,
            linux_available: false,
            streamingvideo_available: false,
            header_image: 'https://example.com/header.jpg',
          },
          {
            id: 1091501,
            type: 0,
            name: 'Cyberpunk 2077 DLC',
            discounted: false,
            discount_percent: 0,
            original_price: 2999,
            final_price: 2999,
            currency: 'USD',
            large_capsule_image: 'https://example.com/large2.jpg',
            small_capsule_image: 'https://example.com/small2.jpg',
            windows_available: true,
            mac_available: false,
            linux_available: false,
            streamingvideo_available: false,
            header_image: 'https://example.com/header2.jpg',
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockSearchResults,
      });

      const result = await apiClient.searchGames('Cyberpunk', 10);

      expect(result).toEqual([
        { appid: 1091500, name: 'Cyberpunk 2077' },
        { appid: 1091501, name: 'Cyberpunk 2077 DLC' },
      ]);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://store.steampowered.com/api/storesearch/',
        {
          params: {
            term: 'Cyberpunk',
            l: 'english',
            cc: 'US',
          },
        }
      );
    });

    it('should respect the limit parameter', async () => {
      const mockSearchResults = {
        total: 5,
        items: [
          { id: 1, name: 'Game 1', type: 0, discounted: false, discount_percent: 0, original_price: 0, final_price: 0, currency: 'USD', large_capsule_image: '', small_capsule_image: '', windows_available: true, mac_available: false, linux_available: false, streamingvideo_available: false, header_image: '' },
          { id: 2, name: 'Game 2', type: 0, discounted: false, discount_percent: 0, original_price: 0, final_price: 0, currency: 'USD', large_capsule_image: '', small_capsule_image: '', windows_available: true, mac_available: false, linux_available: false, streamingvideo_available: false, header_image: '' },
          { id: 3, name: 'Game 3', type: 0, discounted: false, discount_percent: 0, original_price: 0, final_price: 0, currency: 'USD', large_capsule_image: '', small_capsule_image: '', windows_available: true, mac_available: false, linux_available: false, streamingvideo_available: false, header_image: '' },
          { id: 4, name: 'Game 4', type: 0, discounted: false, discount_percent: 0, original_price: 0, final_price: 0, currency: 'USD', large_capsule_image: '', small_capsule_image: '', windows_available: true, mac_available: false, linux_available: false, streamingvideo_available: false, header_image: '' },
          { id: 5, name: 'Game 5', type: 0, discounted: false, discount_percent: 0, original_price: 0, final_price: 0, currency: 'USD', large_capsule_image: '', small_capsule_image: '', windows_available: true, mac_available: false, linux_available: false, streamingvideo_available: false, header_image: '' },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockSearchResults,
      });

      const result = await apiClient.searchGames('Game', 2);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { appid: 1, name: 'Game 1' },
        { appid: 2, name: 'Game 2' },
      ]);
    });

    it('should return empty array for empty search term', async () => {
      const result = await apiClient.searchGames('', 10);

      expect(result).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should trim search term before searching', async () => {
      const mockSearchResults = {
        total: 1,
        items: [
          {
            id: 570,
            name: 'Dota 2',
            type: 0,
            discounted: false,
            discount_percent: 0,
            original_price: 0,
            final_price: 0,
            currency: 'USD',
            large_capsule_image: '',
            small_capsule_image: '',
            windows_available: true,
            mac_available: false,
            linux_available: false,
            streamingvideo_available: false,
            header_image: '',
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockSearchResults,
      });

      await apiClient.searchGames('  Dota  ', 10);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://store.steampowered.com/api/storesearch/',
        {
          params: {
            term: 'Dota',
            l: 'english',
            cc: 'US',
          },
        }
      );
    });

    it('should use default limit of 25 when not specified', async () => {
      const mockSearchResults = {
        total: 1,
        items: [
          {
            id: 570,
            name: 'Dota 2',
            type: 0,
            discounted: false,
            discount_percent: 0,
            original_price: 0,
            final_price: 0,
            currency: 'USD',
            large_capsule_image: '',
            small_capsule_image: '',
            windows_available: true,
            mac_available: false,
            linux_available: false,
            streamingvideo_available: false,
            header_image: '',
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockSearchResults,
      });

      const result = await apiClient.searchGames('Dota');

      expect(result).toHaveLength(1);
    });

    it('should throw SteamApiError on API failure', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 500,
          data: {},
        },
        message: 'Internal Server Error',
      });

      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      await expect(apiClient.searchGames('Cyberpunk', 10)).rejects.toThrow(
        SteamApiError
      );
    });

    it('should throw InvalidApiKeyError on 401 response', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 401,
          data: {},
        },
        message: 'Unauthorized',
      });

      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      await expect(apiClient.searchGames('Cyberpunk', 10)).rejects.toThrow(
        InvalidApiKeyError
      );
    });

    it('should throw RateLimitError when rate limit exceeded', async () => {
      // Consume all tokens
      for (let i = 0; i < 200; i++) {
        apiClient.canMakeRequest();
      }

      await expect(apiClient.searchGames('Cyberpunk', 10)).rejects.toThrow(
        RateLimitError
      );
    });
  });

  describe('getGameDetails', () => {
    it('should return game details on success', async () => {
      const mockGameData = {
        '1091500': {
          success: true,
          data: {
            name: 'Cyberpunk 2077',
            type: 'game',
            required_age: 17,
            is_free: false,
            detailed_description: 'Description',
            short_description: 'Short desc',
            header_image: 'https://example.com/header.jpg',
            publishers: ['CD PROJEKT RED'],
            developers: ['CD PROJEKT RED'],
            price_overview: {
              currency: 'USD',
              initial: 5999,
              final: 5999,
              discount_percent: 0,
              initial_formatted: '$59.99',
              final_formatted: '$59.99',
            },
            release_date: {
              coming_soon: false,
              date: 'Dec 10, 2020',
            },
            categories: [],
            genres: [],
            screenshots: [],
            content_descriptors: {
              ids: [],
            },
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockGameData,
      });

      const result = await apiClient.getGameDetails('1091500');

      expect(result.name).toBe('Cyberpunk 2077');
      expect(result.appId).toBe('1091500');
    });

    it('should throw GameNotFoundError when game not found', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          '9999999': {
            success: false,
          },
        },
      });

      await expect(apiClient.getGameDetails('9999999')).rejects.toThrow(
        GameNotFoundError
      );
    });

    it('should throw InvalidApiKeyError on 401', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 401,
          data: {},
        },
        message: 'Unauthorized',
      });

      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      await expect(apiClient.getGameDetails('1091500')).rejects.toThrow(
        InvalidApiKeyError
      );
    });

    it('should re-throw GameNotFoundError', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          '1091500': {
            success: false,
          },
        },
      });

      await expect(apiClient.getGameDetails('1091500')).rejects.toThrow(
        GameNotFoundError
      );
    });
  });

  describe('rate limiting', () => {
    it('should allow requests initially', () => {
      expect(apiClient.canMakeRequest()).toBe(true);
    });

    it('should block requests when rate limit exceeded', () => {
      // Consume all tokens
      for (let i = 0; i < 200; i++) {
        apiClient.canMakeRequest();
      }

      expect(apiClient.canMakeRequest()).toBe(false);
    });

    it('should throw RateLimitError when rate limit exceeded', async () => {
      // Consume all tokens
      for (let i = 0; i < 200; i++) {
        apiClient.canMakeRequest();
      }

      await expect(apiClient.getAppList()).rejects.toThrow(RateLimitError);
    });

    it('should return retry time', () => {
      const retryAfter = apiClient.getRetryAfter();
      expect(typeof retryAfter).toBe('number');
      expect(retryAfter).toBeGreaterThan(0);
    });
  });

  describe('getReviewStats', () => {
    it('should return review statistics when available', async () => {
      const mockReviewData = {
        success: 1,
        query_summary: {
          num_reviews: 0,
          review_score: 8,
          review_score_desc: 'Very Positive',
          total_positive: 155,
          total_negative: 5,
          total_reviews: 160,
        },
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockReviewData,
      });

      const result = await apiClient.getReviewStats('3127230');

      expect(result).toEqual({
        totalPositive: 155,
        totalNegative: 5,
        totalReviews: 160,
        reviewScore: 8,
        reviewScoreDesc: 'Very Positive',
      });
    });

    it('should return undefined when API returns success: 0', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: 0,
        },
      });

      const result = await apiClient.getReviewStats('9999999');

      expect(result).toBeUndefined();
    });

    it('should return undefined when query_summary is missing', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          success: 1,
          // no query_summary
        },
      });

      const result = await apiClient.getReviewStats('1234567');

      expect(result).toBeUndefined();
    });

    it('should return undefined on network error (graceful degradation)', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await apiClient.getReviewStats('1091500');

      expect(result).toBeUndefined();
    });

    it('should call correct endpoint with proper params', async () => {
      const mockReviewData = {
        success: 1,
        query_summary: {
          num_reviews: 0,
          review_score: 7,
          review_score_desc: 'Mostly Positive',
          total_positive: 2232,
          total_negative: 278,
          total_reviews: 2510,
        },
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockReviewData,
      });

      await apiClient.getReviewStats('1137750');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://store.steampowered.com/appreviews/1137750',
        {
          params: {
            json: 1,
            language: 'all',
            purchase_type: 'all',
            num_per_page: 0,
          },
        }
      );
    });

    it('should handle games with overwhelmingly positive reviews', async () => {
      const mockReviewData = {
        success: 1,
        query_summary: {
          num_reviews: 0,
          review_score: 9,
          review_score_desc: 'Overwhelmingly Positive',
          total_positive: 500000,
          total_negative: 5000,
          total_reviews: 505000,
        },
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockReviewData,
      });

      const result = await apiClient.getReviewStats('570');

      expect(result?.reviewScoreDesc).toBe('Overwhelmingly Positive');
      expect(result?.totalPositive).toBe(500000);
    });

    it('should handle games with negative reviews', async () => {
      const mockReviewData = {
        success: 1,
        query_summary: {
          num_reviews: 0,
          review_score: 2,
          review_score_desc: 'Mostly Negative',
          total_positive: 100,
          total_negative: 400,
          total_reviews: 500,
        },
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockReviewData,
      });

      const result = await apiClient.getReviewStats('123456');

      expect(result?.reviewScoreDesc).toBe('Mostly Negative');
      expect(result?.totalNegative).toBe(400);
    });
  });
});
