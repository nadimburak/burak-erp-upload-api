import { NextFunction, Response } from "express";
import { AuthRequest } from "../interfaces/Auth";
import Role from "../models/Role";
import User from "../models/User";
import { verifyToken } from "../utils/jwt";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = await req.header("Authorization");
  if (!authHeader) {
    res.status(401).json({ message: "Access Denied: No token provided" });
    return;
  }

  const token = await authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Access Denied: Invalid token format" });
    return;
  }

  try {

    const verified = await verifyToken(token);

    let user = null;
    if (typeof verified !== "string" && "userId" in verified) {
      const userId = verified.userId;
      user = await User.findById(userId);
    }

    req.user = user; // Add the verified user to the request object
    req.token = token; // Add the token to the request object
    next(); // Call the next middleware
  } catch (err) {
    res.status(401).json({ message: "Invalid Token" });
  }
};

export const authorizeRole =
  (roleName: string) =>
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (req.user?.role !== roleName) {
        res.status(403).send({ message: "Forbidden" });
      }
      next();
    };

export const authorizePermission =
  (permissionName: string) =>
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (req?.user) {
        const role = await Role.findById(req?.user?.role).populate<{
          permissions: any[];
        }>("permissions");
        if (
          !role ||
          !role.permissions.some(
            (p: any) => p.name.toLowerCase() === permissionName.toLowerCase()
          )
        ) {
          res.status(403).send({ message: "Forbidden" });
        }
      }
      next();
    };
