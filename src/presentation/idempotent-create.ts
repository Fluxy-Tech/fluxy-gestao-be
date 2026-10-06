import type { NextFunction, Request, Response } from "express";
import { prisma } from "../infrastructure/database/prisma";
import { serialize } from "./serialize";

type Model = "client" | "service" | "order" | "serviceInvoice" | "expense" | "debt";

// O app mobile reenvia as criações feitas offline com o ID que gerou no aparelho (ver
// domain/validation/client-id.ts). Se a conexão cair depois do servidor gravar mas antes
// da resposta chegar, o app manda a mesma criação de novo: aqui ela vira um no-op que
// devolve o registro já existente, em vez de falhar por ID duplicado ou criar em dobro.
export function idempotentCreate(model: Model) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const id = req.body?.id;
        if (typeof id !== "string" || !id) return next();
        try {
            const existing = await (prisma[model] as any).findUnique({ where: { id } });
            if (!existing) return next();
            if (existing.userId !== req.userId) {
                res.status(409).json({ error: "Este ID já está em uso." });
                return;
            }
            res.status(200).json(serialize(existing));
        } catch (err) {
            next(err);
        }
    };
}
