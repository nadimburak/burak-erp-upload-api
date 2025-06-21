import express from "express";
import { forgotPassword, getProfile, resetPassword, signIn, signOut, signUp, updateProfile } from "../controllers/authController";
import { authenticate } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/sign-in", signIn);
router.post("/sign-up", signUp);
router.post("/forgot-password", forgotPassword);

router.use(authenticate);

router.delete("/sign-out", signOut);
router.get("/get-profile", getProfile);
router.put("/update-profile", updateProfile);
router.post("/reset-password", resetPassword);

export default router;
