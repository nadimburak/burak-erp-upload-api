import express from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizePermissionHandle, verifyTokenHandle } from "../controllers/middleController";

const router = express.Router();

router.use(authenticate);

router.get("/verify-token", verifyTokenHandle);
router.post("/authorize-permission", authorizePermissionHandle);

export default router;
