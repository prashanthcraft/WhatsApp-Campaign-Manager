import { validate as isValidEmailAddress } from "email-validator";
import { getAuth } from "firebase-admin/auth";
import logger from "./logger";
// import { parse_host as parseHost } from "tld-extract";
var parse_host = require("tld-extract");

/**
 * todo: need Add domain validation here from database
 * Validates an email address and checks for duplicates in Firebase Authentication.
 *
 * @param email - The email address to be validated.
 * @returns "bad_address" if the email is not valid, "duplicate" if it already exists, otherwise false.
 */
export default async function isValidEmail(
  email: string
): Promise<string | boolean> {
  if (!isValidEmailAddress(email)) {
    return "bad_address";
  }

  try {
    await getAuth().getUserByEmail(email);
    return "duplicate";
  } catch (err) {
    logger.error("Error: email duplicate check failed for ", email);
  }

  const [, domain] = email.split("@");
  const { domain: rootDomain, tld } = parse_host(domain.toLowerCase(), {
    allowUnknownTLD: true,
  });
  logger.info("domain", rootDomain);
  logger.info("tld domain", tld);
  const [rootDomainRestricted, tldRestricted] = await Promise.all([
    { restricted: false, domainType: "" },
    { restricted: false, domainType: "" },
  ]);
  if (rootDomainRestricted?.restricted) {
    const reason = rootDomainRestricted.domainType ?? "other";
    return `domain_restricted.${reason}`;
  } else if (tldRestricted?.restricted) {
    const reason = tldRestricted.domainType ?? "other";
    return `domain_restricted.${reason}`;
  }

  return false;
}
