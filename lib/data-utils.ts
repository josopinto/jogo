import { type Route, type PlantSummary, type CellSummary, type GlobalSummary, type CellNumber, type FilterScope } from './types'

// --- FUNÇÕES DE APOIO E PADRONIZAÇÃO DE DATAS ---

/**
 * Converte qualquer valor de data para string ISO (YYYY-MM-DD)
 * Suporta: DD/MM/YYYY, YYYY-MM-DD, Date object, número serial Excel
 */
export function normalizeDateToISO(input: any): string | null {
  if (!input) return null
  
  let date: Date | null = null

  if (input instanceof Date) {
    date = input
  } else if (typeof input === 'number') {
    // Excel Serial Date
    date = new Date(Math.round((input - 25569) * 86400 * 1000))
  } else if (typeof input === 'string') {
    const s = input.trim()
    if (!s) return null

    // Tentar DD/MM/YYYY ou DD/MM/YYYY HH:mm...
    if (s.includes('/')) {
      const parts = s.split(' ')[0].split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        let year = parseInt(parts[2], 10)
        if (year < 100) year += 2000
        date = new Date(year, month, day)
      }
    } 
    // Tentar YYYY-MM-DD
    else if (s.includes('-')) {
      const parts = s.split(' ')[0].split('-')
      if (parts.length === 3) {
        if (parts[0].length === 4) { // YYYY-MM-DD
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        } else { // DD-MM-YYYY
          date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
        }
      }
    }
    
    // Fallback parser nativo
    if (!date || isNaN(date.getTime())) {
      date = new Date(s)
    }
  }

  if (!date || isNaN(date.getTime())) return null

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  
  return `${y}-${m}-${d}`
}

/**
 * Formata data ISO para padrão brasileiro DD/MM/YYYY
 */
export function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Sem data'
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate // Provavelmente já formatado ou inválido
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

/**
 * Converte string de data para objeto Date de forma segura para comparacoes
 */
