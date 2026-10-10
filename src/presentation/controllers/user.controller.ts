import path from "node:path";
import type { Request, Response } from "express";
import { userRepository } from "../../infrastructure/repositories/user.repository";
import { updateProfileUsecase } from "../../domain/user/update-profile.usecase";
import { updateCompanyUsecase } from "../../domain/user/update-company.usecase";
import { updateBrandUsecase } from "../../domain/user/update-brand.usecase";
import { deleteFromS3, uploadToS3 } from "../../infrastructure/storage/s3-storage";
import { serialize } from "../serialize";
import { prisma } from "../../infrastructure/database/prisma";
import { exportUserDataUsecase } from "../../application/usecases/user/export-user-data.usecase";
import { importDeviceDataUsecase } from "../../application/usecases/user/import-device-data.usecase";
import { purgeUserDataUsecase } from "../../application/usecases/user/purge-user-data.usecase";
import { updatePreferencesUsecase } from "../../domain/user/update-preferences.usecase";
import { auditLogRepository } from "../../infrastructure/repositories/audit-log.repository";
import { planRepository } from "../../infrastructure/repositories/plan.repository";
import { changeMyPlanUsecase, getMyPlanUsecase } from "../../application/usecases/plan/plan.usecases";
import { deleteOwnAccountUsecase } from "../../application/usecases/user/delete-own-account.usecase";
import { invoiceRepository } from "../../infrastructure/repositories/invoice.repository";

export const userController = {
    async exportData(req: Request, res: Response) {
        const data = await exportUserDataUsecase(req.userId);
        res.json(serialize(data));
    },

    async importDevice(req: Request, res: Response) {
        const counts = await importDeviceDataUsecase(auditLogRepository, req.userId, req.body);
        res.json({ ok: true, counts });
    },

    async purgeData(req: Request, res: Response) {
        const deleted = await purgeUserDataUsecase(auditLogRepository, req.userId, req.body);
        res.json({ ok: true, deleted });
    },

    async deleteAccount(req: Request, res: Response) {
        const deleted = await deleteOwnAccountUsecase(userRepository, auditLogRepository, invoiceRepository, req.userId, req.body);
        res.json({ ok: true, deleted });
    },

    async me(req: Request, res: Response) {
        const user = await userRepository.findById(req.userId);
        res.json(serialize(user));
    },

    async updateProfile(req: Request, res: Response) {
        const user = await updateProfileUsecase(userRepository, req.userId, req.body);
        res.json(serialize(user));
    },

    async updateCompany(req: Request, res: Response) {
        const user = await updateCompanyUsecase(userRepository, req.userId, req.body);
        res.json(serialize(user));
    },

    async updatePreferences(req: Request, res: Response) {
        const user = await updatePreferencesUsecase(userRepository, req.userId, req.body);
        res.json(serialize(user));
    },

    // Últimas ações da própria conta no log de auditoria (sem login/logout).
    async activity(req: Request, res: Response) {
        const logs = await prisma.auditLog.findMany({
            where: { userId: req.userId, type: { notIn: ["LOGIN", "LOGOUT"] } },
            select: { id: true, about: true, type: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 6,
        });
        res.json(serialize(logs));
    },

    async myPlan(req: Request, res: Response) {
        res.json(serialize(await getMyPlanUsecase(planRepository, userRepository, req.userId)));
    },

    async changeMyPlan(req: Request, res: Response) {
        const user = await changeMyPlanUsecase(planRepository, userRepository, auditLogRepository, req.userId, req.body);
        res.json(serialize(user));
    },

    async updateBrand(req: Request, res: Response) {
        const user = await updateBrandUsecase(userRepository, req.userId, req.body);
        res.json(serialize(user));
    },

    async uploadLogo(req: Request, res: Response) {
        if (!req.file) {
            res.status(400).json({ error: "Nenhum arquivo enviado." });
            return;
        }
        const ext = path.extname(req.file.originalname) || ".png";
        const prefix = process.env.SEAWEEDFS_S3_PREFIX ?? "imagensperfil";
        const key = `${prefix}/${req.userId}/logo-${Date.now()}${ext}`;
        const logoUrl = await uploadToS3(key, req.file.buffer, req.file.mimetype);
        const user = await updateBrandUsecase(userRepository, req.userId, { logoUrl });
        res.json(serialize(user));
    },

    async uploadAvatar(req: Request, res: Response) {
        if (!req.file) {
            res.status(400).json({ error: "Nenhum arquivo enviado." });
            return;
        }
        const previous = await userRepository.findById(req.userId);
        const ext = path.extname(req.file.originalname) || ".png";
        const prefix = process.env.SEAWEEDFS_S3_PREFIX ?? "imagensperfil";
        const key = `${prefix}/${req.userId}/avatar-${Date.now()}${ext}`;
        const avatarUrl = await uploadToS3(key, req.file.buffer, req.file.mimetype);
        const user = await userRepository.updateProfile(req.userId, { avatarUrl });
        await deleteStoredFile(previous?.avatarUrl);
        res.json(serialize(user));
    },

    async removeAvatar(req: Request, res: Response) {
        const previous = await userRepository.findById(req.userId);
        const user = await userRepository.updateProfile(req.userId, { avatarUrl: null });
        await deleteStoredFile(previous?.avatarUrl);
        res.json(serialize(user));
    },
};

// Apaga do storage um arquivo enviado por nós (URL sob UPLOAD_PUBLIC_BASE_URL), como a foto
// antiga do perfil ao trocar/remover. Falha aqui não desfaz a troca — só fica o arquivo órfão.
async function deleteStoredFile(url: string | null | undefined) {
    const publicBase = process.env.UPLOAD_PUBLIC_BASE_URL;
    if (!publicBase || !url?.startsWith(`${publicBase}/`)) return;
    try {
        await deleteFromS3([url.slice(publicBase.length + 1)]);
    } catch (err) {
        console.error("[storage] falha ao apagar arquivo antigo:", (err as Error).message);
    }
}
