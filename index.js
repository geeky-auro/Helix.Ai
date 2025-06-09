import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import userRoutes from "../Helixa.ai/routes/user.js";
import { onUserSignUp } from "./inngest/functions/on-signup.js";
import { onTicketCreated } from "./inngest/functions/on-ticket-create.js";
// import userRoutes from "/routes/user.js";
import ticketRouters from "../Helixa.ai/routes/ticket.js";
dotenv.config(); // 👈 This must be called BEFORE you use process.env

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/tickets", ticketRouters);
app.use(
  "/api/inngest",
  serve({ client: inngest, functions: [onUserSignUp, onTicketCreated] })
);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => {
      console.log("Server Started at https://localhost:3000");
    });
  })
  .catch(console.log);
