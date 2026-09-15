import { parsePhoneNumberFromString, AsYouType, CountryCode } from "libphonenumber-js";

/**
 * Formats a phone number in real-time as the user types.
 * If a countryCode is provided, formats according to that country.
 * Otherwise, if it starts with '+', formats internationally; else defaults to US.
 */
export function formatPhoneAsYouType(value: string, countryCode?: string): string {
  if (!value) return "";
  const defaultRegion = countryCode || (value.startsWith("+") ? undefined : "US");
  const formatter = new AsYouType(defaultRegion as CountryCode);
  return formatter.input(value);
}

/**
 * Validates whether the number is a valid complete mobile phone number.
 */
export function isValidMobileNumber(value: string, countryCode?: string): boolean {
  if (!value) return false;
  try {
    const defaultRegion = countryCode || (value.startsWith("+") ? undefined : "US");
    const phoneNumberObj = parsePhoneNumberFromString(value, defaultRegion as CountryCode);
    if (!phoneNumberObj) return false;
    
    // Check if the number is valid in general
    if (!phoneNumberObj.isValid()) return false;
    
    const type = phoneNumberObj.getType();
    // MOBILE: Mobile numbers
    // FIXED_LINE_OR_MOBILE: In some regions (like US/Canada), they are not differentiated
    // PERSONAL_NUMBER: Personal numbers that might support messaging/SMS
    return type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE" || type === "PERSONAL_NUMBER" || type === undefined;
  } catch (_error) { /* eslint-disable-line @typescript-eslint/no-unused-vars */
    return false;
  }
}

/**
 * Normalizes the phone number to E.164 format.
 * Returns the normalized string if valid, otherwise returns the cleaned digits string.
 */
export function toE164(value: string, countryCode?: string): string {
  if (!value) return "";
  try {
    const defaultRegion = countryCode || (value.startsWith("+") ? undefined : "US");
    const phoneNumberObj = parsePhoneNumberFromString(value, defaultRegion as CountryCode);
    if (phoneNumberObj) {
      return phoneNumberObj.format("E.164");
    }
  } catch (error) {
    console.error("Failed to parse to E.164:", error);
  }
  // Fallback to simple cleaning if parsing fails
  const cleaned = value.replace(/[^0-9+]/g, "");
  return cleaned.startsWith("+") ? cleaned : `+1${cleaned.replace(/\+/g, "")}`;
}
