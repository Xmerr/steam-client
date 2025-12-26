/**
 * Utility class for normalizing game titles before fuzzy matching
 */
export class TitleNormalizer {
  /**
   * Patterns to remove from titles
   */
  private static readonly REPACK_PATTERNS = [
    /\(FitGirl Repack[^)]*\)/gi,
    /\[FitGirl Repack[^\]]*\]/gi,
    /\(Repack\)/gi,
    /\[Repack\]/gi,
    /- Repack/gi,
  ];

  private static readonly EDITION_PATTERNS = [
    /\bComplete Edition\b/gi,
    /\bGOTY\b/gi,
    /\bGame of the Year\b/gi,
    /\bDefinitive Edition\b/gi,
    /\bUltimate Edition\b/gi,
    /\bDeluxe Edition\b/gi,
    /\bPremium Edition\b/gi,
    /\bEnhanced Edition\b/gi,
    /\bRemastered\b/gi,
    /\bRemake\b/gi,
  ];

  /**
   * Normalize a game title for fuzzy matching
   *
   * Removes repack markers, edition suffixes, and special characters
   * while preserving hyphens and apostrophes in game titles.
   *
   * @param title - Raw game title
   * @returns Normalized lowercase title
   *
   * @example
   * ```typescript
   * TitleNormalizer.normalize("Cyberpunk 2077 (FitGirl Repack)")
   * // Returns: "cyberpunk 2077"
   *
   * TitleNormalizer.normalize("Grand Theft Auto V: Complete Edition")
   * // Returns: "grand theft auto v"
   * ```
   */
  static normalize(title: string): string {
    if (!title) {
      return '';
    }

    let normalized = title;

    // Remove repack markers
    normalized = this.removeRepackMarkers(normalized);

    // Remove edition suffixes
    normalized = this.removeEditionSuffixes(normalized);

    // Remove special characters (keep hyphens, apostrophes, and alphanumeric)
    normalized = this.removeSpecialCharacters(normalized);

    // Remove extra whitespace and convert to lowercase
    normalized = normalized.replace(/\s+/g, ' ').trim().toLowerCase();

    // Remove trailing hyphens and spaces
    normalized = normalized.replace(/[-\s]+$/g, '').replace(/^[-\s]+/g, '');

    return normalized;
  }

  /**
   * Remove repack markers like "(FitGirl Repack)", "[Repack]"
   * @param title - Input title
   * @returns Title without repack markers
   */
  private static removeRepackMarkers(title: string): string {
    let result = title;
    for (const pattern of this.REPACK_PATTERNS) {
      result = result.replace(pattern, '');
    }
    return result;
  }

  /**
   * Remove edition suffixes like "Complete Edition", "GOTY"
   * @param title - Input title
   * @returns Title without edition suffixes
   */
  private static removeEditionSuffixes(title: string): string {
    let result = title;
    for (const pattern of this.EDITION_PATTERNS) {
      result = result.replace(pattern, '');
    }
    return result;
  }

  /**
   * Remove special characters except hyphens, apostrophes, and alphanumeric
   * @param title - Input title
   * @returns Title with only allowed characters
   */
  private static removeSpecialCharacters(title: string): string {
    // Keep alphanumeric, spaces, hyphens, and apostrophes
    return title.replace(/[^a-zA-Z0-9\s\-']/g, ' ');
  }
}
