import { EmailVerification, User } from "@aimingle/entity";
import { appBaseConfig } from "@config/app";
import logger from "@utils/logger";
import { getRepository } from "typeorm";
import { EmailService } from "./email.service";
import { RequestContext } from "@utils/requestContext";
import _ = require("lodash");
import { getAuth } from "firebase-admin/auth";

export async function createEmailVerification({
  id,
  email,
  firstName,
  lastName,
}: User): Promise<any> {
  logger.debug(
    `createEmailVerification: creating EmailVerification record for email: ${email}`
  );
  const emailVerificationRepo = getRepository(EmailVerification);
  const emailVerification = await emailVerificationRepo.save({
    userId: id,
    email,
  });
  logger.debug(
    `createEmailVerification: created EmailVerification record for email: ${email} : ${emailVerification}`
  );

  const emailVerificationLink =
    appBaseConfig.signUpVerifyUrl + emailVerification.id;
  logger.debug(`createEmailVerification: initializing sendEmail for: ${email}`);

  await EmailService.sendEmailNotification({
    template: "verifyEmail",
    templateParams: { firstName, lastName, emailVerificationLink },
    subject: "Welcome to Aimingle! Confirm Your Email to Get Started 🚀",
    to: email,
    sendMonitoringEmail: true,
  });
}

export async function verifyUser(
  userIdOrEmail: string | number
): Promise<void> {
  const tenantId = RequestContext.getTenantId();
  const userRepo = getRepository(User);
  let email;
  let aimingleUser: User;
  logger.debug(
    `verifyUser: initializing user verification for ${userIdOrEmail}`
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
    let reason = "unknown";
    if ((err as any).code === "auth/user-not-found") {
      reason = "unregistered_email";
      logger.warn(
        `verifyUser: User not found on firebase for verification > ${email}`
      );
    } else {
      logger.error(
        `verifyUser: Unknown Error while verifying ${email} user.`,
        err
      );
    }
    throw reason;
  }
}
