// Utilitários de processamento de dados do BI CCO
import { type Route, type PlantSummary, type CellSummary, type GlobalSummary, type CellNumber } from './types'

/**
 * Verifica se uma rota é um "regresso antigo" (status Regresso com data diferente da referência)
 */
export function isRegressoAntigo(route: Route, dataReferencia: string | null): boolean {
  if (route.status !== 'Regresso') return false
  if (!dataReferencia) return false
  
  // Extrai data da rota do campo inicio
  const routeDateStr = route.inicio?.split(' ')[0]
  if (!routeDateStr) return false
  
  // Compara com data de referência (formato YYYY-MM-DD ou DD/MM/YYYY)
  let routeDate: string
  if (routeDateStr.includes('/')) {
    // Formato DD/MM/YYYY
    const parts = routeDateStr.split('/')
    routeDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
  } else {
    routeDate = routeDateStr
  }
  
  return routeDate !== dataReferencia
}

/**
 * Verifica se uma rota é pendente (não encerrada ou regresso antigo)
 * Rotas pendentes: Em execução, Com Pendências, Previsto, e Regresso antigo
 */
export function isRotaPendente(route: Route, dataReferencia: string | null): boolean {
  if (route.status === 'Encerrado') return false
  if (route.status === 'Regresso') {
    return isRegressoAntigo(route, dataReferencia)
  }
  return ['Em execução', 'Com Pendências', 'Previsto'].includes(route.status)
}

export function calculatePlantSummary(routes: Route[], planta: string, celula: CellNumber, dataReferencia: string | null = null): PlantSummary {
  const plantRoutes = routes.filter(r => r.planta === planta && r.celula === celula)
  
  const encerradas = plantRoutes.filter(r => r.status === 'Encerrado').length
  const pendencias = plantRoutes.filter(r => r.status === 'Com Pendências').length
  const emExecucao = plantRoutes.filter(r => r.status === 'Em execução').length
  const previsto = plantRoutes.filter(r => r.status === 'Previsto').length
  const regresso = plantRoutes.filter(r => r.status === 'Regresso').length
  
  return {
    planta,
    celula,
    totalRotas: plantRoutes.length,
    encerradas,
    pendencias,
    emExecucao,
    previsto,
    regresso,
    percentualEncerramento: plantRoutes.length > 0 ? (encerradas / plantRoutes.length) * 100 : 0,
    kmOk: plantRoutes.filter(r => r.kmStatus === 'OK').length,
    kmMais: plantRoutes.filter(r => r.kmStatus === 'Rodado a mais').length,
    kmMenos: plantRoutes.filter(r => r.kmStatus === 'Rodado a menos').length,
    litrosColetados: plantRoutes.reduce((sum, r) => sum + r.litrosColetados, 0),
    litrosDescarregados: plantRoutes.reduce((sum, r) => sum + r.litrosDescarregados, 0),
    // Sem contra leite: apenas rotas com litrosDescarregados = 0 (não depende do status)
    semContraLeite: plantRoutes.filter(r => r.litrosDescarregados === 0).length
  }
}

export function calculateCellSummary(routes: Route[], celula: CellNumber, dataReferencia: string | null = null): CellSummary {
  const cellRoutes = routes.filter(r => r.celula === celula)
  const plantas = [...new Set(cellRoutes.map(r => r.planta))]
  
  const encerradas = cellRoutes.filter(r => r.status === 'Encerrado').length
  const pendencias = cellRoutes.filter(r => r.status === 'Com Pendências').length
  const emExecucao = cellRoutes.filter(r => r.status === 'Em execução').length
  const previsto = cellRoutes.filter(r => r.status === 'Previsto').length
  const regresso = cellRoutes.filter(r => r.status === 'Regresso').length
  
  return {
    celula,
    totalRotas: cellRoutes.length,
    encerradas,
    pendencias,
    emExecucao,
    previsto,
    regresso,
    percentualEncerramento: cellRoutes.length > 0 ? (encerradas / cellRoutes.length) * 100 : 0,
    kmOk: cellRoutes.filter(r => r.kmStatus === 'OK').length,
    kmMais: cellRoutes.filter(r => r.kmStatus === 'Rodado a mais').length,
    kmMenos: cellRoutes.filter(r => r.kmStatus === 'Rodado a menos').length,
    litrosColetados: cellRoutes.reduce((sum, r) => sum + r.litrosColetados, 0),
    plantas: plantas.map(p => calculatePlantSummary(cellRoutes, p, celula, dataReferencia))
  }
}

