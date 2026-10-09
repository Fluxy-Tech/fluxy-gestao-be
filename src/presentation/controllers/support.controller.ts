import type { Request, Response } from "express";
import {
    addTicketMessageUsecase,
    adminListTicketsUsecase,
    adminUpdateTicketUsecase,
    createTicketUsecase,
    downloadTicketAttachmentUsecase,
    getTicketUsecase,
    listMyTicketsUsecase,
    supportSummaryUsecase,
    userSetTicketStatusUsecase,
    type UploadedFile,
} from "../../application/usecases/support/support.usecases";
import { serialize } from "../serialize";

const requester = (req: Request) => ({ userId: req.userId, role: req.userRole });
const filesOf = (req: Request) => ((req.files as UploadedFile[] | undefined) ?? []);

export const supportController = {
    async summary(req: Request, res: Response) {
        res.json(await supportSummaryUsecase(requester(req)));
    },

    async listMine(req: Request, res: Response) {
        res.json(serialize(await listMyTicketsUsecase(req.userId, req.query)));
    },

    async create(req: Request, res: Response) {
        res.status(201).json(serialize(await createTicketUsecase(req.userId, req.body, filesOf(req))));
    },

    async get(req: Request, res: Response) {
        res.json(serialize(await getTicketUsecase(requester(req), req.params.id as string)));
    },

    async addMessage(req: Request, res: Response) {
        res.status(201).json(serialize(await addTicketMessageUsecase(requester(req), req.params.id as string, req.body, filesOf(req))));
    },

    async setStatus(req: Request, res: Response) {
        res.json(serialize(await userSetTicketStatusUsecase(requester(req), req.params.id as string, req.body)));
    },

    async attachment(req: Request, res: Response) {
        const file = await downloadTicketAttachmentUsecase(requester(req), req.params.attachmentId as string);
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader("Content-Length", String(file.size));
        // ?download=1 força o download; sem ele, imagens e PDF abrem no navegador.
        const disposition = req.query.download ? "attachment" : "inline";
        res.setHeader("Content-Disposition", `${disposition}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, no-store");
        file.stream.on("error", (err) => {
            console.error("[support] falha ao ler anexo:", err.message);
            res.destroy();
        });
        file.stream.pipe(res);
    },

    // ---------- Admin ----------

    async adminList(req: Request, res: Response) {
        res.json(serialize(await adminListTicketsUsecase(req.query)));
    },

    async adminUpdate(req: Request, res: Response) {
        res.json(serialize(await adminUpdateTicketUsecase(requester(req), req.params.id as string, req.body)));
    },
};
