import type { Service } from "../../../generated/prisma/client";

export interface CreateServiceInput {
    id?: string;
    name: string;
    description?: string | null;
    category?: string | null;
    costPrice?: number | null;
    salePrice?: number;
    active?: boolean;
    showInCatalog?: boolean;
}

export type UpdateServiceInput = Partial<CreateServiceInput>;

// O que chega ao banco: o custo já resolvido (sem null).
export type ServiceData = Omit<CreateServiceInput, "costPrice"> & { costPrice?: number };

export interface ServiceRepository {
    findAllByUser(userId: string): Promise<Service[]>;
    findActiveByUser(userId: string): Promise<Service[]>;
    findCatalogVisibleByUser(userId: string): Promise<Service[]>;
    findById(id: string, userId: string): Promise<Service | null>;
    create(userId: string, data: ServiceData): Promise<Service>;
    update(id: string, userId: string, data: Partial<ServiceData>): Promise<Service>;
    softDelete(id: string, userId: string): Promise<void>;
}
