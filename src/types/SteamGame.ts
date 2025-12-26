/**
 * Basic Steam game information from search results
 */
export interface SteamGame {
  /** Steam application ID */
  appId: string;

  /** Game title */
  name: string;

  /** Fuzzy match confidence score (0-1, higher = better match) */
  matchScore?: number;
}
