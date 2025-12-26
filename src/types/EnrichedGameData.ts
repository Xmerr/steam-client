/**
 * Enriched and simplified game metadata
 */

/**
 * Steam rating information
 */
export interface SteamRating {
  /** Rating percentage (0-100) */
  percent: number;

  /** Total number of ratings */
  total: number;
}

/**
 * Combined rating information
 */
export interface Rating {
  /** Metacritic score (0-100, if available) */
  metacritic?: number;

  /** Steam user rating (if available) */
  steam?: SteamRating;
}

/**
 * Partial game data for enrichment input
 */
export interface PartialGameData {
  /** Game title */
  title: string;

  /** Steam ID if already known (optional) */
  steamId?: string;
}

/**
 * Enriched game data output
 */
export interface EnrichedGameData {
  /** Steam application ID */
  steamId?: string;

  /** Steam store page URL */
  steamUrl?: string;

  /** Cover image URL (header image 460x215) */
  coverUrl?: string;

  /** Formatted price (e.g., "$59.99" or "Free to Play") */
  price?: string;

  /** Formatted release date (e.g., "Dec 10, 2020") */
  releaseDate?: string;

  /** Array of category/genre names */
  categories?: string[];

  /** Rating information (Metacritic and Steam) */
  rating?: Rating;

  /** Screenshot URLs (up to 3 full-size images) */
  screenshots?: string[];

  /** Whether the game contains adult content */
  isAdult?: boolean;
}
