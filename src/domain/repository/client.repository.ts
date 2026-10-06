import type { Client } from "../../../generated/prisma/client";

export interface CreateClientInput {
    id?: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    cep?: string | null;
    address?: string | null;
    addressNumber?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    cpf?: string | null;
    cnpj?: string | null;
    laborRate?: number;
    discount?: number;
    increase?: number;
}

export type UpdateClientInput = Partial<CreateClientInput>;

export interface ClientRepository {
    findAllByUser(userId: string): Promise<Client[]>;
    findById(id: string, userId: string): Promise<Client | null>;
    create(userId: string, data: CreateClientInput): Promise<Client>;
    update(id: string, userId: string, data: UpdateClientInput): Promise<Client>;
    softDelete(id: string, userId: string): Promise<void>;
}
