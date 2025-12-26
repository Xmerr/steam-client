/**
 * @xmer/steam-client
 *
 * TypeScript client for Steam Web API with game search, metadata enrichment,
 * and adult content detection capabilities.
 *
 * @packageDocumentation
 */

// Main client
export { SteamClient } from './client/SteamClient';

// Types
export type {
  SteamClientConfig,
  SearchOptions,
  CacheStats,
} from './types/Config';

export type { SteamGame } from './types/SteamGame';

export type {
  SteamGameDetails,
  PriceOverview,
  ReleaseDate,
  Category,
  Genre,
  Screenshot,
  Metacritic,
  Recommendations,
  ContentDescriptors,
} from './types/SteamGameDetails';

export type {
  EnrichedGameData,
  PartialGameData,
  Rating,
  SteamRating,
} from './types/EnrichedGameData';

// Errors
export {
  SteamClientError,
  SteamApiError,
  GameNotFoundError,
  RateLimitError,
  InvalidApiKeyError,
} from './errors/SteamErrors';
