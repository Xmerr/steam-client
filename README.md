# @xmer/steam-client

> TypeScript client for Steam Web API with game search, metadata enrichment, and adult content detection

[![npm version](https://img.shields.io/npm/v/@xmer/steam-client.svg)](https://www.npmjs.com/package/@xmer/steam-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)](https://github.com/fitgirl-bot/steam-client)

## Features

- 🔍 **Fuzzy Game Matching** - Find games using approximate string matching with configurable thresholds
- 📊 **Metadata Enrichment** - Extract prices, ratings, screenshots, categories, and more
- 🔞 **Adult Content Detection** - Multi-signal detection using age ratings, descriptors, and categories
- ⚡ **Smart Rate Limiting** - Token bucket algorithm (200 req / 5 min) with automatic request blocking
- 💾 **Intelligent Caching** - LRU cache with TTL (24h app list, 1h game details) for optimal performance
- 🛡️ **Type-Safe** - Full TypeScript support with strict mode and comprehensive type definitions
- ✅ **Well Tested** - 90%+ code coverage with unit and integration tests
- 📝 **Fully Documented** - JSDoc comments on all public APIs with examples

## Installation

```bash
npm install @xmer/steam-client
```

## Quick Start

```typescript
import { SteamClient } from '@xmer/steam-client';

// Initialize the client with your Steam API key
const client = new SteamClient({
  apiKey: 'YOUR_STEAM_API_KEY', // Get one at https://steamcommunity.com/dev/apikey
});

// Search for a game
const game = await client.searchGame('Cyberpunk 2077');
console.log(`Found: ${game.name} (${game.appId})`);

// Get enriched metadata
const enriched = await client.enrichMetadata({ title: 'Cyberpunk 2077' });
console.log(`Price: ${enriched.price}`);
console.log(`Release: ${enriched.releaseDate}`);
console.log(`Rating: ${enriched.rating?.metacritic}/100`);
console.log(`Adult Content: ${enriched.isAdult}`);
```

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
  - [searchGame](#searchgame)
  - [searchGames](#searchgames)
  - [getGameDetails](#getgamedetails)
  - [enrichMetadata](#enrichmetadata)
  - [isAdultContent](#isadultcontent)
  - [extractScreenshots](#extractscreenshots)
  - [Cache Management](#cache-management)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Caching Strategy](#caching-strategy)
- [Performance](#performance)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Configuration

### SteamClientConfig

```typescript
interface SteamClientConfig {
  apiKey: string;           // Required: Your Steam Web API key
  cacheTTL?: number;        // Optional: Cache TTL in ms (default: 3600000 = 1h)
  cacheSize?: number;       // Optional: Max cache entries (default: 1000)
  rateLimit?: {
    requests: number;       // Max requests (default: 200)
    perMs: number;          // Time window in ms (default: 300000 = 5min)
  };
  userAgent?: string;       // Optional: Custom user agent
  timeout?: number;         // Optional: Request timeout in ms (default: 10000)
}
```

### Example with Custom Configuration

```typescript
const client = new SteamClient({
  apiKey: process.env.STEAM_API_KEY,
  cacheTTL: 7200000,      // 2 hours
  cacheSize: 2000,        // 2000 entries
  rateLimit: {
    requests: 150,        // More conservative rate limit
    perMs: 300000,       // 5 minutes
  },
  timeout: 15000,         // 15 second timeout
});
```

## API Reference

### searchGame

Search for a single game by title using fuzzy matching.

```typescript
searchGame(title: string, options?: SearchOptions): Promise<SteamGame | null>
```

**Parameters:**
- `title` - Game title to search for
- `options` - Search options (optional)
  - `fuzzyThreshold` - Match threshold 0-1 (default: 0.3, lower = stricter)
  - `includeAdult` - Include adult games (default: false)
  - `bypassCache` - Skip cache lookup (default: false)

**Returns:** `SteamGame` with appId, name, and matchScore, or `null` if not found

**Example:**

```typescript
// Basic search
const game = await client.searchGame('Cyberpunk 2077');
if (game) {
  console.log(`${game.name} - App ID: ${game.appId}`);
}

// With custom threshold (stricter matching)
const exactGame = await client.searchGame('Dota 2', {
  fuzzyThreshold: 0.1,
});

// Include adult content
const adultGame = await client.searchGame('Adult Game Title', {
  includeAdult: true,
});
```

### searchGames

Search for multiple games matching a title.

```typescript
searchGames(title: string, limit?: number): Promise<SteamGame[]>
```

**Parameters:**
- `title` - Game title to search for
- `limit` - Maximum number of results (default: 5)

**Returns:** Array of matching `SteamGame` objects sorted by relevance

**Example:**

```typescript
const games = await client.searchGames('Grand Theft Auto', 10);
games.forEach(game => {
  console.log(`${game.name} (${game.matchScore?.toFixed(2)})`);
});
```

### getGameDetails

Fetch detailed information about a specific game.

```typescript
getGameDetails(appId: string): Promise<SteamGameDetails>
```

**Parameters:**
- `appId` - Steam application ID

**Returns:** `SteamGameDetails` with comprehensive game information

**Throws:**
- `GameNotFoundError` - If game doesn't exist
- `RateLimitError` - If rate limit exceeded
- `SteamApiError` - If API request fails

**Example:**

```typescript
const details = await client.getGameDetails('1091500');
console.log(`Name: ${details.name}`);
console.log(`Type: ${details.type}`);
console.log(`Price: ${details.priceOverview?.finalFormatted}`);
console.log(`Developers: ${details.developers.join(', ')}`);
console.log(`Metacritic: ${details.metacritic?.score}`);
```

### enrichMetadata

Enrich partial game data with full Steam metadata.

```typescript
enrichMetadata(partialGame: PartialGameData): Promise<EnrichedGameData>
```

**Parameters:**
- `partialGame` - Object with `title` (required) and optionally `steamId`

**Returns:** `EnrichedGameData` with formatted metadata

**Example:**

```typescript
// From title only
const enriched = await client.enrichMetadata({
  title: 'Cyberpunk 2077',
});

console.log(`Steam URL: ${enriched.steamUrl}`);
console.log(`Cover: ${enriched.coverUrl}`);
console.log(`Price: ${enriched.price}`);
console.log(`Release: ${enriched.releaseDate}`);
console.log(`Categories: ${enriched.categories?.join(', ')}`);
console.log(`Screenshots: ${enriched.screenshots?.length} available`);
console.log(`Is Adult: ${enriched.isAdult}`);

// From Steam ID (skips search)
const enriched2 = await client.enrichMetadata({
  title: 'Dota 2',
  steamId: '570',
});
```

### isAdultContent

Check if a game contains adult content.

```typescript
isAdultContent(game: SteamGame): Promise<boolean>
```

**Parameters:**
- `game` - Steam game object with appId

**Returns:** `true` if adult content detected

**Detection Signals:**
- Age restriction >= 18
- Content descriptor ID 3 (Adult Only Sexual Content)
- Categories containing "Adult Only"

**Example:**

```typescript
const game = await client.searchGame('Game Title');
if (game && await client.isAdultContent(game)) {
  console.log('⚠️  Adult content detected');
}
```

### extractScreenshots

Extract screenshot URLs from game details.

```typescript
extractScreenshots(details: SteamGameDetails, limit?: number): string[]
```

**Parameters:**
- `details` - Steam game details object
- `limit` - Maximum screenshots to extract (default: 3)

**Returns:** Array of full-size screenshot URLs

**Example:**

```typescript
const details = await client.getGameDetails('1091500');
const screenshots = client.extractScreenshots(details, 5);
screenshots.forEach((url, i) => {
  console.log(`Screenshot ${i + 1}: ${url}`);
});
```

### Cache Management

#### clearCache()

Clear all cached data (app list and game details).

```typescript
client.clearCache();
console.log('All caches cleared');
```

#### getCacheStats()

Get cache statistics including size and hit rate.

```typescript
const stats = client.getCacheStats();
console.log(`App List Size: ${stats.appListSize}`);
console.log(`Details Cache Size: ${stats.detailsCacheSize}`);
console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

## Usage Examples

### Example 1: Search and Enrich Workflow

```typescript
import { SteamClient } from '@xmer/steam-client';

const client = new SteamClient({ apiKey: process.env.STEAM_API_KEY });

// Search for a game
const game = await client.searchGame('The Witcher 3');

if (game) {
  // Enrich with full metadata
  const enriched = await client.enrichMetadata({
    title: game.name,
    steamId: game.appId,
  });

  console.log('Game Information:');
  console.log(`  Title: ${game.name}`);
  console.log(`  Store URL: ${enriched.steamUrl}`);
  console.log(`  Price: ${enriched.price}`);
  console.log(`  Release Date: ${enriched.releaseDate}`);
  console.log(`  Metacritic: ${enriched.rating?.metacritic}/100`);
  console.log(`  Categories: ${enriched.categories?.join(', ')}`);
}
```

### Example 2: Adult Content Filtering

```typescript
const games = await client.searchGames('game title', 10);

const filteredGames = [];
for (const game of games) {
  const isAdult = await client.isAdultContent(game);
  if (!isAdult) {
    filteredGames.push(game);
  }
}

console.log(`Found ${filteredGames.length} non-adult games`);
```

### Example 3: Batch Processing with Rate Limiting

```typescript
import { RateLimitError } from '@xmer/steam-client';

const gameTitles = ['Game 1', 'Game 2', 'Game 3', /* ... */];

for (const title of gameTitles) {
  try {
    const game = await client.searchGame(title);
    if (game) {
      console.log(`✓ Found: ${game.name}`);
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      const waitTime = error.retryAfter - Date.now();
      console.log(`Rate limited. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      // Retry this game
    }
  }
}
```

### Example 4: Free-to-Play Game Detection

```typescript
const game = await client.searchGame('Dota 2');
if (game) {
  const details = await client.getGameDetails(game.appId);

  if (details.isFree) {
    console.log(`${details.name} is free-to-play!`);
  } else {
    console.log(`${details.name} costs ${details.priceOverview?.finalFormatted}`);
  }
}
```

### Example 5: Fuzzy Matching with Title Normalization

```typescript
// These all match "Cyberpunk 2077"
const variants = [
  'Cyberpunk 2077 (FitGirl Repack)',
  'CYBERPUNK 2077: Complete Edition',
  'Cyberpunk 2077 - GOTY',
];

for (const title of variants) {
  const game = await client.searchGame(title);
  console.log(`"${title}" → ${game?.name}`);
}

// Output:
// "Cyberpunk 2077 (FitGirl Repack)" → Cyberpunk 2077
// "CYBERPUNK 2077: Complete Edition" → Cyberpunk 2077
// "Cyberpunk 2077 - GOTY" → Cyberpunk 2077
```

## Error Handling

The package provides custom error types for different failure scenarios:

```typescript
import {
  SteamApiError,
  GameNotFoundError,
  RateLimitError,
  InvalidApiKeyError,
} from '@xmer/steam-client';

try {
  const game = await client.searchGame('Nonexistent Game 12345');
  const details = await client.getGameDetails(game.appId);
} catch (error) {
  if (error instanceof GameNotFoundError) {
    console.error('Game not found:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded. Retry after:', new Date(error.retryAfter));
  } else if (error instanceof InvalidApiKeyError) {
    console.error('Invalid Steam API key');
  } else if (error instanceof SteamApiError) {
    console.error('Steam API error:', error.statusCode, error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Error Types

| Error Type | When It Occurs | Properties |
|------------|----------------|------------|
| `GameNotFoundError` | Game doesn't exist or no match found | `title` |
| `RateLimitError` | Rate limit exceeded (200 req / 5 min) | `retryAfter` (timestamp) |
| `InvalidApiKeyError` | Steam API key is invalid or missing | - |
| `SteamApiError` | General Steam API request failure | `statusCode`, `responseData` |

## Rate Limiting

The client implements token bucket rate limiting to comply with Steam's API limits:

- **Default Limit**: 200 requests per 5 minutes
- **Algorithm**: Token bucket with continuous refill
- **Behavior**: Requests block when limit exceeded, throws `RateLimitError`

### Rate Limit Configuration

```typescript
const client = new SteamClient({
  apiKey: process.env.STEAM_API_KEY,
  rateLimit: {
    requests: 150,  // More conservative limit
    perMs: 300000,  // 5 minutes
  },
});
```

### Handling Rate Limits

```typescript
import { RateLimitError } from '@xmer/steam-client';

try {
  const game = await client.searchGame('Game Title');
} catch (error) {
  if (error instanceof RateLimitError) {
    const waitMs = error.retryAfter - Date.now();
    console.log(`Rate limited. Retry in ${Math.ceil(waitMs / 1000)}s`);

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, waitMs));
    const game = await client.searchGame('Game Title');
  }
}
```

## Caching Strategy

The client uses LRU (Least Recently Used) caching with TTL to minimize API calls:

### Cache Configuration

| Cache | TTL | Size | Purpose |
|-------|-----|------|---------|
| **App List** | 24 hours | 1 entry (~15MB) | Full Steam game catalog |
| **Game Details** | 1 hour | 1000 entries | Individual game metadata |

### Cache Behavior

```typescript
// First call fetches from API (slow)
const game1 = await client.searchGame('Cyberpunk 2077'); // ~500ms

// Second call uses cache (fast)
const game2 = await client.searchGame('Cyberpunk 2077'); // ~1ms

// Clear cache if needed
client.clearCache();

// Check cache performance
const stats = client.getCacheStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
```

### Bypassing Cache

```typescript
const game = await client.searchGame('Cyberpunk 2077', {
  bypassCache: true, // Always fetch fresh data
});
```

## Performance

### Benchmarks

| Operation | Cold Cache | Warm Cache | Notes |
|-----------|------------|------------|-------|
| `searchGame()` | ~500ms | ~50ms | First call fetches 150k app list |
| `getGameDetails()` | ~300ms | ~1ms | Depends on Steam API latency |
| `enrichMetadata()` | ~800ms | ~50ms | Combines search + details |

### Memory Usage

- **App List Cache**: ~15MB (150,000 Steam apps)
- **Details Cache**: ~5-10MB (1000 entries max)
- **Total**: ~20-25MB typical usage

### Optimization Tips

1. **Reuse Client Instance** - Create one client and reuse it
   ```typescript
   // Good
   const client = new SteamClient({ apiKey: 'KEY' });
   await client.searchGame('Game 1');
   await client.searchGame('Game 2');

   // Bad (creates new cache each time)
   await new SteamClient({ apiKey: 'KEY' }).searchGame('Game 1');
   await new SteamClient({ apiKey: 'KEY' }).searchGame('Game 2');
   ```

2. **Use Steam ID When Known** - Skip search step
   ```typescript
   const enriched = await client.enrichMetadata({
     title: 'Cyberpunk 2077',
     steamId: '1091500', // Skips search, faster
   });
   ```

3. **Adjust Cache TTL** - Balance freshness vs. performance
   ```typescript
   const client = new SteamClient({
     apiKey: 'KEY',
     cacheTTL: 7200000, // 2 hours for less frequent updates
   });
   ```

## Security

### API Key Protection

**⚠️ NEVER commit your Steam API key to version control!**

#### Best Practices

1. **Use Environment Variables**
   ```typescript
   const client = new SteamClient({
     apiKey: process.env.STEAM_API_KEY,
   });
   ```

2. **Use .env Files** (with dotenv package)
   ```bash
   # .env
   STEAM_API_KEY=your_api_key_here
   ```

   ```typescript
   require('dotenv').config();
   const client = new SteamClient({
     apiKey: process.env.STEAM_API_KEY,
   });
   ```

3. **Add .env to .gitignore**
   ```
   # .gitignore
   .env
   .env.local
   ```

### Getting a Steam API Key

1. Visit [https://steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
2. Log in with your Steam account
3. Enter a domain name (can be localhost for development)
4. Copy your API key
5. Store it securely in environment variables

## Troubleshooting

### Common Issues

#### "Invalid API Key" Error

```typescript
Error: Invalid or missing Steam API key
```

**Solution**: Verify your API key is correct and properly loaded
```typescript
console.log('API Key:', process.env.STEAM_API_KEY);
// Should show your key, not undefined
```

#### Rate Limit Exceeded

```typescript
RateLimitError: Rate limit exceeded. Retry after 2025-01-01T12:00:00.000Z
```

**Solution**: Implement retry logic with exponential backoff
```typescript
async function searchWithRetry(title: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.searchGame(title);
    } catch (error) {
      if (error instanceof RateLimitError && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, error.retryAfter - Date.now()));
      } else {
        throw error;
      }
    }
  }
}
```

#### Game Not Found

```typescript
GameNotFoundError: Game not found: Obscure Game Title
```

**Solution**: Try adjusting fuzzy threshold or check spelling
```typescript
// More lenient matching
const game = await client.searchGame('Game Title', {
  fuzzyThreshold: 0.5, // Higher = more lenient
});
```

#### High Memory Usage

**Solution**: Reduce cache size if memory is constrained
```typescript
const client = new SteamClient({
  apiKey: process.env.STEAM_API_KEY,
  cacheSize: 500, // Reduce from default 1000
});
```

#### Slow First Search

**Solution**: This is normal! First search fetches entire Steam catalog (~150k games). Subsequent searches use cache.

```typescript
// First search: ~500ms (fetches app list)
await client.searchGame('Game 1');

// Subsequent searches: ~50ms (uses cache)
await client.searchGame('Game 2');
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Follow TypeScript strict mode** and existing code style
4. **Add tests** for new functionality (maintain 80%+ coverage)
5. **Update documentation** as needed
6. **Run linting**: `npm run lint:fix`
7. **Run tests**: `npm test`
8. **Commit your changes**: `git commit -m 'Add my feature'`
9. **Push to the branch**: `git push origin feature/my-feature`
10. **Open a Pull Request**

### Development Setup

```bash
git clone https://github.com/fitgirl-bot/steam-client.git
cd steam-client
npm install
npm run build
npm test
```

## License

MIT © FitGirl Bot Team

See [LICENSE](LICENSE) for details.

---

## Links

- [npm Package](https://www.npmjs.com/package/@xmer/steam-client)
- [GitHub Repository](https://github.com/fitgirl-bot/steam-client)
- [Issue Tracker](https://github.com/fitgirl-bot/steam-client/issues)
- [Steam Web API Documentation](https://steamcommunity.com/dev)
- [Get Steam API Key](https://steamcommunity.com/dev/apikey)

---

**Made with ❤️ by the FitGirl Bot Team**
