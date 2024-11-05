// src/controllers/authController.ts
import { Request, Response } from "express";
import { firebaseAuth } from "@config/firebaseConfig";
import { getRepository } from "typeorm";
import { User } from "@aimingle/entity"; // Assuming this is the correct import for the User entity

// Define the request body structure using an interface
interface SignupRequestBody {
  idToken: string;
}

// Signup Logic
export const signup = async (req: Request, res: Response): Promise<Response> => {
  // Destructure and validate idToken from request body
  const { idToken }: SignupRequestBody = req.body;

  if (!idToken) {
    return res.status(400).json({ message: "ID token is required" });
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email || "";
    const firstName = decodedToken.name || "";
    const lastName = decodedToken.lastName || "";
    const photoURL = decodedToken.picture || "";

    // Check if user exists in the database
    const userRepository = getRepository(User);
    let user = await userRepository.findOne({ where: { firebaseUid } });

    // If user does not exist, create a new one
    if (!user) {
      user = new User();
      user.firebaseUid = firebaseUid;
      user.email = email;
      user.firstName = firstName;
      user.lastName = lastName;
      user.photoUrl = photoURL;

      await userRepository.save(user);
    }

    // Respond with user info
    return res.status(200).json({
      status: "success",
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        photoURL: user.photoUrl,
      },
    });
  } catch (error) {
    console.error("Error during signup: ", error);
    return res.status(401).json({ message: "Unauthorized", error });
  }
};
