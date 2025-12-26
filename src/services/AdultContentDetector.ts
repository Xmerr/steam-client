import { SteamGameDetails, Category } from '../types/SteamGameDetails';

/**
 * Adult content descriptor ID for Steam API
 * ID 3 = Adult Only Sexual Content
 */
const ADULT_DESCRIPTOR_ID = 3;

/**
 * Minimum age threshold for adult content
 */
const ADULT_AGE_THRESHOLD = 18;

/**
 * Detects adult content using multiple signals from Steam data
 */
export class AdultContentDetector {
  /**
   * Check if game contains adult content
   *
   * Uses multiple detection signals:
   * 1. Required age >= 18
   * 2. Content descriptor ID 3 (Adult Only Sexual Content)
   * 3. Categories containing "Adult Only"
   *
   * @param details - Full Steam game details
   * @returns true if adult content detected, false otherwise
   *
   * @example
   * ```typescript
   * const detector = new AdultContentDetector();
   * const isAdult = detector.isAdult(gameDetails);
   * if (isAdult) {
   *   console.log('Adult content detected');
   * }
   * ```
   */
  isAdult(details: SteamGameDetails): boolean {
    // Check age restriction
    if (this.hasAgeRestriction(details.requiredAge)) {
      return true;
    }

    // Check content descriptors
    if (this.hasAdultDescriptor(details.contentDescriptors.ids)) {
      return true;
    }

    // Check categories
    if (this.hasAdultCategory(details.categories)) {
      return true;
    }

    return false;
  }

  /**
   * Check if game has age restriction >= 18
   *
   * @param requiredAge - Required age from Steam API
   * @returns true if 18+, false otherwise
   *
   * @example
   * ```typescript
   * detector.hasAgeRestriction(18); // true
   * detector.hasAgeRestriction(17); // false
   * ```
   */
  hasAgeRestriction(requiredAge: number): boolean {
    return requiredAge >= ADULT_AGE_THRESHOLD;
  }

  /**
   * Check if content descriptors include adult IDs
   *
   * @param descriptorIds - Array of content descriptor IDs
   * @returns true if adult descriptor found (ID 3)
   *
   * @example
   * ```typescript
   * detector.hasAdultDescriptor([1, 2, 3]); // true
   * detector.hasAdultDescriptor([1, 2]); // false
   * ```
   */
  hasAdultDescriptor(descriptorIds: number[]): boolean {
    if (!descriptorIds || descriptorIds.length === 0) {
      return false;
    }

    return descriptorIds.includes(ADULT_DESCRIPTOR_ID);
  }

  /**
   * Check if categories include "Adult Only"
   *
   * Performs case-insensitive search for "adult only" in category descriptions.
   *
   * @param categories - Array of category objects
   * @returns true if adult category found
   *
   * @example
   * ```typescript
   * const categories = [
   *   { id: 1, description: 'Single-player' },
   *   { id: 2, description: 'Adult Only Content' }
   * ];
   * detector.hasAdultCategory(categories); // true
   * ```
   */
  hasAdultCategory(categories: Category[]): boolean {
    if (!categories || categories.length === 0) {
      return false;
    }

    return categories.some((cat) =>
      cat.description.toLowerCase().includes('adult only')
    );
  }
}
