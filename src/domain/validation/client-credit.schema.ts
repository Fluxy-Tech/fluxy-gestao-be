import { z } from "zod";

export const manualCreditSchema = z.object({
    type: z.enum(["IN", "OUT"]),
    amount: z.number().positive("Informe um valor maior que zero."),
    description: z.string().trim().max(200).nullable().optional(),
    affectsCash: z.boolean(),
});
