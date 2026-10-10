import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { asyncHandler } from "../error-handler";
import { uploadLogo } from "../../infrastructure/storage/upload.middleware";

export const userRoutes = Router();

userRoutes.get("/me", asyncHandler(userController.me));
// Sem requireActiveBilling (ver index.ts): quem está com a cobrança bloqueada também
// precisa conseguir levar os próprios dados para o app.
userRoutes.get("/me/export", asyncHandler(userController.exportData));
// App mobile: envia a base que estava só no aparelho (substitui a da conta). Sem
// requireActiveBilling, como o export — os dados são do usuário mesmo com a conta bloqueada.
userRoutes.post("/me/import-device", asyncHandler(userController.importDevice));
userRoutes.post("/me/purge-data", asyncHandler(userController.purgeData));
// Exclusão da própria conta com todos os dados (Perfil > Excluir conta). Sem
// requireActiveBilling: o direito de excluir vale mesmo com a conta bloqueada.
userRoutes.post("/me/delete-account", asyncHandler(userController.deleteAccount));
userRoutes.patch("/me/profile", asyncHandler(userController.updateProfile));
userRoutes.patch("/me/company", asyncHandler(userController.updateCompany));
userRoutes.patch("/me/brand", asyncHandler(userController.updateBrand));
userRoutes.patch("/me/preferences", asyncHandler(userController.updatePreferences));
userRoutes.get("/me/plan", asyncHandler(userController.myPlan));
// Atividade recente do dashboard: últimas ações da conta (log de auditoria).
userRoutes.get("/me/activity", asyncHandler(userController.activity));
userRoutes.patch("/me/plan", asyncHandler(userController.changeMyPlan));
userRoutes.post("/me/logo", uploadLogo, asyncHandler(userController.uploadLogo));
// Foto do perfil: mesmas regras de arquivo da logo (imagem, até 2 MB).
userRoutes.post("/me/avatar", uploadLogo, asyncHandler(userController.uploadAvatar));
userRoutes.delete("/me/avatar", asyncHandler(userController.removeAvatar));
