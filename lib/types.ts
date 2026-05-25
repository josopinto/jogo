// Tipos de dados do BI CCO VIA Group

export type RouteStatus = 'Encerrado' | 'Com Pendências' | 'Em execução' | 'Previsto' | 'Regresso'
export type KmStatus = 'OK' | 'Rodado a mais' | 'Rodado a menos'
export type CellNumber = 1 | 2 | 3
export type FilterScope = 'all' | 'pending' | 'closed'

export interface Route {
  id: string
  celula: CellNumber
  planta: string
  roteiro: string
  status: RouteStatus
  eventos: string
  placa: string
  kmStatus: KmStatus
  dataInicioManual: string | null
  dataTerminoManual: string | null
  inicio: string | null
  termino: string | null
  observacao: string
  litrosColetados: number
  litrosDescarregados: number
  kmPrevisto: number
  kmDiferenca: number
  kmPrevistoTotal: number
  kmRodadoTotal: number
  kmRodado: number
  kmFechamento: number
  kmRecebido: number
  // Novos campos de controle
  dataRota: string | null // DD/MM/YYYY formatado
  dataAuditoriaInicio: string | null
  dataAuditoriaFim: string | null
  uploadId: string
  nomeArquivo: string
}

export interface PlantSummary {
  planta: string
  celula: CellNumber
  totalRotas: number
  encerradas: number
  pendencias: number
  emExecucao: number
  previsto: number
  regresso: number
  regressoAntigo: number
  percentualEncerramento: number
  kmOk: number
  kmMais: number
  kmMenos: number
  kmErrado: number
  litrosColetados: number
  litrosDescarregados: number
  semContraLeite: number
  totalCritico: number
  percentualCritico: number
}

export interface CellSummary {
  celula: CellNumber
  totalRotas: number
  encerradas: number
  pendencias: number
  emExecucao: number
  previsto: number
  regresso: number
  regressoAntigo: number
  percentualEncerramento: number
  kmOk: number
  kmMais: number
  kmMenos: number
  kmErrado: number
  litrosColetados: number
  semContraLeite: number
  totalCritico: number
  percentualCritico: number
  plantas: PlantSummary[]
}

export interface GlobalSummary {
  totalRotas: number
  encerradas: number
  pendencias: number
  emExecucao: number
  previsto: number
  regresso: number
  regressoAntigo: number
  percentualEncerramento: number
  kmOk: number
  kmMais: number
  kmMenos: number
  litrosColetados: number
  semContraLeite: number
  kmIncorreto: number
  totalCritico: number
  percentualCritico: number
  cells: CellSummary[]
}

export type ActionStatus = 'Nao iniciado' | 'Em andamento' | 'Aguardando operacao' | 'Aguardando suporte' | 'Concluido' | 'Atrasado' | 'Cancelado'
export type ActionPriority = 'Alta' | 'Media' | 'Baixa'

export interface ActionPlan {
  id: string
  auditoria: string
  acao: string
  responsavel: string
  celula: CellNumber | 'Todas'
  planta: string
  prioridade: ActionPriority
  status: ActionStatus
  prazo: string
  dataCriacao: string
  dataConclusao: string | null
  motivo: string
  impactoEsperado: string
  observacao: string
  evidencia: string
  proximoPasso: string
}

// Legacy type for backward compatibility
export interface LegacyActionPlan {
  id: string
  indicador: string
  acao: string
  responsavel: string
  frequencia: string
  status: 'Ativo' | 'Em andamento' | 'Concluído'
}

export interface AppState {
  routes: Route[]
  lastUpload: string | null
  referenceDate: string | null
  auditPeriod: {
    start: string | null
    end: string | null
  }
  indicatorScope: FilterScope
  uploadSummary: {
    cell1: number
    cell2: number
    cell3: number
  }
}

// Mapeamento de células para operações/plantas
export const CELL_OPERATIONS: Record<CellNumber, string[]> = {
  1: [
    'DPA - ARARAS',
    'ITALAC - PASSO FUNDO',
    'LACTALIS - BARRA MANSA',
    'LACTALIS - BOM CONSELHO',
    'NESTLE - MONTES CLAROS',
    'PIRACANJUBA - CURVELO',
    'PIRACANJUBA - PALMINOPOLIS',
    'PIRACANJUBA - TRES RIOS',
    'VERDE CAMPO - LAVRAS MG'
  ],
  2: [
    'BRQ FOODS - TENENTE PORTELA',
    'DANONE - BOA ESPERANÇA',
    'DANONE - POÇOS DE CALDAS',
    'DEALE - ALMIRANTE TAMANDARÉ',
    'DEALE - ARATIBA',
    'DEALE - CATUIPE',
    'ITALAC - JUVINOPOLIS',
    'LATICINIOS CATUPIRY - DOVERLANDIA',
    'LATICINIOS CATUPIRY - SANTA VITÓRIA',
    'LATPASSOS - TRES PASSOS'
  ],
  3: [
    'CBL - ALVOAR',
    'CCPR - CAMPINA VERDE',
    'CCPR - GOIANIA',
    'CCPR - POMPEU',
    'CCPR - UBERLANDIA',
    'CCPR - UNAI',
    'ITALAC - CRISSIUMAL',
    'LACTALIS - ARAÇATUBA',
    'LATICINIOS - POLENGHI'
  ]
}

// Palavras-chave para análise de motivos de atraso
export const DELAY_KEYWORDS = [
  'SINAL',
  'PLACA ERRADA',
  'MANUTENÇÃO',
  'N COLETA',
  'GRUPO',
  'REPORT'
]
