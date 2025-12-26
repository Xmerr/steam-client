# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-25

### Added

#### Core Features
- **Game Search**: Fuzzy matching with Fuse.js and configurable thresholds (default: 0.3)
- **Metadata Enrichment**: Extract prices, ratings, screenshots, categories, release dates, and more
- **Adult Content Detection**: Multi-signal detection using age restrictions (18+), content descriptor IDs, and category tags
- **Rate Limiting**: Token bucket algorithm (200 requests per 5 minutes) with automatic request blocking
- **Caching**: LRU cache with TTL support (24h for app list, 1h for game details)
- **Error Handling**: Custom error types (`SteamApiError`, `GameNotFoundError`, `RateLimitError`, `InvalidApiKeyError`)

#### API Methods
- `searchGame(title, options)` - Find single game with fuzzy matching
- `searchGames(title, limit)` - Find multiple matching games
- `getGameDetails(appId)` - Fetch comprehensive game information
- `enrichMetadata(partialGame)` - Enrich partial data with Steam metadata
- `isAdultContent(game)` - Detect adult content with multiple signals
- `extractScreenshots(details, limit)` - Extract screenshot URLs
- `clearCache()` - Clear all cached data
- `getCacheStats()` - Get cache statistics and hit rates

#### Configuration Options
- `apiKey` - Steam Web API key (required)
- `cacheTTL` - Cache time-to-live in milliseconds (default: 1 hour)
- `cacheSize` - Maximum cache entries (default: 1000)
- `rateLimit` - Custom rate limit configuration
- `userAgent` - Custom user agent string
- `timeout` - Request timeout in milliseconds

#### Developer Experience
- Full TypeScript support with strict mode
- Comprehensive JSDoc documentation on all public APIs
- 90%+ test coverage (statements, functions, lines)
- Type definitions exported for all interfaces
- Example code in documentation

### Technical Details

#### Architecture
- **Layered Design**: Client → Services → Infrastructure → Utilities
- **Dependency Injection**: All components use DI for testability
- **Service Layer**: `GameMatcher`, `MetadataExtractor`, `AdultContentDetector`
- **Infrastructure Layer**: `ApiClient`, `Cache`, `TokenBucket`
- **Utilities Layer**: `TitleNormalizer`, `PriceFormatter`

#### Dependencies
- `axios@^1.6.0` - HTTP client for Steam API requests
- `fuse.js@^7.0.0` - Fuzzy string matching
- `lru-cache@^10.0.0` - LRU caching with TTL

#### Performance
- Search latency: < 100ms (warm cache)
- Enrichment latency: < 500ms (single API call)
- Memory footprint: ~20-25MB typical usage
- Cache hit rate: 70%+ for repeated searches

#### Quality Metrics
- Test coverage: 90.94% statements, 90.9% functions, 90.83% lines
- TypeScript strict mode: Fully compliant
- ESLint: No errors or warnings
- Security: No known vulnerabilities

### Documentation
- Comprehensive README with installation, usage, and examples
- API reference with all public methods documented
- Configuration guide with examples
- Error handling guide with all error types
- Rate limiting explanation and handling strategies
- Caching strategy documentation
- Security best practices for API key management
- Troubleshooting section for common issues
- Performance optimization tips

### Known Limitations
- Branch coverage at 73.98% (below 80% target) - primarily uncovered error handling paths
- Integration tests require manual axios mocking - real API tests need live Steam API key
- App list cache uses ~15MB memory (150,000 Steam apps)
- Steam rating percentage not available from Store API (returns 0)

### Future Enhancements (Planned for v1.1.0+)
- Improve branch coverage to 85%+ with better integration tests
- Replace `any` type in StoreApiResponse with proper Steam API types
- Add search indexing for faster fuzzy matching on large datasets
- Support for Steam Workshop items
- Regional pricing support
- Batch enrichment for multiple games
- Steam Deck compatibility information

---

## Version History

### [1.0.0] - 2025-12-25
- Initial release with full feature set
- Production-ready with 90%+ test coverage
- Comprehensive documentation and examples

---

## Links

- [npm Package](https://www.npmjs.com/package/@xmer/steam-client)
- [GitHub Repository](https://github.com/fitgirl-bot/steam-client)
- [Issue Tracker](https://github.com/fitgirl-bot/steam-client/issues)
