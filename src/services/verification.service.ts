import { EmailVerification, User } from '@aimingle/entity';
import { appBaseConfig } from '@config/appConfig';
import logger from '@utils/logger';
import { RequestContext } from '@utils/requestContext';
import { getAuth } from 'firebase-admin/auth';
import { ContractService, InvitationService, TenantService } from 'services';
import { getRepository } from 'typeorm';

import { EmailService } from './email.service';

import _ = require('lodash');
import { createHash } from 'crypto';

export async function createEmailVerification({
  id,
  email,
  firstName,
  lastName,
}: User): Promise<any> {
  logger.debug(
    `createEmailVerification: creating EmailVerification record for email: ${email}`,
  );
  const emailVerificationRepo = getRepository(EmailVerification);
  const emailVerification = await emailVerificationRepo.save({
    userId: id,
    email,
  });
  logger.debug(
    `createEmailVerification: created EmailVerification record for email: ${email} : ${emailVerification}`,
  );
  logger.debug(
    `createEmailVerification: creating Tenant Invitation for email: ${email}`,
  );
  const emailVerifyToken = await TenantService.CreateTenantInvitation(email);
  logger.debug(
    `createEmailVerification: created Tenant Invitation for email: ${email}`,
  );

  const emailVerificationLink =
    appBaseConfig.signUpVerifyUrl + emailVerifyToken;
  logger.debug(`createEmailVerification: initializing sendEmail for: ${email}`);

  await EmailService.sendEmailNotification({
    template: 'verifyEmail',
    templateParams: { firstName, lastName, emailVerificationLink },
    subject: 'Welcome to Aimingle! Confirm Your Email to Get Started 🚀',
    to: email,
    sendMonitoringEmail: true,
  });
}

export async function verifyUser(
  userIdOrEmail: string | number,
): Promise<void> {
  const tenantId = RequestContext.getTenantId();
  const userRepo = getRepository(User);
  let email;
  let aimingleUser: User;
  logger.debug(
    `verifyUser: initializing user verification for ${userIdOrEmail}`,
  );
  if (_.isString(userIdOrEmail)) {
    logger.debug(`verifyUser: verify with email > ${userIdOrEmail}`);
    aimingleUser = await userRepo.findOneOrFail({
      email: userIdOrEmail as string,
    });
    email = userIdOrEmail as string;
  } else {
    logger.debug(`verifyUser: verify with userId > ${userIdOrEmail}`);
    aimingleUser = await userRepo.findOneOrFail(userIdOrEmail);
    email = aimingleUser.email;
  }

  try {
    logger.debug(`verifyUser: updating firebase user verification > ${email}`);
    const { uid } = await getAuth().getUserByEmail(email);
    await getAuth().updateUser(uid, { emailVerified: true });
    logger.debug(`verifyUser: updated firebase user verification > ${email}`);
  } catch (err) {
    let reason = 'unknown';
    if ((err as any).code === 'auth/user-not-found') {
      reason = 'unregistered_email';
      logger.warn(
        `verifyUser: User not found on firebase for verification > ${email}`,
      );
    } else {
      logger.error(
        `verifyUser: Unknown Error while verifying ${email} user.`,
        err,
      );
    }
    throw reason;
  }

  const company = RequestContext.getCompany();

  if (company) {
    logger.debug(`Verify User: ${email} attempting to create default contract`);
    try {
      await ContractService.createDefaultContract(company.id);
      logger.debug('Verify User: Created Default contract');
    } catch (error) {
      logger.error(
        `Verify User: ${email} default contract creation failed`,
        error,
      );
    }
  }

  const pendingInvitation = await InvitationService.getPendingInvitationByEmail(email);
  const autoApprove = Boolean(pendingInvitation);
}


