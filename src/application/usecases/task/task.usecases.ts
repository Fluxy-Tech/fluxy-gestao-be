import { prisma } from "../../../infrastructure/database/prisma";
import { createTaskSchema, listTasksSchema, updateTaskSchema } from "../../../domain/validation/task.schema";

// Tarefas do dia (dashboard): lembretes simples por dia. O dia chega como "AAAA-MM-DD" e é
// gravado numa coluna DATE (sem horário), então não depende de fuso.
const asDate = (day: string) => new Date(`${day}T00:00:00.000Z`);

export function listTasksUsecase(userId: string, query: unknown) {
    const { date } = listTasksSchema.parse(query);
    return prisma.task.findMany({
        where: { userId, date: asDate(date) },
        // Pendentes primeiro, depois por horário (sem horário por último) e criação.
        orderBy: [{ doneAt: { sort: "asc", nulls: "first" } }, { time: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    });
}

export function createTaskUsecase(userId: string, input: unknown) {
    const data = createTaskSchema.parse(input);
    return prisma.task.create({
        data: {
            userId,
            title: data.title,
            date: asDate(data.date),
            time: data.time || null,
            category: data.category || null,
        },
    });
}

async function findOwn(userId: string, id: string) {
    const task = await prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new Error("Tarefa não encontrada.");
    return task;
}

export async function updateTaskUsecase(userId: string, id: string, input: unknown) {
    const { done, ...data } = updateTaskSchema.parse(input);
    const task = await findOwn(userId, id);
    return prisma.task.update({
        where: { id: task.id },
        data: {
            ...data,
            ...(done === undefined ? {} : { doneAt: done ? new Date() : null }),
        },
    });
}

export async function deleteTaskUsecase(userId: string, id: string) {
    const task = await findOwn(userId, id);
    await prisma.task.delete({ where: { id: task.id } });
}
