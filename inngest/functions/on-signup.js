import { NonRetriableError } from "inngest";
import User from "../../models/user";
import { inngest } from "../client";
import { sendMail } from "../../utils/mailer";
export const onUserSignUp = inngest.createFunction(
  { id: "on-user-signup", retries: 2 },
  { event: "user/signup" },
  async ({ event, step }) => {
    try {
      const { email } = event.data;
      const uuser = await step.run("get-user-email", async () => {
        const userObject = await User.findOne({ email });
        if (!userObject) {
          throw new NonRetriableError("User no longer exists in our DB");
        }
        return userObject;
      });
      await step.run("send-welcome-email", async () => {
        const subject = `Welcome to the App`;
        const message = `Hi,
        \n\n
        Thanks for signing in. Glad to have you onboard!`;
        await sendMail(uuser.email, subject, message);
      });

      return { success: true };
    } catch (error) {
      console.error("Error running step", error.message);
      return { success: false };
    }
  }
);
