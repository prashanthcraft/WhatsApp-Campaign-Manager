import { User, UserRole } from "@aimingle/entity";
import { mailConfig } from "@config/email";
import logger, { logError } from "@utils/logger";
import { RequestContext } from "@utils/requestContext";
import { getAuth, UserRecord } from "firebase-admin/auth";
import { VerificationService } from "services";
import { getRepository } from "typeorm";

export interface CreateUserOptions {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  requireEmailVerification?: boolean
  companyId?: number;
  teamId?: number;
  role: UserRole;
  phone?: string;
  settings?: object;
  requireApproval?: boolean;
}

export interface NewUserInfo {
  aimUser: User;
  fbUser: UserRecord;
}
export async function createUser(
  options: CreateUserOptions
): Promise<NewUserInfo> {
  logger.debug("Creating User with props ", {
    ...options,
    password: "**************",
  });
  let uid;
  try {
    let {
      email: rawEmail,
      password,
      firstName,
      lastName,
      companyId,
      requireEmailVerification = true,
    } = options;

    const email = rawEmail.toLowerCase();
    logger.debug("creating firebase user for ", email);
    const fbUser = await getAuth().createUser({
      email,
      password,
      emailVerified: requireEmailVerification === false,
    });
    uid = fbUser?.uid;
    await getAuth().setCustomUserClaims(uid, { companyId: companyId});

    logger.debug(`created firebase user for ${email}`, { fbUser });


    logger.debug(`createUser: ${email}: creating the user`);
    
    const userRepo = getRepository(User);
    
    const newUserPayload = {
        firebaseUid: uid,
        tenantId: RequestContext.getTenantId() ?? 0,
        email,
        firstName,
        lastName,
        companyId: RequestContext.getCompany()?.id ?? 0,
        requirePasswordReset: false,
        photoUrl: fbUser.photoURL ?? ""
    };
    
    const aimingleUser = await userRepo.save(newUserPayload);
    
    logger.debug(`createUser: ${email}: Created Signup user`, {aimingleUser});

    if(requireEmailVerification && !mailConfig.disableSignUpVerification) {
        logger.debug(`createUSer: initiating email verification for > ${email}`);
        VerificationService.createEmailVerification(aimingleUser).catch(err => logError(`createEmailVerification: ${email} delivery failed`, err));
    } else {
        logger.debug(`createUser: Sign-up Email Verification skipped for ${email}`);
        await VerificationService.verifyUser(aimingleUser.id);
    }


    return {
        aimUser: aimingleUser,
        fbUser
    }

    
  } catch (error) {
    logError('Error in signUp', error);
    if((error as any).code === "auth/email-already-exists"){
        throw new DuplicateMailError();
    } else if ((error as any).code === "auth/invalid-password") {
        throw new InvalidPasswordError();
    } else {
        if(uid) {
            await getAuth().deleteUser(uid);
        }
        throw (error);
    }
  }
}

export class InvalidPasswordError extends Error {

}

export class DuplicateMailError extends Error {

}
