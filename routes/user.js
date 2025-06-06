import express from "express";
import {
  getUser,
  login,
  logout,
  signup,
  updateUser,
} from "../controllers/user";
import { authenticate } from "../middlewares/auth";

const router = express.Router();

router.post("/authenticate", authenticate, updateUser);
router.get("/users", authenticate, getUser);

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
export default router;