export function calculateGlobalSummary(routes: Route[], dataReferencia: string | null = null): GlobalSummary {
  const encerradas = routes.filter(r => r.status === 'Encerrado').length
  const pendencias = routes.filter(r => r.status === 'Com Pendências').length
  const emExecucao = routes.filter(r => r.status === 'Em execução').length
  const previsto = routes.filter(r => r.status === 'Previsto').length
  const regresso = routes.filter(r => r.status === 'Regresso').length
  
  // Rotas pendentes: Em execução + Com Pendências + Previsto + Regresso antigo
  const regressoAntigo = routes.filter(r => isRegressoAntigo(r, dataReferencia)).length
  const totalPendentes = pendencias + emExecucao + previsto + regressoAntigo
  
  return {
    totalRotas: routes.length,
    encerradas,
    pendencias,
    emExecucao,
    previsto,
    regresso,
    percentualEncerramento: routes.length > 0 ? (encerradas / routes.length) * 100 : 0,
    kmOk: routes.filter(r => r.kmStatus === 'OK').length,
    kmMais: routes.filter(r => r.kmStatus === 'Rodado a mais').length,
    kmMenos: routes.filter(r => r.kmStatus === 'Rodado a menos').length,
    litrosColetados: routes.reduce((sum, r) => sum + r.litrosColetados, 0),
    // Sem contra leite: apenas rotas com litrosDescarregados = 0 (independente do status)
    semContraLeite: routes.filter(r => r.litrosDescarregados === 0).length,
    // KM incorreto: Rodado a mais OU Rodado a menos (mesmo em rotas encerradas)
    kmIncorreto: routes.filter(r => r.kmStatus !== 'OK').length,
    cells: [1, 2, 3].map(c => calculateCellSummary(routes, c as CellNumber, dataReferencia))
  }
}

export function filterRoutesByDate(routes: Route[], startDate: Date | null, endDate: Date | null): Route[] {
  if (!startDate && !endDate) return routes
  
  return routes.filter(route => {
    if (!route.inicio) return false
    
    // Parse date from format "DD/MM/YYYY HH:MM"
    const parts = route.inicio.split(' ')[0].split('/')
    const routeDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
    
    if (startDate && routeDate < startDate) return false
    if (endDate && routeDate > endDate) return false
    
    return true
  })
}

export function filterRoutesByCell(routes: Route[], celula: CellNumber | 'all'): Route[] {
  if (celula === 'all') return routes
  return routes.filter(r => r.celula === celula)
}

export function getWorstOperations(routes: Route[], limit: number = 10): PlantSummary[] {
  const plantas = [...new Set(routes.map(r => r.planta))]
  const summaries = plantas.map(planta => {
    const plantRoutes = routes.filter(r => r.planta === planta)
    const celula = plantRoutes[0]?.celula || 1
    return calculatePlantSummary(routes, planta, celula)
  })
  
  return summaries
    .sort((a, b) => a.percentualEncerramento - b.percentualEncerramento)
    .slice(0, limit)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num)
}

export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Encerrado': return 'text-success'
    case 'Com Pendências': return 'text-danger'
    case 'Em execução': return 'text-warning'
    case 'Previsto': return 'text-muted-foreground'
    case 'Regresso': return 'text-danger'
    default: return 'text-foreground'
  }
}

export function getKmStatusColor(status: string): string {
  switch (status) {
    case 'OK': return 'text-success'
    case 'Rodado a mais': return 'text-orange'
    case 'Rodado a menos': return 'text-info'
    default: return 'text-foreground'
  }
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
      r.observacao.toUpperCase().includes(keyword)
    ).length
  })
  
  return counts
}
