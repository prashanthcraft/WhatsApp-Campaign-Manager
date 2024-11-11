// src/controllers/authController.ts
import { Request, Response } from "express";
import { firebaseAuth } from "@config/firebaseConfig";
import { getRepository } from "typeorm";
import { User, UserRole } from "@aimingle/entity"; // Assuming this is the correct import for the User entity
import { validatePhoneNumber } from "@utils/phone.utils";
import { BadRequestError, DuplicateError } from "rest-api-errors";
import isValidEmail from "@utils/email.utils";
import { CompanyService, UserService } from "services";
import logger from "@utils/logger";
import { initializeNewTenant } from "services/tenant.service";
import { RequestContext } from "@utils/requestContext";

// Define the request body structure using an interface
interface SignupRequestBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;

  phone?: string;

  companyName: string;
}

// Signup Logic
export const signup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      companyName,
      phone,
    }: SignupRequestBody = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        code: "missing_required_fields",
        message: "Missing Required Fields",
      });
    }

    await validateSignUpRequest(email);
    let requireEmailVerification = true;

    // Todo: Need to add multi tenancy email verification here

    logger.debug(`signUp: ${email}: Creating new company: ${companyName}`);
    const company = await CompanyService.createCompany({ name: companyName! });
    const companyId = company.id;
    logger.debug(`signUp: ${email}: Created new company: ${companyName}`);

    logger.debug(`signUp: ${email}: Creating new Tenant: ${companyName}`);
    await initializeNewTenant({
      companyId,
      displayName: company.name,
      accessLevel: company.accessLevel,
    });
    logger.debug(`signUp: ${email}: Created new Tenant: ${companyName}`);

    logger.debug(`signUp:${email}: Creating User`, {
      data: {
        email,
        firstName,
        lastName,
        companyId,
        company: RequestContext.getCompany(),
        requireEmailVerification,
      },
    });

    const { aimUser, fbUser } = await UserService.createUser({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: UserRole.ADMIN,
      companyId: RequestContext.getCompany()?.id,
      requireEmailVerification,
    });

    

    // Respond with user info
    return res.status(200).json({
      status: "success",
      user: {
        email: aimUser.email,
        firstName: aimUser.firstName,
        lastName: aimUser.lastName,
        photoURL: aimUser.photoUrl,
      },
    });
  } catch (error) {
    console.error("Error during signup: ", error);
    return res.status(401).json({ message: "Unauthorized", error });
  }
};

const validateSignUpRequest = async (email: string, phone?: string) => {
  if (phone) {
    const isValidPhoneNumber = validatePhoneNumber(phone);
    if (!isValidPhoneNumber) {
      throw new BadRequestError("invalid_phone_number");
    }
  }

  const invalidReason = await isValidEmail(email);

  if (invalidReason === "duplicate") {
    throw new DuplicateError("duplicate_email");
  }

  if (invalidReason === "bad_address") {
    throw new BadRequestError("invalid_email");
  }

  if (
    typeof invalidReason !== "boolean" &&
    invalidReason.startsWith("domain_restricted")
  ) {
    throw new BadRequestError(invalidReason);
  }
};
