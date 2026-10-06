import type { Service } from "../../../generated/prisma/client";

export interface CreateServiceInput {
    id?: string;
    name: string;
    description?: string | null;
    category?: string | null;
    costPrice?: number;
    salePrice?: number;
    active?: boolean;
    showInCatalog?: boolean;
}

export type UpdateServiceInput = Partial<CreateServiceInput>;

export interface ServiceRepository {
    findAllByUser(userId: string): Promise<Service[]>;
    findActiveByUser(userId: string): Promise<Service[]>;
    findCatalogVisibleByUser(userId: string): Promise<Service[]>;
    findById(id: string, userId: string): Promise<Service | null>;
    create(userId: string, data: CreateServiceInput): Promise<Service>;
    update(id: string, userId: string, data: UpdateServiceInput): Promise<Service>;
    softDelete(id: string, userId: string): Promise<void>;
}
