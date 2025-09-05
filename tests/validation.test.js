const { isValidEmail, isValidPassword, isRequired, isWithinRange, isLength, isMinLength, isMaxLength, isUnique, isType, isIncluded } = require('../utils/validation');

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    test('should return true for a valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    test('should return false for an invalid email', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
      expect(isValidEmail('test@example')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    test('should return true for a valid password', () => {
      expect(isValidPassword('Password123!')).toBe(true);
    });

    test('should return false for an invalid password', () => {
      expect(isValidPassword('short')).toBe(false);
      expect(isValidPassword('noupper1!')).toBe(false);
      expect(isValidPassword('NOLOWER1!')).toBe(false);
      expect(isValidPassword('NoNumber!')).toBe(false);
      expect(isValidPassword('NoSpecial1')).toBe(false);
    });
  });

  describe('isRequired', () => {
    test('should return true for a non-empty value', () => {
      expect(isRequired('hello')).toBe(true);
      expect(isRequired(123)).toBe(true);
      expect(isRequired([1, 2])).toBe(true);
      expect(isRequired({ a: 1 })).toBe(true);
    });

    test('should return false for null, undefined, empty string, or empty array', () => {
      expect(isRequired(null)).toBe(false);
      expect(isRequired(undefined)).toBe(false);
      expect(isRequired('')).toBe(false);
      expect(isRequired('   ')).toBe(false);
      expect(isRequired([])).toBe(false);
    });
  });

  describe('isWithinRange', () => {
    test('should return true if number is within range', () => {
      expect(isWithinRange(5, 1, 10)).toBe(true);
      expect(isWithinRange(1, 1, 10)).toBe(true);
      expect(isWithinRange(10, 1, 10)).toBe(true);
    });

    test('should return false if number is outside range', () => {
      expect(isWithinRange(0, 1, 10)).toBe(false);
      expect(isWithinRange(11, 1, 10)).toBe(false);
    });
  });

  describe('isLength', () => {
    test('should return true if string matches length', () => {
      expect(isLength('hello', 5)).toBe(true);
    });

    test('should return false if string does not match length', () => {
      expect(isLength('hello', 4)).toBe(false);
      expect(isLength('hello', 6)).toBe(false);
    });
  });

  describe('isMinLength', () => {
    test('should return true if string meets minimum length', () => {
      expect(isMinLength('hello', 5)).toBe(true);
      expect(isMinLength('hello', 3)).toBe(true);
    });

    test('should return false if string is shorter than minimum length', () => {
      expect(isMinLength('hello', 6)).toBe(false);
    });
  });

  describe('isMaxLength', () => {
    test('should return true if string meets maximum length', () => {
      expect(isMaxLength('hello', 5)).toBe(true);
      expect(isMaxLength('hello', 7)).toBe(true);
    });

    test('should return false if string is longer than maximum length', () => {
      expect(isMaxLength('hello', 4)).toBe(false);
    });
  });

  describe('isUnique', () => {
    test('should return true if array has unique elements', () => {
      expect(isUnique([1, 2, 3])).toBe(true);
      expect(isUnique(['a', 'b', 'c'])).toBe(true);
    });

    test('should return false if array has duplicate elements', () => {
      expect(isUnique([1, 2, 2])).toBe(false);
      expect(isUnique(['a', 'b', 'a'])).toBe(false);
    });
  });

  describe('isType', () => {
    test('should return true if value is of the expected type', () => {
      expect(isType('hello', 'string')).toBe(true);
      expect(isType(123, 'number')).toBe(true);
      expect(isType(true, 'boolean')).toBe(true);
      expect(isType({}, 'object')).toBe(true);
    });

    test('should return false if value is not of the expected type', () => {
      expect(isType('hello', 'number')).toBe(false);
      expect(isType(123, 'string')).toBe(false);
    });
  });

  describe('isIncluded', () => {
    test('should return true if value is in allowed values', () => {
      expect(isIncluded('apple', ['apple', 'banana'])).toBe(true);
      expect(isIncluded(1, [1, 2, 3])).toBe(true);
    });

    test('should return false if value is not in allowed values', () => {
      expect(isIncluded('grape', ['apple', 'banana'])).toBe(false);
      expect(isIncluded(4, [1, 2, 3])).toBe(false);
    });
  });
});