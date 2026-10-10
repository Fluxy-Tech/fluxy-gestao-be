// Custo padrão de um serviço cadastrado sem preço de custo: 40% do preço de venda
// (o valor de venda menos 60%), referência de mercado para o custo de um serviço.
export const DEFAULT_COST_RATIO = 0.4;

export function defaultCostPrice(salePrice: number | undefined): number {
    return Math.round((salePrice ?? 0) * DEFAULT_COST_RATIO * 100) / 100;
}
