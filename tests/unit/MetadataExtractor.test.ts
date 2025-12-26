import { MetadataExtractor } from '../../src/services/MetadataExtractor';
import { SteamGameDetails } from '../../src/types/SteamGameDetails';

describe('MetadataExtractor', () => {
  let extractor: MetadataExtractor;

  beforeEach(() => {
    extractor = new MetadataExtractor();
  });

  const createMockGameDetails = (overrides?: Partial<SteamGameDetails>): SteamGameDetails => ({
    appId: '1091500',
    name: 'Test Game',
    type: 'game',
    requiredAge: 0,
    isFree: false,
    detailedDescription: '',
    shortDescription: '',
    headerImage: 'https://example.com/header.jpg',
    publishers: [],
    developers: [],
    priceOverview: {
      currency: 'USD',
      initial: 5999,
      final: 5999,
      discountPercent: 0,
      initialFormatted: '$59.99',
      finalFormatted: '$59.99',
    },
    releaseDate: { comingSoon: false, date: 'Dec 10, 2020' },
    categories: [{ id: 1, description: 'Single-player' }],
    genres: [{ id: '1', description: 'Action' }],
    screenshots: [
      {
        id: 0,
        pathThumbnail: 'https://example.com/thumb1.jpg',
        pathFull: 'https://example.com/full1.jpg',
      },
    ],
    metacritic: { score: 86, url: 'https://metacritic.com/game' },
    recommendations: { total: 450000 },
    contentDescriptors: { ids: [] },
    ...overrides,
  });

  describe('extractMetadata', () => {
    it('should extract all metadata fields', () => {
      const gameDetails = createMockGameDetails();
      const enriched = extractor.extractMetadata(gameDetails);

      expect(enriched.steamId).toBe('1091500');
      expect(enriched.steamUrl).toBe('https://store.steampowered.com/app/1091500/');
      expect(enriched.coverUrl).toBe('https://example.com/header.jpg');
      expect(enriched.price).toBe('$59.99');
      expect(enriched.releaseDate).toBe('Dec 10, 2020');
      expect(enriched.categories).toEqual(['Action', 'Single-player']);
      expect(enriched.rating).toEqual({
        metacritic: 86,
        steam: { percent: 0, total: 450000 },
      });
      expect(enriched.screenshots).toEqual(['https://example.com/full1.jpg']);
    });

    it('should handle missing header image', () => {
      const gameDetails = createMockGameDetails({ headerImage: '' });
      const enriched = extractor.extractMetadata(gameDetails);

      expect(enriched.coverUrl).toBeUndefined();
    });

    it('should handle free-to-play games', () => {
      const gameDetails = createMockGameDetails({
        isFree: true,
        priceOverview: undefined,
      });
      const enriched = extractor.extractMetadata(gameDetails);

      expect(enriched.price).toBe('Free to Play');
    });

    it('should handle missing release date', () => {
      const gameDetails = createMockGameDetails({
        releaseDate: { comingSoon: false, date: '' },
      });
      const enriched = extractor.extractMetadata(gameDetails);

      expect(enriched.releaseDate).toBeUndefined();
    });

    it('should handle missing metacritic', () => {
      const gameDetails = createMockGameDetails({ metacritic: undefined });
      const enriched = extractor.extractMetadata(gameDetails);

      expect(enriched.rating).toEqual({
        metacritic: undefined,
        steam: { percent: 0, total: 450000 },
      });
    });

    it('should handle missing recommendations', () => {
      const gameDetails = createMockGameDetails({
        metacritic: undefined,
        recommendations: undefined,
      });
      const enriched = extractor.extractMetadata(gameDetails);

      expect(enriched.rating).toBeUndefined();
    });

    it('should handle missing screenshots', () => {
      const gameDetails = createMockGameDetails({ screenshots: [] });
      const enriched = extractor.extractMetadata(gameDetails);

      expect(enriched.screenshots).toEqual([]);
    });
  });

  describe('formatPrice', () => {
    it('should format paid game price', () => {
      const priceOverview = {
        currency: 'USD',
        initial: 5999,
        final: 5999,
        discountPercent: 0,
        initialFormatted: '$59.99',
        finalFormatted: '$59.99',
      };

      expect(extractor.formatPrice(priceOverview, false)).toBe('$59.99');
    });

    it('should return "Free to Play" for free games', () => {
      expect(extractor.formatPrice(undefined, true)).toBe('Free to Play');
    });

    it('should return undefined for games without price info', () => {
      expect(extractor.formatPrice(undefined, false)).toBeUndefined();
    });

    it('should use final price for discounted games', () => {
      const priceOverview = {
        currency: 'USD',
        initial: 5999,
        final: 2999,
        discountPercent: 50,
        initialFormatted: '$59.99',
        finalFormatted: '$29.99',
      };

      expect(extractor.formatPrice(priceOverview, false)).toBe('$29.99');
    });
  });

  describe('extractScreenshots', () => {
    it('should extract full-size screenshot URLs', () => {
      const gameDetails = createMockGameDetails({
        screenshots: [
          { id: 0, pathThumbnail: 'thumb1.jpg', pathFull: 'full1.jpg' },
          { id: 1, pathThumbnail: 'thumb2.jpg', pathFull: 'full2.jpg' },
          { id: 2, pathThumbnail: 'thumb3.jpg', pathFull: 'full3.jpg' },
        ],
      });

      const urls = extractor.extractScreenshots(gameDetails, 3);

      expect(urls).toEqual(['full1.jpg', 'full2.jpg', 'full3.jpg']);
    });

    it('should limit number of screenshots', () => {
      const gameDetails = createMockGameDetails({
        screenshots: [
          { id: 0, pathThumbnail: 'thumb1.jpg', pathFull: 'full1.jpg' },
          { id: 1, pathThumbnail: 'thumb2.jpg', pathFull: 'full2.jpg' },
          { id: 2, pathThumbnail: 'thumb3.jpg', pathFull: 'full3.jpg' },
          { id: 3, pathThumbnail: 'thumb4.jpg', pathFull: 'full4.jpg' },
          { id: 4, pathThumbnail: 'thumb5.jpg', pathFull: 'full5.jpg' },
        ],
      });

      const urls = extractor.extractScreenshots(gameDetails, 2);

      expect(urls).toHaveLength(2);
      expect(urls).toEqual(['full1.jpg', 'full2.jpg']);
    });

    it('should handle empty screenshots', () => {
      const gameDetails = createMockGameDetails({ screenshots: [] });

      const urls = extractor.extractScreenshots(gameDetails, 3);

      expect(urls).toEqual([]);
    });

    it('should use default limit of 3', () => {
      const gameDetails = createMockGameDetails({
        screenshots: [
          { id: 0, pathThumbnail: 'thumb1.jpg', pathFull: 'full1.jpg' },
          { id: 1, pathThumbnail: 'thumb2.jpg', pathFull: 'full2.jpg' },
          { id: 2, pathThumbnail: 'thumb3.jpg', pathFull: 'full3.jpg' },
          { id: 3, pathThumbnail: 'thumb4.jpg', pathFull: 'full4.jpg' },
        ],
      });

      const urls = extractor.extractScreenshots(gameDetails);

      expect(urls).toHaveLength(3);
    });
  });

  describe('calculateSteamRating', () => {
    it('should return rating with total recommendations', () => {
      const rating = extractor.calculateSteamRating({ total: 450000 });

      expect(rating).toEqual({
        percent: 0,
        total: 450000,
      });
    });

    it('should return undefined for missing recommendations', () => {
      const rating = extractor.calculateSteamRating(undefined);

      expect(rating).toBeUndefined();
    });

    it('should return undefined for zero recommendations', () => {
      const rating = extractor.calculateSteamRating({ total: 0 });

      expect(rating).toBeUndefined();
    });
  });

  describe('category extraction', () => {
    it('should combine genres and categories', () => {
      const gameDetails = createMockGameDetails({
        genres: [
          { id: '1', description: 'Action' },
          { id: '23', description: 'RPG' },
        ],
        categories: [
          { id: 1, description: 'Single-player' },
          { id: 2, description: 'Steam Achievements' },
        ],
      });

      const enriched = extractor.extractMetadata(gameDetails);

      expect(enriched.categories).toEqual([
        'Action',
        'RPG',
        'Single-player',
        'Steam Achievements',
      ]);
    });

    it('should handle missing genres', () => {
      const gameDetails = createMockGameDetails({
        genres: [],
        categories: [{ id: 1, description: 'Single-player' }],
      });

      const enriched = extractor.extractMetadata(gameDetails);

      expect(enriched.categories).toEqual(['Single-player']);
    });

    it('should handle missing categories', () => {
      const gameDetails = createMockGameDetails({
        genres: [{ id: '1', description: 'Action' }],
        categories: [],
      });

      const enriched = extractor.extractMetadata(gameDetails);

      expect(enriched.categories).toEqual(['Action']);
    });
  });
});
