import path from "node:path";
import type { Request, Response } from "express";
import { userRepository } from "../../infrastructure/repositories/user.repository";
import { updateProfileUsecase } from "../../domain/user/update-profile.usecase";
import { updateCompanyUsecase } from "../../domain/user/update-company.usecase";
import { updateBrandUsecase } from "../../domain/user/update-brand.usecase";
import { uploadToS3 } from "../../infrastructure/storage/s3-storage";
import { serialize } from "../serialize";
import { exportUserDataUsecase } from "../../application/usecases/user/export-user-data.usecase";
import { updatePreferencesUsecase } from "../../domain/user/update-preferences.usecase";
import { auditLogRepository } from "../../infrastructure/repositories/audit-log.repository";
import { planRepository } from "../../infrastructure/repositories/plan.repository";
import { changeMyPlanUsecase, getMyPlanUsecase } from "../../application/usecases/plan/plan.usecases";

export const userController = {
    async exportData(req: Request, res: Response) {
        const data = await exportUserDataUsecase(req.userId);
        res.json(serialize(data));
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
};
