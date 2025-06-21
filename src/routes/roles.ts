import express from "express";
import {
  createRole,
  deleteRole,
  getRole,
  getRoles,
  updateRole,
} from "../controllers/roleController";
import { authorizePermission } from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/roles", authorizePermission("Can view role"), getRoles);
router.get("/roles/:id", authorizePermission("Can view role"), getRole);
router.post("/roles", authorizePermission("Can create role"), createRole);
router.put("/roles/:id", authorizePermission("Can edit role"), updateRole);
router.delete("/roles/:id", authorizePermission("Can delete role"), deleteRole);

export default router;
