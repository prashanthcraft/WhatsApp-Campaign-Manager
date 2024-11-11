import { PhoneNumberUtil } from "google-libphonenumber";
import logger from "@utils/logger";

const phoneUtil = PhoneNumberUtil.getInstance();

/**
 * Validates a phone number
 * 
 * @param phoneNumber - The phone number to be validated.
 * @returns true if the phone number is valid, otherwise false.
 */
const validatePhoneNumber = async (phoneNumber: string) => {
  try {
    const parsedNumber = phoneUtil.parse(phoneNumber);
    return phoneUtil.isValidNumber(parsedNumber);
  } catch (error) {
    logger.error("Error while validating phone number: ", error);
    return false;
  }
};

/**
 * Validates a phone number and detects its country code.
 * 
 * @param phoneNumber - The phone number to be validated.
 * @returns country code if the phone number is valid, otherwise false.
 */
const getCountryCode = async (phoneNumber: string) => {
  try {
    const parsedNumber = phoneUtil.parse(phoneNumber);
    const countryCode = phoneUtil.getRegionCodeForNumber(parsedNumber);
    logger.info("Detected Country Code: ", countryCode);
    return countryCode;
  } catch (error) {
    logger.error("Error while getting phone number country code: ", error);
    return false;
  }
};

export { getCountryCode, validatePhoneNumber };
