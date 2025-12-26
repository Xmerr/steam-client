# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `@xmer/steam-client`, a TypeScript npm package that provides a client for the Steam Web API with game search, metadata enrichment, and adult content detection capabilities. The package is designed to be used by game release notification systems.

## Development Commands

```bash
# Build the TypeScript project
npm run build

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage (requires 80%+ coverage)
npm run test:coverage

# Lint TypeScript files
npm run lint

# Lint and auto-fix issues
npm run lint:fix

# Format code with Prettier
npm run format

# Pre-publish checks (build + test)
npm run prepublishOnly
```

## Architecture Overview

### Core Components Structure

The package is organized into distinct layers following separation of concerns:

1. **Client Layer** (`src/client/`): Main `SteamClient` class that orchestrates all functionality
2. **Service Layer** (`src/services/`): Business logic components
   - `GameMatcher`: Implements exact and fuzzy matching using Fuse.js
   - `MetadataExtractor`: Transforms Steam API responses into enriched metadata
   - `AdultContentDetector`: Detects adult content using multiple signals (age, descriptors, categories)
3. **Infrastructure Layer** (`src/infrastructure/`):
   - `ApiClient`: HTTP client with token bucket rate limiting (200 requests per 5 minutes)
   - `Cache`: LRU cache with TTL support for app list (24h) and game details (1h)
4. **Utilities** (`src/utils/`): Helper functions for title normalization and price formatting
5. **Error Handling** (`src/errors/`): Custom error types (SteamApiError, GameNotFoundError, RateLimitError, InvalidApiKeyError)
6. **Types** (`src/types/`): TypeScript interfaces for all data structures

### Key Architectural Decisions

**Rate Limiting Strategy**: Token bucket algorithm with 200 tokens refilling over 5 minutes. Requests block when bucket is empty and throw `RateLimitError` with `retryAfter` timestamp.

**Caching Strategy**:
- App list cache: Fetches entire Steam app list (~150k entries, ~15MB) on first request, cached for 24 hours
- Game details cache: Individual game details cached for 1 hour, max 1000 entries
- LRU eviction ensures memory footprint stays under 50MB

**Adult Content Detection**: Multi-signal approach checking:
1. `requiredAge >= 18`
2. Content descriptor ID 3 (Adult Only Sexual Content)
3. Categories containing "Adult Only"

**Title Normalization**: Strips patterns like "(FitGirl Repack)", "Complete Edition", "GOTY" and special characters before fuzzy matching (default threshold: 0.3).

### Steam API Endpoints Used

1. `ISteamApps/GetAppList/v2` - Full Steam app list
2. `IStoreService/GetAppDetails/v1` - Detailed app information
3. `https://store.steampowered.com/api/appdetails?appids={id}` - Store API fallback

## Public API Contract

The package exports a single `SteamClient` class with these methods:

```typescript
// Search & Match
searchGame(title: string, options?: SearchOptions): Promise<SteamGame | null>
searchGames(title: string, limit?: number): Promise<SteamGame[]>

// Details & Enrichment
getGameDetails(appId: string): Promise<SteamGameDetails>
enrichMetadata(partialGame: PartialGameData): Promise<EnrichedGameData>

// Utilities
isAdultContent(game: SteamGame): boolean
extractScreenshots(details: SteamGameDetails, limit?: number): string[]

// Cache Management
clearCache(): void
getCacheStats(): CacheStats
```

See SPEC.md:76-95 for complete API surface and SPEC.md:98-204 for all type definitions.

## Testing Requirements

### Coverage and Structure

- Minimum 80% code coverage required
- Unit tests in `tests/unit/` for all service layer components
- Integration tests in `tests/integration/` for SteamClient with real API calls
- Mock API responses in `tests/fixtures/steamApiResponses.json`

### Critical Test Cases

**Unit Tests**:
- GameMatcher: Exact match, fuzzy match with various thresholds, title normalization edge cases
- MetadataExtractor: All field extractions with varying API response shapes (missing fields, null values)
- AdultContentDetector: Age checks (17 vs 18+), descriptor ID 3, category matching, edge cases
- Cache: LRU eviction, TTL expiration, hit/miss tracking, concurrent access

**Integration Tests**:
- Real Steam API calls with known games (Cyberpunk 2077, Dota 2)
- Adult game detection with real examples
- Rate limiting behavior with rapid sequential requests
- Error handling with invalid API keys
- DLC/Demo item handling

### Test Fixtures Required

Mock responses for:
- Full-featured game with all metadata (e.g., Cyberpunk 2077)
- Free-to-play game (e.g., Dota 2)
- Adult game with content warnings
- DLC and Demo items
- 404/error responses

## Dependencies

**Production**:
- `axios`: HTTP client for Steam API requests
- `fuse.js`: Fuzzy string matching (configured with 0.3 threshold)
- `lru-cache`: LRU cache implementation

**Development**:
- TypeScript 5.3+ with strict mode enabled
- Jest + ts-jest for testing
- ESLint + TypeScript ESLint for linting
- Prettier for formatting

## Documentation Standards

All public methods require JSDoc with:
- Description of functionality
- `@param` tags for all parameters
- `@returns` tag with return type description
- `@throws` tags for all error types
- `@example` tag with working code sample

See SPEC.md:449-469 for JSDoc example.

## Git Commit Guidelines

When creating git commits:
- Write clear, concise commit messages that focus on what changed and why
- Do NOT include "Claude Code" or similar AI tool references in commit messages
- Do NOT add "Generated with Claude Code" or "Co-Authored-By: Claude" footers
- Keep commit messages professional and focused on the technical changes
- Follow conventional commit format when appropriate (feat:, fix:, docs:, etc.)

## Performance Targets

- Search latency: < 100ms with warm cache
- Enrichment latency: < 500ms (single API call)
- Memory footprint: < 50MB including app list cache
- Cache hit rate: > 70% for repeated searches

## TypeScript Configuration

- Target: ES2022
- Module: CommonJS
- Strict mode enabled
- Declaration files generated in `dist/`
- Source in `src/`, exclude `tests/` from compilation

See SPEC.md:278-295 for complete tsconfig.json.
