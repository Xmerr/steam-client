/**
 * Detailed Steam game information from Steam API
 */

/**
 * Price information from Steam API
 */
export interface PriceOverview {
  /** Currency code (e.g., "USD") */
  currency: string;

  /** Initial price in cents */
  initial: number;

  /** Final price in cents (after discount) */
  final: number;

  /** Discount percentage (0-100) */
  discountPercent: number;

  /** Formatted initial price (e.g., "$59.99") */
  initialFormatted: string;

  /** Formatted final price (e.g., "$47.99") */
  finalFormatted: string;
}

/**
 * Release date information
 */
export interface ReleaseDate {
  /** Whether the game is coming soon */
  comingSoon: boolean;

  /** Release date string (e.g., "Dec 10, 2020") */
  date: string;
}

/**
 * Game category information
 */
export interface Category {
  /** Category ID */
  id: number;

  /** Category description (e.g., "Single-player", "Multi-player") */
  description: string;
}

/**
 * Game genre information
 */
export interface Genre {
  /** Genre ID */
  id: string;

  /** Genre description (e.g., "Action", "RPG") */
  description: string;
}

/**
 * Screenshot information
 */
export interface Screenshot {
  /** Screenshot ID */
  id: number;

  /** Thumbnail path (600x338) */
  pathThumbnail: string;

  /** Full-size path (1920x1080) */
  pathFull: string;
}

/**
 * Metacritic score information
 */
export interface Metacritic {
  /** Metacritic score (0-100) */
  score: number;

  /** Metacritic review URL */
  url: string;
}

/**
 * User recommendations information
 */
export interface Recommendations {
  /** Total number of recommendations */
  total: number;
}

/**
 * Content descriptors (age ratings, content warnings)
 */
export interface ContentDescriptors {
  /** Array of content descriptor IDs (3 = Adult Only Sexual Content) */
  ids: number[];

  /** Optional content warning notes */
  notes?: string;
}

/**
 * Complete Steam game details from API
 */
export interface SteamGameDetails {
  /** Steam application ID */
  appId: string;

  /** Game title */
  name: string;

  /** Application type (e.g., "game", "dlc", "demo") */
  type: string;

  /** Required minimum age (18+ = adult) */
  requiredAge: number;

  /** Whether the game is free to play */
  isFree: boolean;

  /** Detailed description (HTML) */
  detailedDescription: string;

  /** Short description */
  shortDescription: string;

  /** Header image URL (460x215) */
  headerImage: string;

  /** Publisher names */
  publishers: string[];

  /** Developer names */
  developers: string[];

  /** Price information (undefined for free games) */
  priceOverview?: PriceOverview;

  /** Release date information */
  releaseDate: ReleaseDate;

  /** Game categories */
  categories: Category[];

  /** Game genres */
  genres: Genre[];

  /** Screenshot images */
  screenshots: Screenshot[];

  /** Metacritic score (if available) */
  metacritic?: Metacritic;

  /** User recommendations (if available) */
  recommendations?: Recommendations;

  /** Content descriptors and warnings */
  contentDescriptors: ContentDescriptors;
}
