import { TitleNormalizer } from '../../src/utils/TitleNormalizer';

describe('TitleNormalizer', () => {
  describe('normalize', () => {
    it('should convert to lowercase', () => {
      expect(TitleNormalizer.normalize('CYBERPUNK 2077')).toBe('cyberpunk 2077');
    });

    it('should remove FitGirl Repack markers (parentheses)', () => {
      expect(TitleNormalizer.normalize('Game (FitGirl Repack)')).toBe('game');
      expect(TitleNormalizer.normalize('Game (FitGirl Repack, Selective)')).toBe('game');
    });

    it('should remove FitGirl Repack markers (brackets)', () => {
      expect(TitleNormalizer.normalize('Game [FitGirl Repack]')).toBe('game');
    });

    it('should remove generic Repack markers', () => {
      expect(TitleNormalizer.normalize('Game (Repack)')).toBe('game');
      expect(TitleNormalizer.normalize('Game [Repack]')).toBe('game');
      expect(TitleNormalizer.normalize('Game - Repack')).toBe('game');
    });

    it('should remove Complete Edition suffix', () => {
      expect(TitleNormalizer.normalize('Game Complete Edition')).toBe('game');
    });

    it('should remove GOTY suffix', () => {
      expect(TitleNormalizer.normalize('Game GOTY')).toBe('game');
      expect(TitleNormalizer.normalize('Game Game of the Year')).toBe('game');
    });

    it('should remove Definitive Edition suffix', () => {
      expect(TitleNormalizer.normalize('Game Definitive Edition')).toBe('game');
    });

    it('should remove Ultimate Edition suffix', () => {
      expect(TitleNormalizer.normalize('Game Ultimate Edition')).toBe('game');
    });

    it('should remove Deluxe Edition suffix', () => {
      expect(TitleNormalizer.normalize('Game Deluxe Edition')).toBe('game');
    });

    it('should remove Premium Edition suffix', () => {
      expect(TitleNormalizer.normalize('Game Premium Edition')).toBe('game');
    });

    it('should remove Enhanced Edition suffix', () => {
      expect(TitleNormalizer.normalize('Game Enhanced Edition')).toBe('game');
    });

    it('should remove Remastered suffix', () => {
      expect(TitleNormalizer.normalize('Game Remastered')).toBe('game');
    });

    it('should remove Remake suffix', () => {
      expect(TitleNormalizer.normalize('Game Remake')).toBe('game');
    });

    it('should remove special characters except hyphens and apostrophes', () => {
      expect(TitleNormalizer.normalize("Grand Theft Auto: Vice City")).toBe('grand theft auto vice city');
      expect(TitleNormalizer.normalize("Game@2023!")).toBe('game 2023');
    });

    it('should preserve hyphens and apostrophes', () => {
      expect(TitleNormalizer.normalize("Spider-Man")).toBe('spider-man');
      expect(TitleNormalizer.normalize("Assassin's Creed")).toBe("assassin's creed");
    });

    it('should handle multiple patterns in one title', () => {
      const input = "Cyberpunk 2077 (FitGirl Repack) Complete Edition: GOTY";
      const expected = 'cyberpunk 2077';
      expect(TitleNormalizer.normalize(input)).toBe(expected);
    });

    it('should trim extra whitespace', () => {
      expect(TitleNormalizer.normalize('  Game   Title  ')).toBe('game title');
      expect(TitleNormalizer.normalize('Game    With     Spaces')).toBe('game with spaces');
    });

    it('should handle empty string', () => {
      expect(TitleNormalizer.normalize('')).toBe('');
    });

    it('should handle only special characters', () => {
      expect(TitleNormalizer.normalize('!@#$%^&*()')).toBe('');
    });

    it('should handle numbers in titles', () => {
      expect(TitleNormalizer.normalize('Grand Theft Auto V')).toBe('grand theft auto v');
      expect(TitleNormalizer.normalize('Resident Evil 4')).toBe('resident evil 4');
    });

    it('should handle real-world examples', () => {
      expect(TitleNormalizer.normalize('Cyberpunk 2077 (FitGirl Repack, Selective Download)'))
        .toBe('cyberpunk 2077');

      expect(TitleNormalizer.normalize('Grand Theft Auto V: Premium Edition'))
        .toBe('grand theft auto v');

      expect(TitleNormalizer.normalize('The Witcher 3: Wild Hunt - GOTY'))
        .toBe('the witcher 3 wild hunt');
    });
  });
});
