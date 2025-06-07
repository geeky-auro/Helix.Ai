import { NonRetriableError } from "inngest";
import Ticket from "../../models/ticket";
import User from "../../models/user";
import { inngest } from "../client";
import { sendMail } from "../../utils/mailer";
import analyzeTicket from "../../utils/ai";

export const onTicketCreated = inngest.createFunction(
  {
    id: "on-ticket-created",
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
          skills: {
            $eleMatch: {
              $regex: relatedSkills.join("|"),
              $options: "i",
            },
          },
        });
      });
    } catch (error) {}
  }
);
