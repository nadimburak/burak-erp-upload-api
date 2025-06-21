import { Response } from "express";
import { AuthRequest } from "../interfaces/Auth";
import { verifyToken } from "../utils/jwt";
import User from "../models/User";
import { authorizeRole } from "../middlewares/auth.middleware";
import Role from "../models/Role";

const asyncHandler = require("express-async-handler");

const modelTitle = "Middleware";

export const verifyTokenHandle = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req;

    if (!token) {
      res.status(400).json({ message: "Token is missing." });
      return;
    }
    const verified = await verifyToken(token as string);

    // Check if the token is valid
    if (!verified) {
      res.status(400).json({ message: "Invalid token." });
      return;
    }

    let user = null;
    if (typeof verified !== "string" && "userId" in verified) {
      const userId = verified.userId;
      user = await User.findById(userId);
    }

    res.status(200).json({ message: "Token Verified.", user });
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Error ${modelTitle}.`, error });
  }
});

export const authorizePermissionHandle = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { permission } = req.body;

    if (!permission) {
      res.status(400).json({ message: "Permission is missing." });
      return;
    }

    const role = await Role.findById(req.user.role).populate<{
      permissions: any[];
    }>("permissions");

    const hasPermission = role?.permissions.some(
      (p: any) => p.name.toLowerCase() === permission.toLowerCase()
    );

    if (!hasPermission) {
      return res.status(403).send({ message: "Forbidden" });
    }

    res.status(200).send({ message: "Authorized!",hasPermission });

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: `Error ${modelTitle}.`, error });
  }
});