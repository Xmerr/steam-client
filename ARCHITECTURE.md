# Architecture Specification
## @xmer/steam-client

### System Design Overview

This document defines the architecture, interfaces, and design patterns for the Steam client package.

---

## 1. Layered Architecture

```
┌─────────────────────────────────────────────────────┐
│              Client Layer                            │
│  ┌──────────────────────────────────────────┐       │
│  │         SteamClient                       │       │
│  │  (Main orchestrator & public API)        │       │
│  └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│              Service Layer                           │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │ Game     │  │  Metadata     │  │  Adult       │ │
│  │ Matcher  │  │  Extractor    │  │  Content     │ │
│  │          │  │               │  │  Detector    │ │
│  └──────────┘  └───────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│          Infrastructure Layer                        │
│  ┌──────────────┐            ┌──────────────┐       │
│  │  ApiClient   │            │    Cache     │       │
│  │ (Rate limit) │            │  (LRU+TTL)   │       │
│  └──────────────┘            └──────────────┘       │
└─────────────────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│              Utilities Layer                         │
│  ┌──────────────┐            ┌──────────────┐       │
│  │   Title      │            │    Price     │       │
│  │  Normalizer  │            │  Formatter   │       │
│  └──────────────┘            └──────────────┘       │
└─────────────────────────────────────────────────────┘
```

---

## 2. Component Interfaces

### 2.1 Client Layer

#### ISteamClient
```typescript
/**
 * Main interface for the Steam client.
 * Orchestrates all game search, metadata enrichment, and caching operations.
 */
interface ISteamClient {
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
```

### 2.2 Service Layer

#### IGameMatcher
```typescript
/**
 * Handles exact and fuzzy game matching using the Steam app list.
 * Normalizes titles before matching and returns confidence scores.
 */
interface IGameMatcher {
  /**
   * Find best matching game using fuzzy search
   * @param title - Game title to search
   * @param threshold - Fuse.js match threshold (0-1, lower = stricter)
   * @returns Best match or null if no match above threshold
   */
  findBestMatch(title: string, threshold: number): Promise<SteamGame | null>;

  /**
   * Find multiple matching games
   * @param title - Game title to search
   * @param limit - Maximum number of results
   * @param threshold - Fuse.js match threshold
   * @returns Array of matches sorted by score
   */
  findMatches(title: string, limit: number, threshold: number): Promise<SteamGame[]>;

  /**
   * Get exact match by title
   * @param title - Exact game title
   * @returns Game if exact match found, null otherwise
   */
  getExactMatch(title: string): Promise<SteamGame | null>;
}
```

#### IMetadataExtractor
```typescript
/**
 * Extracts and transforms Steam API responses into enriched metadata.
 * Handles missing fields, formats prices, and normalizes data.
 */
interface IMetadataExtractor {
  /**
   * Extract enriched metadata from Steam game details
   * @param details - Full Steam game details from API
   * @returns Simplified enriched game data
   */
  extractMetadata(details: SteamGameDetails): EnrichedGameData;

  /**
   * Format price information from Steam API response
   * @param priceOverview - Price data from API
   * @param isFree - Whether game is free to play
   * @returns Formatted price string (e.g., "$59.99" or "Free to Play")
   */
  formatPrice(priceOverview?: PriceOverview, isFree?: boolean): string | undefined;

  /**
   * Extract screenshot URLs from game details
   * @param details - Steam game details
   * @param limit - Maximum number of screenshots
   * @returns Array of full-size screenshot URLs
   */
  extractScreenshots(details: SteamGameDetails, limit: number): string[];

  /**
   * Calculate Steam rating from recommendations
   * @param recommendations - Recommendations object from API
   * @returns Rating percentage and total count
   */
  calculateSteamRating(recommendations?: { total: number }): { percent: number; total: number } | undefined;
}
```

