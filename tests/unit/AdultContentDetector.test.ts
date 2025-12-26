import { AdultContentDetector } from '../../src/services/AdultContentDetector';
import { SteamGameDetails } from '../../src/types/SteamGameDetails';

describe('AdultContentDetector', () => {
  let detector: AdultContentDetector;

  beforeEach(() => {
    detector = new AdultContentDetector();
  });

  const createMockGameDetails = (overrides?: Partial<SteamGameDetails>): SteamGameDetails => ({
    appId: '123',
    name: 'Test Game',
    type: 'game',
    requiredAge: 0,
    isFree: false,
    detailedDescription: '',
    shortDescription: '',
    headerImage: '',
    publishers: [],
    developers: [],
    releaseDate: { comingSoon: false, date: '' },
    categories: [],
    genres: [],
    screenshots: [],
    contentDescriptors: { ids: [] },
    ...overrides,
  });

  describe('isAdult', () => {
    it('should detect adult content from age restriction', () => {
      const gameDetails = createMockGameDetails({ requiredAge: 18 });

      expect(detector.isAdult(gameDetails)).toBe(true);
    });

    it('should detect adult content from descriptor ID 3', () => {
      const gameDetails = createMockGameDetails({
        contentDescriptors: { ids: [1, 2, 3] },
      });

      expect(detector.isAdult(gameDetails)).toBe(true);
    });

    it('should detect adult content from category', () => {
      const gameDetails = createMockGameDetails({
        categories: [
          { id: 1, description: 'Single-player' },
          { id: 2, description: 'Adult Only Content' },
        ],
      });

      expect(detector.isAdult(gameDetails)).toBe(true);
    });

    it('should return false for non-adult game', () => {
      const gameDetails = createMockGameDetails({
        requiredAge: 13,
        contentDescriptors: { ids: [1, 2] },
        categories: [{ id: 1, description: 'Single-player' }],
      });

      expect(detector.isAdult(gameDetails)).toBe(false);
    });

    it('should detect adult content with multiple signals', () => {
      const gameDetails = createMockGameDetails({
        requiredAge: 18,
        contentDescriptors: { ids: [3] },
        categories: [{ id: 99, description: 'Adult Only' }],
      });

      expect(detector.isAdult(gameDetails)).toBe(true);
    });
  });

  describe('hasAgeRestriction', () => {
    it('should return true for age 18', () => {
      expect(detector.hasAgeRestriction(18)).toBe(true);
    });

    it('should return true for age above 18', () => {
      expect(detector.hasAgeRestriction(21)).toBe(true);
    });

    it('should return false for age 17', () => {
      expect(detector.hasAgeRestriction(17)).toBe(false);
    });

    it('should return false for age 0', () => {
      expect(detector.hasAgeRestriction(0)).toBe(false);
    });
  });

  describe('hasAdultDescriptor', () => {
    it('should detect descriptor ID 3', () => {
      expect(detector.hasAdultDescriptor([3])).toBe(true);
    });

    it('should detect descriptor ID 3 in array', () => {
      expect(detector.hasAdultDescriptor([1, 2, 3, 4])).toBe(true);
    });

    it('should return false for other descriptors', () => {
      expect(detector.hasAdultDescriptor([1, 2, 4, 5])).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(detector.hasAdultDescriptor([])).toBe(false);
    });
  });

  describe('hasAdultCategory', () => {
    it('should detect "Adult Only" category (exact case)', () => {
      const categories = [
        { id: 1, description: 'Single-player' },
        { id: 2, description: 'Adult Only' },
      ];

      expect(detector.hasAdultCategory(categories)).toBe(true);
    });

    it('should detect "adult only" category (lowercase)', () => {
      const categories = [{ id: 1, description: 'adult only' }];

      expect(detector.hasAdultCategory(categories)).toBe(true);
    });

    it('should detect "ADULT ONLY" category (uppercase)', () => {
      const categories = [{ id: 1, description: 'ADULT ONLY' }];

      expect(detector.hasAdultCategory(categories)).toBe(true);
    });

    it('should detect "Adult Only Content" (partial match)', () => {
      const categories = [{ id: 1, description: 'Adult Only Content' }];

      expect(detector.hasAdultCategory(categories)).toBe(true);
    });

    it('should return false for non-adult categories', () => {
      const categories = [
        { id: 1, description: 'Single-player' },
        { id: 2, description: 'Multi-player' },
        { id: 3, description: 'Action' },
      ];

      expect(detector.hasAdultCategory(categories)).toBe(false);
    });

    it('should return false for empty categories', () => {
      expect(detector.hasAdultCategory([])).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined content descriptors notes', () => {
      const gameDetails = createMockGameDetails({
        contentDescriptors: { ids: [3], notes: undefined },
      });

      expect(detector.isAdult(gameDetails)).toBe(true);
    });

    it('should handle missing categories array', () => {
      const gameDetails = createMockGameDetails({
        categories: [],
      });

      expect(detector.isAdult(gameDetails)).toBe(false);
    });
  });
});
