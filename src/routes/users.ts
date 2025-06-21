import express from "express";
import {
  createUser,
  deleteUser,
  getUser,
  getUsers,
  updatePassword,
  updateUser,
} from "../controllers/userController";
import { authorizePermission } from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/users", authorizePermission("Can view user"), getUsers);
router.get("/users/:id", authorizePermission("Can view user"), getUser);
router.post("/users", authorizePermission("Can create user"), createUser);
router.put("/users/:id", authorizePermission("Can edit user"), updateUser);
router.delete("/users/:id", authorizePermission("Can delete user"), deleteUser);
router.put(
  "/update-password/:id",
  authorizePermission("Can edit user"),
  updatePassword
);

export default router;
