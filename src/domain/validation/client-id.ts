import { z } from "zod";

// ID gerado pelo app mobile ao criar um registro sem internet. O app grava o registro no
// aparelho com esse ID e, ao sincronizar, manda a mesma criação para o servidor com ele —
// assim o que foi criado offline (ex.: cliente + OS desse cliente) continua ligado.
// Opcional: a web não manda e o banco gera o ID (cuid) como sempre.
export const clientIdSchema = z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,64}$/, "ID inválido.")
    .optional();
