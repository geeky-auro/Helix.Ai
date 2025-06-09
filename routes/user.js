import express from "express";
import {
  getUser,
  login,
  logout,
  signup,
  updateUser,
} from "../controllers/user.js";
import { authenticate } from "../middlewares/auth.js";

const userRoutes = express.Router();

userRoutes.post("/authenticate", authenticate, updateUser);
userRoutes.get("/users", authenticate, getUser);

userRoutes.post("/signup", signup);
userRoutes.post("/login", login);
userRoutes.post("/logout", logout);
export default userRoutes;
