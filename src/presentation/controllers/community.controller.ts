import type { Request, Response } from "express";
import { auditLogRepository } from "../../infrastructure/repositories/audit-log.repository";
import {
    adminCreateAnnouncementUsecase,
    adminDeleteAnnouncementUsecase,
    adminListAnnouncementsUsecase,
    adminUpdateAnnouncementUsecase,
    listAnnouncementsForUserUsecase,
    markAnnouncementsReadUsecase,
} from "../../application/usecases/announcement/announcement.usecases";
import { serialize } from "../serialize";

export const communityController = {
    async announcements(req: Request, res: Response) {
        res.json(serialize(await listAnnouncementsForUserUsecase(req.userId)));
    },

    async markRead(req: Request, res: Response) {
        res.json(await markAnnouncementsReadUsecase(req.userId, req.body));
    },

    // ---------- Admin ----------

    async adminList(_req: Request, res: Response) {
        res.json(serialize(await adminListAnnouncementsUsecase()));
    },

    async adminCreate(req: Request, res: Response) {
        res.status(201).json(serialize(await adminCreateAnnouncementUsecase(auditLogRepository, req.userId, req.body)));
    },

    async adminUpdate(req: Request, res: Response) {
        res.json(serialize(await adminUpdateAnnouncementUsecase(auditLogRepository, req.userId, req.params.id as string, req.body)));
    },

    async adminDelete(req: Request, res: Response) {
        await adminDeleteAnnouncementUsecase(auditLogRepository, req.userId, req.params.id as string);
        res.json({ ok: true });
    },
};
