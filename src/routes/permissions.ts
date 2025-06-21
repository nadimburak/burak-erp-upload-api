import express from "express";
import {
  createPermission,
  deletePermission,
  getAllPermissions,
  getPermission,
  getPermissions,
  updatePermission,
} from "../controllers/permissionController";
import { authorizePermission } from "../middlewares/auth.middleware";

const router = express.Router();

router.get(
  "/permissions",
  authorizePermission("Can view permission"),
  getPermissions
);
router.get(
  "/all_permissions",
  authorizePermission("Can view permission"),
  getAllPermissions
);
router.get(
  "/permissions/:id",
  authorizePermission("Can view permission"),
  getPermission
);
router.post(
  "/permissions",
  authorizePermission("Can create permission"),
  createPermission
);
router.put(
  "/permissions/:id",
  authorizePermission("Can edit permission"),
  updatePermission
);
router.delete(
  "/permissions/:id",
  authorizePermission("Can delete permission"),
  deletePermission
);

export default router;