#### IAdultContentDetector
```typescript
/**
 * Detects adult content using multiple signals from Steam data.
 * Checks age requirements, content descriptors, and category tags.
 */
interface IAdultContentDetector {
  /**
   * Check if game contains adult content
   * @param details - Full Steam game details
   * @returns true if adult content detected, false otherwise
   */
  isAdult(details: SteamGameDetails): boolean;

  /**
   * Check if game has age restriction >= 18
   * @param requiredAge - Required age from Steam API
   * @returns true if 18+, false otherwise
   */
  hasAgeRestriction(requiredAge: number): boolean;

  /**
   * Check if content descriptors include adult IDs
   * @param descriptorIds - Array of descriptor IDs
   * @returns true if adult descriptor found (ID 3)
   */
  hasAdultDescriptor(descriptorIds: number[]): boolean;

  /**
   * Check if categories include "Adult Only"
   * @param categories - Array of category objects
   * @returns true if adult category found
   */
  hasAdultCategory(categories: Array<{ description: string }>): boolean;
}
```

### 2.3 Infrastructure Layer

#### IApiClient
```typescript
/**
 * HTTP client with token bucket rate limiting for Steam API.
 * Handles authentication, retries, and error transformation.
 */
interface IApiClient {
  /**
   * Fetch all Steam apps list
   * @returns Array of all Steam apps
   * @throws {RateLimitError} If rate limit exceeded
   * @throws {SteamApiError} If API request fails
   */
  getAppList(): Promise<Array<{ appid: number; name: string }>>;

  /**
   * Fetch detailed game information
   * @param appId - Steam app ID
   * @returns Full game details
   * @throws {RateLimitError} If rate limit exceeded
   * @throws {SteamApiError} If API request fails
   * @throws {GameNotFoundError} If game not found
   */
  getGameDetails(appId: string): Promise<SteamGameDetails>;

  /**
   * Check if request can proceed (rate limit check)
   * @returns true if allowed, false if rate limited
   */
  canMakeRequest(): boolean;

  /**
   * Get time until next request is allowed
   * @returns Milliseconds until next token refill
   */
  getRetryAfter(): number;
}
```

#### ICache
```typescript
/**
 * LRU cache with TTL support.
 * Tracks hits/misses and provides statistics.
 */
interface ICache<K, V> {
  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get(key: K): V | undefined;

  /**
   * Set value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (optional)
   */
  set(key: K, value: V, ttl?: number): void;

  /**
   * Check if key exists in cache
   * @param key - Cache key
   * @returns true if key exists and not expired
   */
  has(key: K): boolean;

  /**
   * Clear all cached entries
   */
  clear(): void;

  /**
   * Get cache statistics
   * @returns Hit rate and entry count
   */
  getStats(): { size: number; hitRate: number };
}
```

### 2.4 Utilities Layer

#### TitleNormalizer
```typescript
/**
 * Normalizes game titles for fuzzy matching.
 * Strips repack markers, edition suffixes, and special characters.
 */
class TitleNormalizer {
  /**
   * Normalize a game title for matching
   * @param title - Raw game title
   * @returns Normalized lowercase title
   *
   * @example
   * normalize("Cyberpunk 2077 (FitGirl Repack)") // "cyberpunk 2077"
   * normalize("GTA V: Complete Edition") // "gta v"
   */
  static normalize(title: string): string;

  /**
   * Remove repack markers like "(FitGirl Repack)", "[Repack]"
   */
  private static removeRepackMarkers(title: string): string;

  /**
   * Remove edition suffixes like "Complete Edition", "GOTY"
   */
  private static removeEditionSuffixes(title: string): string;

  /**
   * Remove special characters except hyphens and apostrophes
   */
  private static removeSpecialCharacters(title: string): string;
}
```

#### PriceFormatter
```typescript
/**
 * Formats price data from Steam API responses.
 */
class PriceFormatter {
  /**
   * Format price overview into readable string
   * @param priceOverview - Price data from Steam API
   * @returns Formatted price (e.g., "$59.99")
   */
  static format(priceOverview: PriceOverview): string;

  /**
   * Handle free-to-play games
   * @returns "Free to Play" string
   */
  static formatFree(): string;
}
```

---

## 3. Dependency Graph

```
SteamClient
├── GameMatcher
│   ├── ApiClient
│   ├── Cache (app list)
│   └── TitleNormalizer
├── MetadataExtractor
│   └── PriceFormatter
├── AdultContentDetector (no deps)
├── ApiClient
│   └── axios (external)
└── Cache
    └── lru-cache (external)
```

**Dependency Rules**:
1. Client layer depends on Service + Infrastructure layers
2. Service layer can depend on Infrastructure + Utilities layers
3. Infrastructure layer has NO dependencies on Service layer
4. Utilities layer is pure and has NO internal dependencies
5. All layers can use Types and Errors

