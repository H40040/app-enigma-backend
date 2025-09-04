'use strict';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Validates if a string is a valid email
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether the email is valid
 */
function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

/**
 * Validates if a string is a valid password
 * Requirements:
 * - At least 8 characters long
 * - Contains at least one lowercase letter
 * - Contains at least one uppercase letter
 * - Contains at least one number
 * - Contains at least one special character
 * @param {string} password - Password to validate
 * @returns {boolean} - Whether the password is valid
 */
function isValidPassword(password) {
  return PASSWORD_REGEX.test(password);
}

/**
 * Validates if a value is not null, undefined, or empty
 * @param {*} value - Value to validate
 * @returns {boolean} - Whether the value exists and is not empty
 */
function isRequired(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/**
 * Validates if a number is within a specific range
 * @param {number} num - Number to validate
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {boolean} - Whether the number is within range
 */
function isWithinRange(num, min, max) {
  return num >= min && num <= max;
}

/**
 * Validates if a string matches a specific length
 * @param {string} str - String to validate
 * @param {number} length - Required length
 * @returns {boolean} - Whether the string matches the length
 */
function isLength(str, length) {
  return str.length === length;
}

/**
 * Validates if a string has a minimum length
 * @param {string} str - String to validate
 * @param {number} minLength - Minimum length
 * @returns {boolean} - Whether the string meets the minimum length
 */
function isMinLength(str, minLength) {
  return str.length >= minLength;
}

/**
 * Validates if a string has a maximum length
 * @param {string} str - String to validate
 * @param {number} maxLength - Maximum length
 * @returns {boolean} - Whether the string meets the maximum length
 */
function isMaxLength(str, maxLength) {
  return str.length <= maxLength;
}

/**
 * Validates if an array has unique elements
 * @param {Array} arr - Array to validate
 * @returns {boolean} - Whether the array has unique elements
 */
function isUnique(arr) {
  return new Set(arr).size === arr.length;
}

/**
 * Validates if a value is of a specific type
 * @param {*} value - Value to validate
 * @param {string} type - Expected type
 * @returns {boolean} - Whether the value is of the expected type
 */
function isType(value, type) {
  return typeof value === type;
}

/**
 * Validates if a value is one of the allowed values
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @returns {boolean} - Whether the value is in the allowed values
 */
function isIncluded(value, allowedValues) {
  return allowedValues.includes(value);
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isRequired,
  isWithinRange,
  isLength,
  isMinLength,
  isMaxLength,
  isUnique,
  isType,
  isIncluded
};