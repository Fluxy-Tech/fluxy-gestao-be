import type { Request, Response } from "express";
import { clientRepository } from "../../infrastructure/repositories/client.repository";
import { serviceRepository } from "../../infrastructure/repositories/service.repository";
import { userRepository } from "../../infrastructure/repositories/user.repository";
import { getPublicCatalogUsecase } from "../../application/usecases/public/get-public-catalog.usecase";
import { serialize } from "../serialize";
import { planRepository } from "../../infrastructure/repositories/plan.repository";
import { listActivePlansUsecase } from "../../application/usecases/plan/plan.usecases";
import { BUSINESS_SEGMENTS } from "../../domain/business-segments";

export const publicController = {
    async catalog(req: Request, res: Response) {
        const data = await getPublicCatalogUsecase(clientRepository, serviceRepository, userRepository, req.query);
        res.json(serialize(data));
    },

    // Planos disponíveis — usados na landing page e na escolha de plano do cadastro.
    async plans(_req: Request, res: Response) {
        res.json(serialize(await listActivePlansUsecase(planRepository)));
    },

    // Ramos de atuação para a busca de "Categoria do negócio" nas Configurações.
    async businessSegments(_req: Request, res: Response) {
        res.json(BUSINESS_SEGMENTS);
    },
};