export function parseDateSafe(input: any): Date | null {
  const iso = normalizeDateToISO(input)
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// --- REGRAS DE NEGÓCIO CENTRALIZADAS ---

export function isRegressoAntigo(route: Route, referenceDateISO: string | null): boolean {
  if (route.status !== 'Regresso') return false
  if (!referenceDateISO) return false
  
  const routeDateISO = normalizeDateToISO(route.dataRota || route.inicio)
  if (!routeDateISO) return false
  
  return routeDateISO !== referenceDateISO
}

export function isPendente(route: Route, referenceDateISO: string | null): boolean {
  if (['Em execução', 'Com Pendências', 'Previsto'].includes(route.status)) return true
  if (isRegressoAntigo(route, referenceDateISO)) return true
  return false
}

export function isSemContraLeite(route: Route): boolean {
  // Quando o export do KMM não traz litros, o valor é null => indicador N/A (não conta)
  if (route.litrosDescarregados === null || route.litrosDescarregados === undefined) return false
  return Number(route.litrosDescarregados) === 0
}

export function isKmStatusIncorreto(route: Route): boolean {
  return route.kmStatus === 'Rodado a mais' || route.kmStatus === 'Rodado a menos'
}

// --- FILTROS ---

export function filterRoutesByAuditPeriod(routes: Route[], startISO: string | null, endISO: string | null): Route[] {
  if (!Array.isArray(routes)) return []
  if (!startISO && !endISO) return routes
  
  return routes.filter(r => {
    // Priorizar campos dataAuditoriaInicio/Fim
    const rStart = r.dataAuditoriaInicio ? normalizeDateToISO(r.dataAuditoriaInicio) : null
    const rEnd = r.dataAuditoriaFim ? normalizeDateToISO(r.dataAuditoriaFim) : null

    // Se a rota não tem data de auditoria, deixamos passar (defensivo para builds)
    if (!rStart && !rEnd) return true

    if (startISO && rStart && rStart < startISO) return false
    if (endISO && rEnd && rEnd > endISO) return false
    
    return true
  })
}

export function applyStatusScope(routes: Route[], scope: FilterScope, referenceDateISO: string | null): Route[] {
  if (scope === 'all') return routes
  if (scope === 'pending') return routes.filter(r => isPendente(r, referenceDateISO))
  if (scope === 'closed') return routes.filter(r => r.status === 'Encerrado')
  return routes
}

// --- CÁLCULOS DE RESUMO ---

export function calculatePlantSummary(routes: Route[], planta: string, celula: CellNumber, referenceDateISO: string | null): PlantSummary {
  const plantRoutes = routes.filter(r => r.planta === planta && r.celula === celula)
  const totalRotas = plantRoutes.length
  
  const encerradas = plantRoutes.filter(r => r.status === 'Encerrado').length
  const emExecucao = plantRoutes.filter(r => r.status === 'Em execução').length
  const previsto = plantRoutes.filter(r => r.status === 'Previsto').length
  const regresso = plantRoutes.filter(r => r.status === 'Regresso').length
  const regressoAntigo = plantRoutes.filter(r => isRegressoAntigo(r, referenceDateISO)).length
  const pendencias = plantRoutes.filter(r => isPendente(r, referenceDateISO)).length
  
  const kmOk = plantRoutes.filter(r => r.kmStatus === 'OK').length
  const kmMais = plantRoutes.filter(r => r.kmStatus === 'Rodado a mais').length
  const kmMenos = plantRoutes.filter(r => r.kmStatus === 'Rodado a menos').length
  const kmErrado = kmMais + kmMenos
  
  const semContraLeite = plantRoutes.filter(r => isSemContraLeite(r)).length
  
  const totalCritico = pendencias + semContraLeite + kmErrado

  return {
    planta,
    celula,
    totalRotas,
    encerradas,
    pendencias,
    emExecucao,
    previsto,
    regresso,
    regressoAntigo,
    percentualEncerramento: totalRotas > 0 ? (encerradas / totalRotas) * 100 : 0,
    kmOk,
    kmMais,
    kmMenos,
    kmErrado,
    litrosColetados: plantRoutes.reduce((sum, r) => sum + (Number(r.litrosColetados) || 0), 0),
    litrosDescarregados: plantRoutes.reduce((sum, r) => sum + (Number(r.litrosDescarregados) || 0), 0),
    semContraLeite,
    totalCritico,
    percentualCritico: totalRotas > 0 ? (totalCritico / totalRotas) * 100 : 0
  }
}

export function calculateCellSummary(routes: Route[], celula: CellNumber, referenceDateISO: string | null): CellSummary {
  const cellRoutes = routes.filter(r => r.celula === celula)
  const plantas = [...new Set(cellRoutes.map(r => r.planta))].sort()
  
  const plantSummaries = plantas.map(p => calculatePlantSummary(cellRoutes, p, celula, referenceDateISO))
  const totalRotas = cellRoutes.length
  
  const encerradas = cellRoutes.filter(r => r.status === 'Encerrado').length
  const pendencias = cellRoutes.filter(r => isPendente(r, referenceDateISO)).length
  const semContraLeite = cellRoutes.filter(r => isSemContraLeite(r)).length
  const kmErrado = cellRoutes.filter(r => isKmStatusIncorreto(r)).length
  const regressoAntigo = cellRoutes.filter(r => isRegressoAntigo(r, referenceDateISO)).length

  return {
    celula,
    totalRotas,
    encerradas,
    pendencias,
    emExecucao: cellRoutes.filter(r => r.status === 'Em execução').length,
    previsto: cellRoutes.filter(r => r.status === 'Previsto').length,
    regresso: cellRoutes.filter(r => r.status === 'Regresso').length,
    regressoAntigo,
    percentualEncerramento: totalRotas > 0 ? (encerradas / totalRotas) * 100 : 0,
    kmOk: cellRoutes.filter(r => r.kmStatus === 'OK').length,
    kmMais: cellRoutes.filter(r => r.kmStatus === 'Rodado a mais').length,
    kmMenos: cellRoutes.filter(r => r.kmStatus === 'Rodado a menos').length,
    kmErrado,
    litrosColetados: cellRoutes.reduce((sum, r) => sum + (Number(r.litrosColetados) || 0), 0),
    semContraLeite,
    totalCritico: pendencias + semContraLeite + kmErrado,
    percentualCritico: totalRotas > 0 ? ((pendencias + semContraLeite + kmErrado) / totalRotas) * 100 : 0,
    plantas: plantSummaries
  }
}

export function calculateGlobalSummary(routes: Route[], referenceDateISO: string | null): GlobalSummary {
  const totalRotas = routes.length
  const encerradas = routes.filter(r => r.status === 'Encerrado').length
  const pendencias = routes.filter(r => isPendente(r, referenceDateISO)).length
  const semContraLeite = routes.filter(r => isSemContraLeite(r)).length
  const kmIncorreto = routes.filter(r => isKmStatusIncorreto(r)).length
  const regressoAntigo = routes.filter(r => isRegressoAntigo(r, referenceDateISO)).length

  const cells = ([1, 2, 3] as CellNumber[]).map(c => calculateCellSummary(routes, c, referenceDateISO))

  return {
    totalRotas,
    encerradas,
    pendencias,
    emExecucao: routes.filter(r => r.status === 'Em execução').length,
    previsto: routes.filter(r => r.status === 'Previsto').length,
    regresso: routes.filter(r => r.status === 'Regresso').length,
    regressoAntigo,
    percentualEncerramento: totalRotas > 0 ? (encerradas / totalRotas) * 100 : 0,
    kmOk: routes.filter(r => r.kmStatus === 'OK').length,
    kmMais: routes.filter(r => r.kmStatus === 'Rodado a mais').length,
    kmMenos: routes.filter(r => r.kmStatus === 'Rodado a menos').length,
    litrosColetados: routes.reduce((sum, r) => sum + (Number(r.litrosColetados) || 0), 0),
    semContraLeite,
    kmIncorreto,
    totalCritico: pendencias + semContraLeite + kmIncorreto,
    percentualCritico: totalRotas > 0 ? ((pendencias + semContraLeite + kmIncorreto) / totalRotas) * 100 : 0,
    cells
  }
}

export function getWorstOperations(routes: Route[], limit: number = 10, referenceDateISO: string | null): PlantSummary[] {
  const plants = [...new Set(routes.map(r => r.planta))]
  const summaries: PlantSummary[] = []
  
  plants.forEach(planta => {
    const plantRoutes = routes.filter(r => r.planta === planta)
    if (plantRoutes.length > 0) {
      const celula = plantRoutes[0].celula
      summaries.push(calculatePlantSummary(routes, planta, celula, referenceDateISO))
    }
  })
  
  return summaries
    .sort((a, b) => b.totalCritico - a.totalCritico)
    .slice(0, limit)
}

// --- UTILITÁRIOS DE FORMATAÇÃO ---

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num)
}

export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`
}

export function getPercentageColor(percentage: number): string {
  if (percentage >= 95) return 'bg-success'
  if (percentage >= 90) return 'bg-warning'
  return 'bg-danger'
}

export function getPercentageTextColor(percentage: number): string {
  if (percentage >= 95) return 'text-success'
  if (percentage >= 90) return 'text-warning'
  return 'text-danger'
}

export function analyzeDelayReasons(routes: Route[]): Record<string, number> {
  const keywords = ['SINAL', 'PLACA ERRADA', 'MANUTENÇÃO', 'N COLETA', 'GRUPO', 'REPORT']
  const counts: Record<string, number> = {}
  
  keywords.forEach(keyword => {
    counts[keyword] = routes.filter(r => 
      (r.observacao || '').toUpperCase().includes(keyword)
    ).length
  })
  
  return counts
}
