import type { NextFunction, Request, Response } from "express";
import multer from "multer";

export const uploadLogo = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            cb(new Error("Arquivo precisa ser uma imagem."));
            return;
        }
        cb(null, true);
    },
}).single("file");

// Anexos de ticket de suporte: até 5 arquivos de 10 MB — imagens, PDF, texto, planilhas,
// documentos do Office e ZIP. Nada executável.
export const TICKET_ALLOWED_MIME = new Set([
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-zip-compressed",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export const uploadTicketFiles = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    fileFilter: (_req, file, cb) => {
        // SVG fica de fora: pode carregar script e os anexos abrem inline no navegador.
        const media = (file.mimetype.startsWith("image/") && file.mimetype !== "image/svg+xml") || file.mimetype.startsWith("video/");
        if (media || TICKET_ALLOWED_MIME.has(file.mimetype)) {
            cb(null, true);
            return;
        }
        cb(new Error(`Tipo de arquivo não permitido: ${file.originalname}. Envie imagens, vídeos, PDF, texto, planilhas, documentos ou ZIP.`));
    },
}).array("files", 5);

// Traduz os erros do multer (tamanho, quantidade) para mensagens em português.
export function withTicketFiles(req: Request, res: Response, next: NextFunction) {
    uploadTicketFiles(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
            const msg =
                err.code === "LIMIT_FILE_SIZE"
                    ? "Cada arquivo pode ter no máximo 10 MB."
                    : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
                      ? "Envie no máximo 5 arquivos por vez."
                      : "Não foi possível receber os arquivos.";
            res.status(400).json({ error: msg });
            return;
        }
        next(err);
    });
}
