import {
  AccessLevel,
  Tenant,
  TenantCompany,
  TenantInvitation,
  TenantTeam,
} from '@aimingle/entity';
import { RequestContext, attachTenantId } from '@utils/requestContext';
import { createHash, randomBytes } from 'crypto';
import { getRepository } from 'typeorm';
import { InvalidTokenError, TokenExpiredError } from 'types/errors/emailVerificationErrors';

interface NewTenantOptions {
  displayName: string;
  companyId: number;
  accessLevel: AccessLevel;
}

interface ValidateTokenResponse {
  email: string;
  tenant: Tenant;
}
export async function initializeNewTenant({
  displayName,
  companyId,
  accessLevel = AccessLevel.UNKNOWN,
}: NewTenantOptions): Promise<void> {
  const tenantCompanyRepo = getRepository(TenantCompany);
  const tenantTeamRepo = getRepository(TenantTeam);
  const tenantRepo = getRepository(Tenant);

  let tenantId: number;
  let company: TenantCompany | undefined;
  let defaultTeam: TenantTeam | undefined;

  company = await tenantCompanyRepo.findOne({ id: companyId });
  if (company) {
    tenantId = company.tenant.id;
    company = await tenantCompanyRepo.findOne({
      where: { tenantId, isDefault: true },
    });
  } else {
    const tenant = await tenantRepo.save({ displayName });
    tenantId = tenant.id;
    [company, defaultTeam] = await Promise.all([
      tenantCompanyRepo.save({
        displayName,
        accessLevel,
        isDefault: true,
        isDisabled: false,
        companyId,
        tenantId,
      }),
      tenantTeamRepo.save({
        displayName: 'Default',
        isDefault: true,
        tenantId,
      }),
    ]);
  }
  attachTenantId(tenantId);
  RequestContext.setValues({
    company: company,
    team: defaultTeam,
    isImpersonated: false,
  });
}

export async function CreateTenantInvitation(email: string): Promise<string> {
  // Generate a token with a 24-hour expiration
  const { hashedToken, expiresAt, rawToken } = generateUniqueToken(
    24 * 60 * 60 * 1000,
  );
  const tenantId = RequestContext.getTenantId();

  const invitation = new TenantInvitation();
  invitation.tenant = await getRepository(Tenant).findOneOrFail(tenantId);
  invitation.email = email;
  invitation.token = hashedToken;
  invitation.expiresAt = expiresAt;
  // Save the token in the database
  await getRepository(TenantInvitation).save(invitation);
  // Return the raw token for email delivery
  return rawToken;
}

/**
 * Generate a unique token with an expiration time.
 * @param expiresIn Duration in milliseconds for token validity (e.g., 24 hours = 86400000 ms).
 * @returns An object containing the raw token, hashed token, and expiration date.
 */
export const generateUniqueToken = (expiresIn: number) => {
  // Generate a random token
  const rawToken = randomBytes(32).toString('base64url');

  // Generate expiration time
  const expiresAt = new Date(Date.now() + expiresIn);

  // Hash the token for secure storage
  const hashedToken = createHash('sha256').update(rawToken).digest('hex');

  return { rawToken, hashedToken, expiresAt };
};

/**
 * Validate the email verification token and retrieve the associated email.
 * @param rawToken The raw token provided by the user.
 * @returns The associated email if the token is valid.
 */
export const validateEmailToken = async (rawToken: string): Promise<ValidateTokenResponse> => {
  const hashedToken = createHash('sha256').update(rawToken).digest('hex'); // Hash the provided token

  // Query the database to find the record by the hashed token
  const emailVerification = await getRepository(TenantInvitation).findOne({
    where: { token: hashedToken },
    relations: ['user']
  });

  if (!emailVerification) {
    throw new InvalidTokenError('Invalid token');
  }

  // Check if the token has expired
  if (emailVerification.expiresAt < new Date()) {
    throw new TokenExpiredError('Token has expired');
  }

  // Return the associated email
  return {email: emailVerification.email, tenant: emailVerification.tenant};
};