---

## 4. Design Patterns

### 4.1 Dependency Injection
- **SteamClient** receives all dependencies via constructor
- Enables easy testing with mock implementations
- Each service class receives its dependencies explicitly

```typescript
class SteamClient implements ISteamClient {
  constructor(
    private config: SteamClientConfig,
    private apiClient: IApiClient,
    private appListCache: ICache<string, AppListData>,
    private detailsCache: ICache<string, SteamGameDetails>,
    private gameMatcher: IGameMatcher,
    private metadataExtractor: IMetadataExtractor,
    private adultContentDetector: IAdultContentDetector
  ) {}
}
```

### 4.2 Token Bucket Rate Limiting
- **ApiClient** implements token bucket algorithm
- 200 tokens, refill rate: 200 tokens / 5 minutes
- Blocks when bucket empty, throws `RateLimitError` with `retryAfter`

```typescript
class TokenBucket {
  private tokens: number = capacity;
  private lastRefill: number = Date.now();

  tryConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / refillInterval) * capacity;
    this.tokens = Math.min(capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
```

### 4.3 LRU Cache with TTL
- **Cache** uses `lru-cache` library
- Two separate caches: app list (24h TTL) and details (1h TTL)
- Tracks hits/misses for statistics

### 4.4 Error Hierarchy
```
Error (base)
└── SteamClientError (abstract base)
    ├── SteamApiError (HTTP errors)
    ├── GameNotFoundError (no match found)
    ├── RateLimitError (rate limit exceeded)
    └── InvalidApiKeyError (auth failure)
```

---

## 5. Data Flow Patterns

### 5.1 Search Flow
```
User calls searchGame(title)
    ↓
SteamClient.searchGame()
    ↓
GameMatcher.findBestMatch()
    ↓
Check appListCache
    ↓ (miss)
ApiClient.getAppList()
    ↓
Cache app list (24h TTL)
    ↓
Normalize title with TitleNormalizer
    ↓
Fuse.js fuzzy search
    ↓
Return best match or null
```

### 5.2 Enrichment Flow
```
User calls enrichMetadata({title})
    ↓
SteamClient.enrichMetadata()
    ↓
GameMatcher.findBestMatch(title)
    ↓ (found appId)
SteamClient.getGameDetails(appId)
    ↓
Check detailsCache
    ↓ (miss)
ApiClient.getGameDetails(appId)
    ↓
Cache details (1h TTL)
    ↓
MetadataExtractor.extractMetadata()
    ↓
AdultContentDetector.isAdult()
    ↓
Return EnrichedGameData
```

### 5.3 Error Handling Flow
```
ApiClient.request()
    ↓
Rate limit check (TokenBucket)
    ↓ (exceeded)
throw RateLimitError(retryAfter)
    ↓ (allowed)
HTTP request (axios)
    ↓ (401)
throw InvalidApiKeyError
    ↓ (404)
throw GameNotFoundError
    ↓ (other error)
throw SteamApiError(statusCode, message)
```

---

## 6. Testing Strategy

### 6.1 Unit Tests (tests/unit/)
Each service class has dedicated unit tests:

**GameMatcher.test.ts**:
- Exact match scenarios
- Fuzzy match with various thresholds (0.1, 0.3, 0.5)
- Title normalization edge cases
- Empty/null title handling
- Multi-word game titles
- Special characters in titles

**MetadataExtractor.test.ts**:
- All field extractions (price, date, categories, genres)
- Missing field handling (no metacritic, no screenshots)
- Null/undefined value handling
- Price formatting for free games
- Price formatting for paid games
- Screenshot extraction with limits

**AdultContentDetector.test.ts**:
- Age check boundaries (17 vs 18+)
- Content descriptor ID 3 detection
- Category "Adult Only" matching (case insensitive)
- Edge cases: empty descriptors, no categories
- Multiple signals (age + descriptor + category)

**Cache.test.ts**:
- LRU eviction behavior
- TTL expiration
- Cache hits and misses
- Hit rate calculation
- Concurrent access
- Clear cache functionality

**TitleNormalizer.test.ts**:
- Repack marker removal
- Edition suffix removal
- Special character handling
- Case normalization
- Edge cases: empty strings, symbols only

