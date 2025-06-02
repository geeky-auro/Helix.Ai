import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user";
import { inngest } from "../inngest/client";
import { error } from "console";

export const signup = async (req, res) => {
  const { email, password, skills = [] } = req.body;
  try {
    const hashedPassword = bcrypt.hash(password, 10);
    const user = User.create({ email, password: hashedPassword, skills });
    // Fire inngest event ;)
    // Types of firing the event :-
    // Fire the event and keep on waiting to listen
    // Keep on firing for a certain no. of times

    await inngest.send({
      name: "user/signup",
      data: {
        email,
      },
    });

    const token = jwt.sign(
      {
        _id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET
    );
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: "Signup failed", details: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = User.findOne({ email });
    if (!user) return res.status(401).json({ error: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        _id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET
    );
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: "login failed", details: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ error: "Unauthorized" });

      // No server-side logout for JWT unless using blacklist
      return res.json({
        message: "Logout successful. Please delete the token on the client.",
      });
    });
  } catch (err) {
    res.status(500).json({ error: "Logout failed", details: err.message });
  }
};
