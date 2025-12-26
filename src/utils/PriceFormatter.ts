import { PriceOverview } from '../types/SteamGameDetails';

/**
 * Utility class for formatting price data from Steam API
 */
export class PriceFormatter {
  /**
   * Format price overview into readable string
   *
   * @param priceOverview - Price data from Steam API
   * @returns Formatted price string (e.g., "$59.99")
   *
   * @example
   * ```typescript
   * const priceData = {
   *   currency: 'USD',
   *   final: 5999,
   *   finalFormatted: '$59.99'
   * };
   * PriceFormatter.format(priceData); // Returns: "$59.99"
   * ```
   */
  static format(priceOverview: PriceOverview): string {
    // Use the pre-formatted string from Steam API
    return priceOverview.finalFormatted;
  }

  /**
   * Get formatted string for free-to-play games
   *
   * @returns "Free to Play" string
   *
   * @example
   * ```typescript
   * PriceFormatter.formatFree(); // Returns: "Free to Play"
   * ```
   */
  static formatFree(): string {
    return 'Free to Play';
  }
}
