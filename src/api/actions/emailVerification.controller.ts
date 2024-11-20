import { EmailVerification, TenantCompany } from '@aimingle/entity';
import logger, { logError } from '@utils/logger';
import { RequestContext, attachTenantId } from '@utils/requestContext';
import { NextFunction, Response } from 'express';
import { TenantService, VerificationService } from 'services';
import { UpdateResult, getRepository } from 'typeorm';
import { RequestWithType } from 'types';
import {
  InvalidTokenError,
  TokenExpiredError,
} from 'types/errors/emailVerificationErrors';

export async function verify(
  req: RequestWithType<{ token: string }>,
  resp: Response,
  next: NextFunction,
) {
  const { token } = req.params;
  if (!token) {
    return resp.redirect('/error?message=invalid_token_format'); // Redirect for missing or malformed token
  }
  try {
    logger.debug(
      `email verification: ${token}: marking EmailVerification as verified`,
    );
    const { email, tenant } = await TenantService.validateEmailToken(token);

    const emailVerifyUpdate: UpdateResult = await getRepository(
      EmailVerification,
    ).update({ verified: false, email }, { verified: true });

    logger.debug(
      `email verification: ${tenant} EmailVerification update result`,
      emailVerifyUpdate,
    );

    attachTenantId(tenant.id);
    let company: TenantCompany;
    try {
      company = await getRepository(TenantCompany).findOneOrFail({
        // tenant: tenant.id,
      });

      RequestContext.setValues({ company: company, isImpersonated: false });
      logger.debug(`email verification: ${email} starting verifyUser`);
      await VerificationService.verifyUser(email);
    } catch (err) {
      logError(`email verification: Failed to verify user for ${email}`);
      return resp.redirect('/error?message=unknown');
    }
    logger.debug(`email verification: ${email}:verified`);
    resp.redirect('/email_verified');
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      logger.warn('email Verification: Token Not found');
      return resp.redirect('/error?message=invalid_token');
    } else if (error instanceof TokenExpiredError) {
      logger.warn('email Verification: Token Expired');
      return resp.redirect('/error?message=token_expired');
    } else {
      logger.error(
        'email Verification: Unexpected error during email verification:',
        error,
      );
      return resp.redirect('/error?message=unexpected_error_occurred');
    }
  }
}