### 6.2 Integration Tests (tests/integration/)

**SteamClient.test.ts**:
- Real Steam API calls with known games (Cyberpunk 2077, Dota 2)
- Adult game detection with real examples
- Rate limiting behavior (rapid sequential requests)
- Error handling with invalid API keys
- DLC/Demo item filtering
- Cache behavior across multiple requests
- End-to-end enrichment workflow

### 6.3 Test Fixtures (tests/fixtures/)

**steamApiResponses.json**:
```json
{
  "cyberpunk2077": { /* full game with all metadata */ },
  "dota2": { /* free-to-play game */ },
  "adultGame": { /* adult content warnings */ },
  "dlc": { /* DLC item */ },
  "demo": { /* demo item */ },
  "notFound": { /* 404 response */ }
}
```

### 6.4 Coverage Requirements
- **Minimum**: 80% code coverage
- **Branches**: All error paths tested
- **Edge cases**: Null/undefined handling
- **Performance**: Latency benchmarks in integration tests

---

## 7. Configuration Design

### 7.1 SteamClientConfig
```typescript
interface SteamClientConfig {
  apiKey: string;                    // Required: Steam Web API key
  cacheTTL?: number;                 // Optional: Default 3600000 (1h)
  cacheSize?: number;                // Optional: Default 1000 entries
  rateLimit?: {
    requests: number;                // Default: 200
    perMs: number;                   // Default: 300000 (5min)
  };
  userAgent?: string;                // Optional: Custom UA
  timeout?: number;                  // Optional: Default 10000ms
}
```

### 7.2 Defaults
```typescript
const DEFAULT_CONFIG = {
  cacheTTL: 3600000,        // 1 hour
  cacheSize: 1000,          // 1000 entries
  rateLimit: {
    requests: 200,
    perMs: 300000           // 5 minutes
  },
  timeout: 10000,           // 10 seconds
  userAgent: '@xmer/steam-client v1.0.0'
};
```

---

## 8. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Search latency (warm cache) | < 100ms | p95 percentile |
| Enrichment latency | < 500ms | p95 percentile |
| Memory footprint | < 50MB | Including app list cache |
| Cache hit rate | > 70% | For repeated searches |
| Rate limit accuracy | ±5% | Token bucket precision |

---

## 9. File Structure

```
src/
├── client/
│   └── SteamClient.ts              # Main client class
├── services/
│   ├── GameMatcher.ts              # Fuzzy matching service
│   ├── MetadataExtractor.ts        # Metadata extraction service
│   └── AdultContentDetector.ts     # Adult content detection service
├── infrastructure/
│   ├── ApiClient.ts                # HTTP client with rate limiting
│   ├── Cache.ts                    # LRU cache with TTL
│   └── TokenBucket.ts              # Token bucket rate limiter
├── utils/
│   ├── TitleNormalizer.ts          # Title normalization utilities
│   └── PriceFormatter.ts           # Price formatting utilities
├── errors/
│   └── SteamErrors.ts              # Custom error classes
├── types/
│   ├── SteamGame.ts                # SteamGame interface
│   ├── SteamGameDetails.ts         # SteamGameDetails interface
│   ├── EnrichedGameData.ts         # EnrichedGameData interface
│   ├── Config.ts                   # Configuration interfaces
│   └── index.ts                    # Re-export all types
└── index.ts                        # Public API exports
```

---

## 10. Acceptance Criteria

### Architecture Completeness
- [ ] All interfaces defined with JSDoc
- [ ] Dependency graph documented
- [ ] Design patterns identified and justified
- [ ] Data flow patterns documented
- [ ] Testing strategy defined
- [ ] Performance targets specified

### Design Quality
- [ ] Single Responsibility Principle followed
- [ ] Dependency Inversion (depend on interfaces)
- [ ] No circular dependencies
- [ ] Clear separation of concerns
- [ ] Testable design (DI enabled)

### Documentation
- [ ] Architecture diagram complete
- [ ] All interfaces documented
- [ ] Data flows illustrated
- [ ] Testing strategy clear
- [ ] File structure defined

---

## Handoff to Implementation Agent

This architecture is now ready for implementation. All interfaces are defined, dependencies are clear, and patterns are established.
