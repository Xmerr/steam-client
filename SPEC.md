Project Overview
Create a standalone npm package that provides a TypeScript client for the Steam Web API with game search, metadata enrichment, and adult content detection capabilities. This package will be used by game release notification systems and other Steam-related applications.
Package Metadata

Name: @xmer/steam-client
Version: 1.0.0
Description: TypeScript client for Steam Web API with game matching and metadata enrichment
License: MIT
Repository: Monorepo package under packages/steam-client/
Main Entry: dist/index.js
Types: dist/index.d.ts

Core Requirements
1. Steam API Client

Authenticate with Steam Web API using API key
Implement rate limiting (200 requests per 5 minutes per Steam API limits)
Handle API errors gracefully with typed error responses
Support for the following Steam API endpoints:

ISteamApps/GetAppList/v2 - Get all Steam apps
IStoreService/GetAppDetails/v1 - Get detailed app information
Steam Store API (https://store.steampowered.com/api/appdetails?appids={id})



2. Game Search & Matching

Exact Match: Search by exact title
Fuzzy Match: Use Fuse.js for approximate string matching with configurable threshold (default: 0.3)
Multi-word Search: Handle games with special characters, subtitles, years in parentheses
Normalization: Strip common words like "Repack", "FitGirl", "Complete Edition" before matching
Return Steam App ID, title, and match confidence score

3. Metadata Extraction
Extract and format the following metadata from Steam API responses:

Steam ID: App ID as string
Steam URL: Store page URL (https://store.steampowered.com/app/{id}/)
Cover Image: Header image URL (460x215 default)
Price: Current price with currency (e.g., "$59.99", "Free to Play")
Release Date: Formatted release date (e.g., "Dec 10, 2020")
Categories/Genres: Array of category names (e.g., ["Action", "RPG", "Open World"])
Ratings:

Metacritic score (0-100) if available
Steam user reviews percentage and count


Screenshots: Up to 3 screenshot URLs (1920x1080 preferred)
Is Adult: Boolean flag for adult content

4. Adult Content Detection

Check required_age field (18+ = adult)
Check content_descriptors.ids for adult content descriptor IDs (3 = Adult Only Sexual Content)
Check categories for "Adult Only" tags
Return boolean flag for downstream filtering

5. Caching Layer

Implement LRU cache for Steam app list (TTL: 24 hours)
Cache individual game details (TTL: 1 hour)
Configurable cache size and TTL
Option to bypass cache for fresh data

6. Error Handling
Custom error types:

SteamApiError: API request failures with status codes
GameNotFoundError: No match found for search query
RateLimitError: Rate limit exceeded
InvalidApiKeyError: Authentication failure

Public API Surface
typescript// Main Client Class
export class SteamClient {
  constructor(config: SteamClientConfig);
  
  // Search & Match
  searchGame(title: string, options?: SearchOptions): Promise<SteamGame | null>;
  searchGames(title: string, limit?: number): Promise<SteamGame[]>;
  
  // Details & Enrichment
  getGameDetails(appId: string): Promise<SteamGameDetails>;
  enrichMetadata(partialGame: PartialGameData): Promise<EnrichedGameData>;
  
  // Utilities
  isAdultContent(game: SteamGame): boolean;
  extractScreenshots(details: SteamGameDetails, limit?: number): string[];
  
  // Cache Management
  clearCache(): void;
  getCacheStats(): CacheStats;
}

// Configuration Interface
export interface SteamClientConfig {
  apiKey: string;                    // Required: Steam Web API key
  cacheTTL?: number;                 // Optional: Cache TTL in ms (default: 3600000)
  cacheSize?: number;                // Optional: Max cache entries (default: 1000)
  rateLimit?: {
    requests: number;                // Max requests (default: 200)
    perMs: number;                   // Time window in ms (default: 300000)
  };
  userAgent?: string;                // Optional: Custom user agent
  timeout?: number;                  // Optional: Request timeout in ms (default: 10000)
}

// Search Options
export interface SearchOptions {
  fuzzyThreshold?: number;           // Fuse.js threshold (0-1, default: 0.3)
  includeAdult?: boolean;            // Include adult games (default: false)
  bypassCache?: boolean;             // Skip cache lookup (default: false)
}

// Steam Game (Search Result)
export interface SteamGame {
  appId: string;
  name: string;
  matchScore?: number;               // Fuzzy match confidence (0-1)
}

// Steam Game Details (Full Metadata)
export interface SteamGameDetails {
  appId: string;
  name: string;
  type: string;                      // "game", "dlc", "demo", etc.
  requiredAge: number;
  isFree: boolean;
  detailedDescription: string;
  shortDescription: string;
  headerImage: string;               // 460x215 image URL
  publishers: string[];
  developers: string[];
  priceOverview?: {
    currency: string;
    initial: number;                 // Price in cents
    final: number;
    discountPercent: number;
    initialFormatted: string;        // "$59.99"
    finalFormatted: string;
  };
  releaseDate: {
    comingSoon: boolean;
    date: string;                    // "Dec 10, 2020"
  };
  categories: Array<{
    id: number;
    description: string;             // "Single-player", "Multi-player", etc.
  }>;
  genres: Array<{
    id: string;
    description: string;             // "Action", "RPG", etc.
  }>;
  screenshots: Array<{
    id: number;
    pathThumbnail: string;           // 600x338
    pathFull: string;                // 1920x1080
  }>;
  metacritic?: {
    score: number;                   // 0-100
    url: string;
  };
  recommendations?: {
    total: number;                   // Total recommendations
  };
  contentDescriptors: {
    ids: number[];                   // Adult content descriptor IDs
    notes?: string;
  };
}

// Enriched Game Data (Simplified Output)
export interface EnrichedGameData {
  steamId?: string;
  steamUrl?: string;
  coverUrl?: string;
  price?: string;                    // "$59.99" or "Free to Play"
  releaseDate?: string;              // "Dec 10, 2020"
  categories?: string[];             // ["Action", "RPG"]
  rating?: {
    metacritic?: number;             // 0-100
    steam?: {
      percent: number;               // 0-100
      total: number;
    };
  };
  screenshots?: string[];            // Up to 3 URLs
  isAdult?: boolean;
}

// Partial Game Data (Input for Enrichment)
export interface PartialGameData {
  title: string;
  steamId?: string;                  // If already known
}

// Cache Statistics
export interface CacheStats {
  appListSize: number;
  detailsCacheSize: number;
  hitRate: number;                   // 0-1
}
Error Handling Examples
typescripttry {
  const game = await steamClient.searchGame('Cyberpunk 2077');
} catch (error) {
  if (error instanceof GameNotFoundError) {
    console.log('Game not found on Steam');
  } else if (error instanceof RateLimitError) {
    console.log('Rate limit exceeded, retry after:', error.retryAfter);
  } else if (error instanceof SteamApiError) {
    console.log('Steam API error:', error.statusCode, error.message);
  }
}
```

## Project Structure
```
packages/steam-client/
├── src/
│   ├── client/
│   │   └── SteamClient.ts           # Main client class
│   ├── services/
│   │   ├── GameMatcher.ts           # Fuzzy/exact matching logic
│   │   ├── MetadataExtractor.ts     # Extract metadata from API responses
│   │   └── AdultContentDetector.ts  # Adult content detection
│   ├── infrastructure/
│   │   ├── ApiClient.ts             # HTTP client with rate limiting
│   │   └── Cache.ts                 # LRU cache implementation
│   ├── utils/
│   │   ├── TitleNormalizer.ts       # Normalize game titles
│   │   └── PriceFormatter.ts        # Format price data
│   ├── errors/
│   │   └── SteamErrors.ts           # Custom error classes
│   ├── types/
│   │   ├── SteamGame.ts
│   │   ├── SteamGameDetails.ts
│   │   ├── EnrichedGameData.ts
│   │   └── index.ts                 # Export all types
│   └── index.ts                     # Public API exports
├── tests/
│   ├── unit/
│   │   ├── GameMatcher.test.ts
│   │   ├── MetadataExtractor.test.ts
│   │   └── AdultContentDetector.test.ts
│   ├── integration/
│   │   └── SteamClient.test.ts
│   └── fixtures/
│       └── steamApiResponses.json   # Mock API responses
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
└── README.md
Dependencies
Production Dependencies
json{
  "axios": "^1.6.0",           // HTTP client
  "fuse.js": "^7.0.0",         // Fuzzy search
  "lru-cache": "^10.0.0"       // LRU caching
}
Development Dependencies
json{
  "typescript": "^5.3.0",
  "@types/node": "^20.10.0",
  "jest": "^29.7.0",
  "@types/jest": "^29.5.0",
  "ts-jest": "^29.1.0",
  "eslint": "^8.55.0",
  "@typescript-eslint/eslint-plugin": "^6.15.0",
  "@typescript-eslint/parser": "^6.15.0",
  "prettier": "^3.1.0"
}
TypeScript Configuration
json{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
Testing Requirements
Unit Tests (80%+ Coverage)

GameMatcher: Test exact match, fuzzy match, normalization
MetadataExtractor: Test all field extractions with various API responses
AdultContentDetector: Test age checks, descriptor checks, category checks
Cache: Test LRU eviction, TTL expiration, cache hits/misses
TitleNormalizer: Test special character removal, word stripping

Integration Tests

SteamClient.searchGame(): Real API calls with known game titles
SteamClient.getGameDetails(): Fetch details for specific app IDs
SteamClient.enrichMetadata(): End-to-end enrichment workflow
Rate limiting behavior with multiple rapid requests
Error handling with invalid API keys

Fixtures
Create mock Steam API responses for:

Game with all metadata (Cyberpunk 2077)
Free-to-play game (Dota 2)
Adult game with content warnings
DLC/Demo items
Game not found responses

Rate Limiting Implementation
Use a token bucket algorithm:

200 tokens (requests)
Refill rate: 200 tokens per 5 minutes
Block requests when bucket is empty
Return RateLimitError with retryAfter timestamp

Caching Strategy
App List Cache

Fetch entire Steam app list on first request
Cache for 24 hours
~150,000 entries, ~15MB in memory
Use LRU cache with size limit

Game Details Cache

Cache individual game details for 1 hour
Key: appId
Value: Full SteamGameDetails object
Max 1000 entries

Adult Content Detection Logic
typescriptfunction isAdultContent(details: SteamGameDetails): boolean {
  // Check required age
  if (details.requiredAge >= 18) return true;
  
  // Check content descriptor IDs (3 = Adult Only Sexual Content)
  if (details.contentDescriptors.ids.includes(3)) return true;
  
  // Check for "Adult Only" in categories
  const hasAdultCategory = details.categories.some(
    cat => cat.description.toLowerCase().includes('adult only')
  );
  
  return hasAdultCategory;
}
Title Normalization Examples
typescript// Input: "Cyberpunk 2077 (FitGirl Repack, Selective Download)"
// Output: "cyberpunk 2077"

// Input: "Grand Theft Auto V: Premium Edition - Complete Package"
// Output: "grand theft auto v premium edition"

// Remove patterns:
// - "(FitGirl Repack)", "(Repack)", "[Repack]"
// - "Complete Edition", "GOTY", "Definitive Edition"
// - Special characters except hyphens and apostrophes
Usage Examples
Basic Search
typescriptimport { SteamClient } from '@xmer/steam-client';

const client = new SteamClient({ apiKey: 'YOUR_STEAM_API_KEY' });

// Search for a game
const game = await client.searchGame('Cyberpunk 2077');
console.log(game.appId); // "1091500"
console.log(game.name);  // "Cyberpunk 2077"
Enrichment Workflow
typescript// Enrich game data from just a title
const enriched = await client.enrichMetadata({
  title: 'Cyberpunk 2077'
});

console.log(enriched.price);        // "$59.99"
console.log(enriched.releaseDate);  // "Dec 10, 2020"
console.log(enriched.isAdult);      // false
console.log(enriched.screenshots);  // [...3 URLs]
Adult Content Filtering
typescriptconst game = await client.searchGame('Adult Game Title');
if (client.isAdultContent(game)) {
  console.log('This game contains adult content');
}
Error Handling
typescripttry {
  const game = await client.searchGame('NonexistentGame12345');
} catch (error) {
  if (error instanceof GameNotFoundError) {
    console.log('Game not found, continuing without Steam data');
  }
}
README Sections
The README.md should include:

Installation: npm install @xmer/steam-client
Quick Start: Basic usage example
API Reference: Full API documentation
Configuration: All config options explained
Error Handling: All error types and handling strategies
Caching: How caching works and configuration
Rate Limiting: Steam API limits and how the client handles them
Examples: Common usage patterns
Testing: How to run tests
Contributing: Contribution guidelines
License: MIT license

Build & Publish Scripts
json{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "prepublishOnly": "npm run build && npm run test"
  }
}
Performance Targets

Search latency: < 100ms (with warm cache)
Enrichment latency: < 500ms (single API call)
Memory footprint: < 50MB (including app list cache)
Cache hit rate: > 70% for repeated searches

Documentation Requirements
Every public method must have JSDoc comments with:

Description of what the method does
@param tags for all parameters
@returns tag with return type description
@throws tags for all possible errors
@example tag with usage example

Example:
typescript/**
 * Search for a game on Steam by title.
 * 
 * Uses fuzzy matching to find the best match from the Steam app list.
 * Returns null if no match is found above the threshold.
 * 
 * @param title - Game title to search for
 * @param options - Search options (fuzzy threshold, adult filter, etc.)
 * @returns Steam game with app ID and name, or null if not found
 * @throws {RateLimitError} If Steam API rate limit is exceeded
 * @throws {SteamApiError} If Steam API request fails
 * 
 * @example
 * ```typescript
 * const game = await client.searchGame('Cyberpunk 2077');
 * if (game) {
 *   console.log(`Found: ${game.name} (${game.appId})`);
 * }
 * ```
 */
async searchGame(title: string, options?: SearchOptions): Promise<SteamGame | null>
Quality Checklist
Before publishing:

 All tests passing with 80%+ coverage
 No TypeScript errors or warnings
 ESLint passes with no errors
 All public APIs documented with JSDoc
 README.md complete with examples
 CHANGELOG.md updated
 package.json version bumped
 Build artifacts in dist/ directory
 Integration tests pass with real Steam API

Future Enhancements (v2.0.0)

Support for Steam Workshop items
Batch enrichment for multiple games
WebSocket support for real-time updates
Steam review sentiment analysis
Regional pricing support
DLC/Season pass detection
Steam Deck compatibility info