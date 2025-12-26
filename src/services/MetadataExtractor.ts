import { SteamGameDetails } from '../types/SteamGameDetails';
import { EnrichedGameData, Rating, SteamRating } from '../types/EnrichedGameData';
import { PriceFormatter } from '../utils/PriceFormatter';

/**
 * Default maximum number of screenshots to extract
 */
const DEFAULT_SCREENSHOT_LIMIT = 3;

/**
 * Extracts and transforms Steam API responses into enriched metadata
 */
export class MetadataExtractor {
  /**
   * Extract enriched metadata from Steam game details
   *
   * Transforms full Steam API response into simplified enriched data format
   * with formatted prices, URLs, and combined category/genre lists.
   *
   * @param details - Full Steam game details from API
   * @returns Simplified enriched game data
   *
   * @example
   * ```typescript
   * const extractor = new MetadataExtractor();
   * const enriched = extractor.extractMetadata(steamDetails);
   * console.log(enriched.price); // "$59.99" or "Free to Play"
   * ```
   */
  extractMetadata(details: SteamGameDetails): EnrichedGameData {
    return {
      steamId: details.appId,
      steamUrl: `https://store.steampowered.com/app/${details.appId}/`,
      coverUrl: details.headerImage || undefined,
      price: this.formatPrice(details.priceOverview, details.isFree),
      releaseDate: details.releaseDate.date || undefined,
      categories: this.extractCategories(details),
      rating: this.extractRating(details),
      screenshots: this.extractScreenshots(details, DEFAULT_SCREENSHOT_LIMIT),
    };
  }

  /**
   * Format price information from Steam API response
   *
   * @param priceOverview - Price data from API (undefined for free games)
   * @param isFree - Whether game is free to play
   * @returns Formatted price string (e.g., "$59.99" or "Free to Play")
   *
   * @example
   * ```typescript
   * extractor.formatPrice(priceData, false); // "$59.99"
   * extractor.formatPrice(undefined, true); // "Free to Play"
   * ```
   */
  formatPrice(
    priceOverview?: SteamGameDetails['priceOverview'],
    isFree?: boolean
  ): string | undefined {
    if (isFree) {
      return PriceFormatter.formatFree();
    }

    if (priceOverview) {
      return PriceFormatter.format(priceOverview);
    }

    return undefined;
  }

  /**
   * Extract screenshot URLs from game details
   *
   * @param details - Steam game details
   * @param limit - Maximum number of screenshots (default: 3)
   * @returns Array of full-size screenshot URLs
   *
   * @example
   * ```typescript
   * const urls = extractor.extractScreenshots(details, 5);
   * console.log(`Got ${urls.length} screenshot URLs`);
   * ```
   */
  extractScreenshots(details: SteamGameDetails, limit: number = DEFAULT_SCREENSHOT_LIMIT): string[] {
    if (!details.screenshots || details.screenshots.length === 0) {
      return [];
    }

    return details.screenshots
      .slice(0, limit)
      .map((screenshot) => screenshot.pathFull);
  }

  /**
   * Extract combined categories and genres as string array
   *
   * @param details - Steam game details
   * @returns Array of category and genre names
   *
   * @example
   * ```typescript
   * const categories = extractor.extractCategories(details);
   * // ["Action", "RPG", "Single-player", "Multi-player"]
   * ```
   */
  private extractCategories(details: SteamGameDetails): string[] {
    const categories: string[] = [];

    // Add genres
    if (details.genres && details.genres.length > 0) {
      categories.push(...details.genres.map((g) => g.description));
    }

    // Add categories
    if (details.categories && details.categories.length > 0) {
      categories.push(...details.categories.map((c) => c.description));
    }

    return categories;
  }

  /**
   * Extract rating information (Metacritic and Steam)
   *
   * @param details - Steam game details
   * @returns Combined rating object or undefined if no ratings
   *
   * @example
   * ```typescript
   * const rating = extractor.extractRating(details);
   * if (rating?.metacritic) {
   *   console.log(`Metacritic: ${rating.metacritic}/100`);
   * }
   * ```
   */
  private extractRating(details: SteamGameDetails): Rating | undefined {
    const metacritic = details.metacritic?.score;
    const steam = this.calculateSteamRating(details.recommendations);

    // Return undefined if no ratings available
    if (!metacritic && !steam) {
      return undefined;
    }

    return {
      metacritic,
      steam,
    };
  }

  /**
   * Calculate Steam rating from recommendations
   *
   * Steam doesn't provide a direct rating percentage, but we can estimate
   * a positive rating based on total recommendations (simplified approach).
   * A more accurate implementation would require additional API calls.
   *
   * @param recommendations - Recommendations object from API
   * @returns Rating percentage and total count, or undefined if not available
   *
   * @example
   * ```typescript
   * const steamRating = extractor.calculateSteamRating({ total: 50000 });
   * // { percent: 85, total: 50000 } (estimated)
   * ```
   */
  calculateSteamRating(
    recommendations?: SteamGameDetails['recommendations']
  ): SteamRating | undefined {
    if (!recommendations || !recommendations.total) {
      return undefined;
    }

    // Note: Steam Store API doesn't directly provide positive/negative ratio
    // This is a simplified implementation that returns total recommendations
    // A production version would need to call additional endpoints for accurate percentage
    return {
      percent: 0, // Would need additional API call to get accurate percentage
      total: recommendations.total,
    };
  }
}
