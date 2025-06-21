import bcrypt from "bcrypt";
import { Request, Response } from "express";
import nodemailer from "nodemailer";
import User, { IUser } from "../models/User";
import { generateToken, verifyToken } from "../utils/jwt";
import { AuthRequest, tokenBlacklist } from "../interfaces/Auth";

const asyncHandler = require("express-async-handler");

const modelTitle = "User";

export const signIn = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email, password, and user type are required." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials." });
    }

    const accessToken = await generateToken(user?._id as string);

    res.status(200).json({ accessToken });
  } catch (error: any) {
    res.status(500).json({ message: `Error ${modelTitle}.`, error });
  }
});

export const signUp = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists." });
    }

    const user: IUser = new User({ name, email, password });
    await user.save();

    const accessToken = await generateToken(user?._id as string);

    res
      .status(201)
      .json({ accessToken, message: "User registered successfully." });
  } catch (error) {
    res.status(500).json({ message: `Error ${modelTitle}.`, error });
  }
});

export const signOut = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const token = req.token;
    // Add the token to the blacklist
    if (token) {
      tokenBlacklist.add(token);
    } else {
      res.status(400).json({ message: "Token is missing." });
      return;
    }

    res.status(200).json({ message: "Successfully signed out." });
  } catch (error) {
    res.status(500).json({ message: `Error ${modelTitle}.`, error });
  }
});


export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { _id, type } = req.user;

  // Create the base query
  const query = User.findById(_id).select("-password");

  // Conditionally populate company
  if (type === "company_user" || type === "customer") {
    query.populate("company");
  }

  try {
    const user = await query.exec();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({
      message: `Error fetching user profile.`,
    });
  }
});


export const updateProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, mobile } = req.body;

      // Find the company by ID
      const users = await User.findById(req.user._id);
      if (!users) {
        res.status(404).json({ message: "User not found." });
      }

      // Update fields with the new data (if provided)
      const updatedProfile = await User.findByIdAndUpdate(
        req.user._id,
        {
          ...(name && { name }),
          ...(mobile && { mobile }),
        },
        { new: true } // Return the updated document
      );

      res.status(200).json({
        message: "Profile updated successfully.",
        updatedProfile,
      });
    } catch (error: any) {
      res.status(500).json({ message: `Error ${modelTitle}.`, error });
    }
  }
);

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
      }

      const token = await generateToken(user._id as string);

      // Reset URL
      const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${token}`;

      // Send Email
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST, // Replace with your SMTP server host
        port: Number(process.env.EMAIL_PORT), // Common port for SMTP (587 for TLS, 465 for SSL)
        secure: false, // True for 465 (SSL), false for other ports
        auth: {
          user: process.env.EMAIL_HOST_USER,
          pass: process.env.EMAIL_HOST_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.DEFAULT_FROM_EMAIL,
        to: email,
        subject: "Password Reset Request",
        text: `Click this link to reset your password: ${resetUrl}`,
      });

      res.status(200).json({
        message: "Password reset email sent successfully.",
      });
    } catch (error: any) {
      console.log("error", error);
      res.status(500).json({ message: `Error ${modelTitle}.`, error });
    }
  }
);

export const verifyResetToken = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      if (!token) {
        res.status(400).json({ message: "Token is missing." });
        return;
      }
      const decodedToken = await verifyToken(token as string);

      // Check if the token is valid
      if (!decodedToken) {
        res.status(400).json({ message: "Invalid token." });
        return;
      }

      // Find user by ID
      const user = await User.findById(decodedToken.userId);
      if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
      }

      const updatedData: Partial<IUser> = {};
      if (password) {
        const hashedPassword = await bcrypt.hash(String(password), 10);
        updatedData.password = hashedPassword; // Update password only if provided
      }

      const updatedUser = await User.findByIdAndUpdate(
        decodedToken.userId,
        updatedData,
        { new: true, runValidators: true } // Ensures the updated data adheres to the schema
      ).select("-password"); // Exclude the password field from the result

      if (!updatedUser) {
        res.status(404).json({ message: `${modelTitle} not found.` });
      }

      res
        .status(200)
        .json({ message: "Password has been reset successfully." });
    } catch (error) {
      res.status(500).json({ message: `Error ${modelTitle}.`, error });
    }
  }
);

export const resetPassword = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    try {
      const { newPassword } = req.body;

      // Find user by ID
      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
      }

      // Update the password
      user.password = newPassword; // Ensure password hashing in your model's `pre-save` middleware
      await user.save();

      res
        .status(200)
        .json({ message: "Password has been reset successfully." });
    } catch (error) {
      res.status(500).json({ message: `Error ${modelTitle}.`, error });
    }
  }
);
