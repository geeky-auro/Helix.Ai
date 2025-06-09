import { NonRetriableError } from "inngest";
import Ticket from "../../models/ticket.js";
import User from "../../models/user.js";
import { inngest } from "../client.js";
import { sendMail } from "../../utils/mailer.js";
import analyzeTicket from "../../utils/ai.js";

export const onTicketCreated = inngest.createFunction(
  {
    id: "on-ticket-created",
    // Configure the number of times the function will be retried from 0 to 20. Default: 4
    retries: 2,
  },
  { event: "ticket/created" },
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data;
      // fetch ticket from the DB
      const ticket = await step.run("fetch-ticket", async () => {
        const ticketObject = await Ticket.findById(ticketId);
        if (!ticketId) {
          throw new NonRetriableError("Ticket not found");
        }
        return ticketObject;
      });
      await step.run("update-ticket-status", async () => {
        await Ticket.findById(ticket._id, {
          status: "TODO",
        });
      });
      const aiResponse = await analyzeTicket(ticket);

      const relatedSkills = await step.run("ai-processing", async () => {
        let skills = [];
        if (aiResponse) {
          await Ticket.findById(ticket._id, {
            priority: !["low", "medium", "high"].includes(aiResponse.priority)
              ? "medium"
              : aiResponse.priority,
            helpfulNotes: aiResponse.helpfulNotes,
            status: "IN_PROGRESS",
            relatedSkills: aiResponse.relatedSkills,
          });
          skills = aiResponse.relatedSkills;
        }
        return skills;
      });

      const moderator = await step.run("assign-moderator", async () => {
        let user = await User.findOne({
          role: "moderator",
          // We provide a role of moderator and with the help of regex we find
          // whosever skill matches we grab them
          skills: {
            $eleMatch: {
              $regex: relatedSkills.join("|"),
              //   "i" makes the regex case-insensitive, so it will match "react" or "ReAcT" as well.
              $options: "i",
            },
          },
        });
        if (!user) {
          user = await User.findOne({
            role: "admin",
          });
        }
        await Ticket.findByIdAndUpdate(ticket._id, {
          assignedTo: user?._id || null,
        });
        return user;
      });
      // Trigger another pipeline and planning to send a email
      await step.run("send-email-notification", async () => {
        if (moderator) {
          const finalTicket = await Ticket.findById(ticket._id);
          await sendMail(
            moderator.email,
            "Ticket Assigned",
            `A new ticket is assigned to you ${finalTicket.title}`
          );
        }
      });
      return { success: true };
    } catch (error) {
      console.error("Error running steps: ", error);
    }
  }
);
