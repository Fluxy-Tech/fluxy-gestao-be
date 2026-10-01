import type { BusinessCategory } from "../../generated/prisma/client";

// Ramos de atuação que o usuário escolhe nas Configurações (com busca). Cada um é mapeado
// para um dos comportamentos do app (BusinessCategory):
// - HAIRDRESSER: atendimento com agenda de horário (data + hora na OS, calendário);
// - PETSHOP: agenda de horário para pet shops / veterinária;
// - LAB: sem agenda, mas a OS coleta o nome do paciente (laboratórios);
// - STANDARD: ordem de serviço tradicional, só com data de entrega.
export interface BusinessSegment {
    key: string;
    label: string;
    category: BusinessCategory;
}

export const BUSINESS_SEGMENTS: BusinessSegment[] = [
    // Beleza e bem-estar (agenda)
    { key: "salao-de-beleza", label: "Salão de beleza", category: "HAIRDRESSER" },
    { key: "barbearia", label: "Barbearia", category: "HAIRDRESSER" },
    { key: "cabeleireiro", label: "Cabeleireiro(a)", category: "HAIRDRESSER" },
    { key: "manicure-pedicure", label: "Manicure e pedicure", category: "HAIRDRESSER" },
    { key: "nail-designer", label: "Nail designer", category: "HAIRDRESSER" },
    { key: "design-de-sobrancelhas", label: "Design de sobrancelhas", category: "HAIRDRESSER" },
    { key: "extensao-de-cilios", label: "Extensão de cílios", category: "HAIRDRESSER" },
    { key: "maquiagem", label: "Maquiagem", category: "HAIRDRESSER" },
    { key: "depilacao", label: "Depilação", category: "HAIRDRESSER" },
    { key: "estetica", label: "Clínica de estética", category: "HAIRDRESSER" },
    { key: "spa-massoterapia", label: "Spa e massoterapia", category: "HAIRDRESSER" },
    { key: "estudio-de-tatuagem", label: "Estúdio de tatuagem e piercing", category: "HAIRDRESSER" },
    { key: "podologia", label: "Podologia", category: "HAIRDRESSER" },

    // Saúde (agenda)
    { key: "clinica-odontologica", label: "Clínica odontológica", category: "HAIRDRESSER" },
    { key: "clinica-medica", label: "Clínica médica / consultório", category: "HAIRDRESSER" },
    { key: "fisioterapia", label: "Fisioterapia", category: "HAIRDRESSER" },
    { key: "psicologia", label: "Psicologia / terapia", category: "HAIRDRESSER" },
    { key: "nutricao", label: "Nutrição", category: "HAIRDRESSER" },
    { key: "fonoaudiologia", label: "Fonoaudiologia", category: "HAIRDRESSER" },
    { key: "pilates", label: "Pilates", category: "HAIRDRESSER" },
    { key: "personal-trainer", label: "Personal trainer", category: "HAIRDRESSER" },
    { key: "academia", label: "Academia / estúdio fitness", category: "HAIRDRESSER" },

    // Pets (agenda)
    { key: "pet-shop", label: "Pet shop", category: "PETSHOP" },
    { key: "banho-e-tosa", label: "Banho e tosa", category: "PETSHOP" },
    { key: "clinica-veterinaria", label: "Clínica veterinária", category: "PETSHOP" },
    { key: "adestramento", label: "Adestramento", category: "PETSHOP" },
    { key: "hotel-creche-pet", label: "Hotel / creche para pets", category: "PETSHOP" },

    // Laboratórios (nome do paciente)
    { key: "laboratorio-protese-dentaria", label: "Laboratório de prótese dentária", category: "LAB" },
    { key: "laboratorio-analises-clinicas", label: "Laboratório de análises clínicas", category: "LAB" },
    { key: "laboratorio-optico", label: "Laboratório óptico", category: "LAB" },
    { key: "ortopedia-tecnica", label: "Ortopedia técnica / órteses e próteses", category: "LAB" },

    // Serviços automotivos
    { key: "mecanica-automotiva", label: "Mecânica automotiva", category: "STANDARD" },
    { key: "mecanica-de-motos", label: "Mecânica de motos", category: "STANDARD" },
    { key: "auto-eletrica", label: "Auto elétrica", category: "STANDARD" },
    { key: "funilaria-e-pintura", label: "Funilaria e pintura", category: "STANDARD" },
    { key: "estetica-automotiva", label: "Estética automotiva / lava-rápido", category: "STANDARD" },
    { key: "borracharia", label: "Borracharia", category: "STANDARD" },
    { key: "autopecas", label: "Autopeças", category: "STANDARD" },
    { key: "som-e-acessorios-automotivos", label: "Som e acessórios automotivos", category: "STANDARD" },
    { key: "insulfilm", label: "Insulfilm / película", category: "STANDARD" },

    // Assistência técnica e manutenção
    { key: "assistencia-tecnica-celular", label: "Assistência técnica de celulares", category: "STANDARD" },
    { key: "assistencia-tecnica-informatica", label: "Assistência técnica de informática", category: "STANDARD" },
    { key: "assistencia-tecnica-eletrodomesticos", label: "Assistência técnica de eletrodomésticos", category: "STANDARD" },
    { key: "refrigeracao-ar-condicionado", label: "Refrigeração e ar-condicionado", category: "STANDARD" },
    { key: "eletricista", label: "Elétrica / eletricista", category: "STANDARD" },
    { key: "encanador", label: "Hidráulica / encanador", category: "STANDARD" },
    { key: "chaveiro", label: "Chaveiro", category: "STANDARD" },
    { key: "relojoaria", label: "Relojoaria", category: "STANDARD" },
    { key: "sapataria", label: "Sapataria", category: "STANDARD" },
    { key: "costura-ajustes", label: "Costura e ajustes / ateliê", category: "STANDARD" },
    { key: "tapecaria-estofados", label: "Tapeçaria e estofados", category: "STANDARD" },
    { key: "montagem-de-moveis", label: "Montagem de móveis", category: "STANDARD" },
    { key: "dedetizacao", label: "Dedetização e controle de pragas", category: "STANDARD" },
    { key: "limpeza", label: "Limpeza residencial e comercial", category: "STANDARD" },
    { key: "lavanderia", label: "Lavanderia", category: "STANDARD" },
    { key: "jardinagem-paisagismo", label: "Jardinagem e paisagismo", category: "STANDARD" },
    { key: "piscinas", label: "Manutenção de piscinas", category: "STANDARD" },
    { key: "seguranca-eletronica", label: "Segurança eletrônica / CFTV", category: "STANDARD" },

    // Construção e reformas
    { key: "reformas-construcao", label: "Reformas e construção", category: "STANDARD" },
    { key: "marcenaria", label: "Marcenaria", category: "STANDARD" },
    { key: "serralheria", label: "Serralheria", category: "STANDARD" },
    { key: "vidracaria", label: "Vidraçaria", category: "STANDARD" },
    { key: "marmoraria", label: "Marmoraria", category: "STANDARD" },
    { key: "pintura-predial", label: "Pintura residencial e predial", category: "STANDARD" },
    { key: "gesso-drywall", label: "Gesso e drywall", category: "STANDARD" },
    { key: "energia-solar", label: "Energia solar", category: "STANDARD" },
    { key: "arquitetura-engenharia", label: "Arquitetura e engenharia", category: "STANDARD" },

    // Comunicação, eventos e criativos
    { key: "grafica", label: "Gráfica", category: "STANDARD" },
    { key: "comunicacao-visual", label: "Comunicação visual / letreiros", category: "STANDARD" },
    { key: "personalizados-brindes", label: "Personalizados e brindes", category: "STANDARD" },
    { key: "fotografia", label: "Fotografia", category: "HAIRDRESSER" },
    { key: "video-filmagem", label: "Vídeo e filmagem", category: "STANDARD" },
    { key: "eventos-buffet", label: "Eventos e buffet", category: "STANDARD" },
    { key: "decoracao-festas", label: "Decoração de festas", category: "STANDARD" },
    { key: "confeitaria", label: "Confeitaria / doces sob encomenda", category: "STANDARD" },
    { key: "floricultura", label: "Floricultura", category: "STANDARD" },

    // Serviços profissionais e tecnologia
    { key: "agencia-de-marketing", label: "Agência de marketing", category: "STANDARD" },
    { key: "desenvolvimento-software", label: "Desenvolvimento de software / TI", category: "STANDARD" },
    { key: "suporte-de-ti", label: "Suporte de TI", category: "STANDARD" },
    { key: "contabilidade", label: "Contabilidade", category: "STANDARD" },
    { key: "advocacia", label: "Advocacia", category: "STANDARD" },
    { key: "consultoria", label: "Consultoria", category: "STANDARD" },
    { key: "despachante", label: "Despachante", category: "STANDARD" },
    { key: "imobiliaria", label: "Imobiliária", category: "STANDARD" },
    { key: "escola-cursos", label: "Escola / cursos / aulas particulares", category: "HAIRDRESSER" },
    { key: "otica", label: "Ótica", category: "STANDARD" },
    { key: "transporte-fretes", label: "Transporte e fretes", category: "STANDARD" },
    { key: "mudancas", label: "Mudanças", category: "STANDARD" },

    { key: "outros", label: "Outros", category: "STANDARD" },
];

const BY_KEY = new Map(BUSINESS_SEGMENTS.map((s) => [s.key, s]));

export function findBusinessSegment(key: string): BusinessSegment | undefined {
    return BY_KEY.get(key);
}
