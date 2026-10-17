import * as tickets from '../services/ticket.service.js';
export function createTicketController(jobs) {
  return {
    list: async (req, res) =>
      res.json(await tickets.listTickets(req.query, req.user)),
    create: async (req, res) =>
      res
        .status(201)
        .json({ data: await tickets.createTicket(req.body, req.user, jobs) }),
    get: async (req, res) =>
      res.json({
        data: await tickets.getConversation(req.params.id, req.user),
      }),
    update: async (req, res) =>
      res.json({
        data: await tickets.updateTicket(req.params.id, req.body, req.user),
      }),
    addMessage: async (req, res) => {
      await tickets.addMessage(req.params.id, req.body, req.user);
      res.status(201).json({ data: { message: 'Message saved.' } });
    },
    draft: async (req, res) => {
      await tickets.queueDraft(req.params.id, req.user, jobs);
      res.status(202).json({ data: { message: 'Draft generation queued.' } });
    },
  };
}
