import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD).");

export const listTasksSchema = z.object({ date: day });

export const createTaskSchema = z.object({
    title: z.string().trim().min(1, "Descreva a tarefa.").max(200),
    date: day,
    time: z
        .string()
        .regex(/^\d{2}:\d{2}$/, "Horário inválido (use HH:MM).")
        .nullable()
        .optional(),
    category: z.string().trim().max(60).nullable().optional(),
});

export const updateTaskSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    time: createTaskSchema.shape.time,
    category: createTaskSchema.shape.category,
    done: z.boolean().optional(),
});
