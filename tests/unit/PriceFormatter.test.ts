import { PriceFormatter } from '../../src/utils/PriceFormatter';
import { PriceOverview } from '../../src/types/SteamGameDetails';

describe('PriceFormatter', () => {
  describe('format', () => {
    it('should return formatted price from Steam API', () => {
      const priceOverview: PriceOverview = {
        currency: 'USD',
        initial: 5999,
        final: 5999,
        discountPercent: 0,
        initialFormatted: '$59.99',
        finalFormatted: '$59.99',
      };

      expect(PriceFormatter.format(priceOverview)).toBe('$59.99');
    });

    it('should return discounted price', () => {
      const priceOverview: PriceOverview = {
        currency: 'USD',
        initial: 5999,
        final: 2999,
        discountPercent: 50,
        initialFormatted: '$59.99',
        finalFormatted: '$29.99',
      };

      expect(PriceFormatter.format(priceOverview)).toBe('$29.99');
    });

    it('should handle different currencies', () => {
      const priceOverview: PriceOverview = {
        currency: 'EUR',
        initial: 4999,
        final: 4999,
        discountPercent: 0,
        initialFormatted: '€49.99',
        finalFormatted: '€49.99',
      };

      expect(PriceFormatter.format(priceOverview)).toBe('€49.99');
    });
  });

  describe('formatFree', () => {
    it('should return "Free to Play" for free games', () => {
      expect(PriceFormatter.formatFree()).toBe('Free to Play');
    });
  });
});
