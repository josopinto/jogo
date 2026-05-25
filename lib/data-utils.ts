// Utilitários de processamento de dados do BI CCO
import { type Route, type PlantSummary, type CellSummary, type GlobalSummary, type CellNumber } from './types'

export function calculatePlantSummary(routes: Route[], planta: string, celula: CellNumber, referenceDate?: string | null): PlantSummary & { regressoAntigo: number, totalCritico: number, percentualCritico: number } {
  const plantRoutes = routes.filter(r => r.planta === planta && r.celula === celula)
  
  const encerradas = plantRoutes.filter(r => r.status === 'Encerrado').length
  const emExecucao = plantRoutes.filter(r => r.status === 'Em execução').length
  const comPendencias = plantRoutes.filter(r => r.status === 'Com Pendências').length
  const previsto = plantRoutes.filter(r => r.status === 'Previsto').length
  const regresso = plantRoutes.filter(r => r.status === 'Regresso').length
  
  // Regresso antigo: Status = Regresso e data da rota diferente da Data de Referência
  const regressoAntigo = plantRoutes.filter(r => {
    if (r.status !== 'Regresso') return false
    if (!referenceDate || !r.inicio) return false
    const routeDate = r.inicio.split(' ')[0]
    return routeDate !== referenceDate
  }).length

  // Rotas pendentes: Em execução, Com Pendências, Previsto, Regresso antigo
  const pendencias = emExecucao + comPendencias + previsto + regressoAntigo
  
  const semContraLeite = plantRoutes.filter(r => r.litrosDescarregados === 0).length
  const kmMais = plantRoutes.filter(r => r.kmStatus === 'Rodado a mais').length
  const kmMenos = plantRoutes.filter(r => r.kmStatus === 'Rodado a menos').length
  const kmErrado = kmMais + kmMenos

  const totalCritico = pendencias + semContraLeite + kmErrado

  return {
    planta,
    celula,
    totalRotas: plantRoutes.length,
    encerradas,
    pendencias, // Agora inclui as novas regras
    emExecucao,
    previsto,
    regresso,
    regressoAntigo,
    percentualEncerramento: plantRoutes.length > 0 ? (encerradas / plantRoutes.length) * 100 : 0,
    kmOk: plantRoutes.filter(r => r.kmStatus === 'OK').length,
    kmMais,
    kmMenos,
    litrosColetados: plantRoutes.reduce((sum, r) => sum + r.litrosColetados, 0),
    litrosDescarregados: plantRoutes.reduce((sum, r) => sum + r.litrosDescarregados, 0),
    semContraLeite,
    totalCritico,
    percentualCritico: plantRoutes.length > 0 ? (totalCritico / plantRoutes.length) * 100 : 0
  }
}

export function calculateCellSummary(routes: Route[], celula: CellNumber, referenceDate?: string | null): CellSummary & { totalCritico: number, percentualCritico: number, regressoAntigo: number } {
  const cellRoutes = routes.filter(r => r.celula === celula)
  const plantas = [...new Set(cellRoutes.map(r => r.planta))]
  
  const plantSummaries = plantas.map(p => calculatePlantSummary(cellRoutes, p, celula, referenceDate))
  
  const totalRotas = cellRoutes.length
  const encerradas = cellRoutes.filter(r => r.status === 'Encerrado').length
  const emExecucao = cellRoutes.filter(r => r.status === 'Em execução').length
  const previsto = cellRoutes.filter(r => r.status === 'Previsto').length
  
  const regressoAntigo = cellRoutes.filter(r => {
    if (r.status !== 'Regresso') return false
    if (!referenceDate || !r.inicio) return false
    const routeDate = r.inicio.split(' ')[0]
    return routeDate !== referenceDate
  }).length

  const pendencias = emExecucao + cellRoutes.filter(r => r.status === 'Com Pendências').length + previsto + regressoAntigo
  
  const totalCritico = plantSummaries.reduce((sum, p) => sum + p.totalCritico, 0)

  return {
    celula,
    totalRotas,
    encerradas,
    pendencias,
    emExecucao,
    previsto,
    regresso: cellRoutes.filter(r => r.status === 'Regresso').length,
    regressoAntigo,
    percentualEncerramento: totalRotas > 0 ? (encerradas / totalRotas) * 100 : 0,
    kmOk: cellRoutes.filter(r => r.kmStatus === 'OK').length,
    kmMais: cellRoutes.filter(r => r.kmStatus === 'Rodado a mais').length,
    kmMenos: cellRoutes.filter(r => r.kmStatus === 'Rodado a menos').length,
    litrosColetados: cellRoutes.reduce((sum, r) => sum + r.litrosColetados, 0),
    plantas: plantSummaries,
    totalCritico,
    percentualCritico: totalRotas > 0 ? (totalCritico / totalRotas) * 100 : 0
  }
}

export function calculateGlobalSummary(routes: Route[], referenceDate?: string | null): GlobalSummary {
  const totalRotas = routes.length
  const encerradas = routes.filter(r => r.status === 'Encerrado').length
  const emExecucao = routes.filter(r => r.status === 'Em execução').length
  const previsto = routes.filter(r => r.status === 'Previsto').length
  
  const regressoAntigo = routes.filter(r => {
    if (r.status !== 'Regresso') return false
    if (!referenceDate || !r.inicio) return false
    const routeDate = r.inicio.split(' ')[0]
    return routeDate !== referenceDate
  }).length

  const pendencias = emExecucao + routes.filter(r => r.status === 'Com Pendências').length + previsto + regressoAntigo
  const semContraLeite = routes.filter(r => r.litrosDescarregados === 0).length
  const kmIncorreto = routes.filter(r => r.kmStatus !== 'OK').length
  
  const totalCritico = pendencias + semContraLeite + kmIncorreto

  return {
    totalRotas,
    encerradas,
    pendencias,
    emExecucao,
    previsto,
    regresso: routes.filter(r => r.status === 'Regresso').length,
    regressoAntigo,
    percentualEncerramento: totalRotas > 0 ? (encerradas / totalRotas) * 100 : 0,
    kmOk: routes.filter(r => r.kmStatus === 'OK').length,
    kmMais: routes.filter(r => r.kmStatus === 'Rodado a mais').length,
    kmMenos: routes.filter(r => r.kmStatus === 'Rodado a menos').length,
    litrosColetados: routes.reduce((sum, r) => sum + r.litrosColetados, 0),
    semContraLeite,
    kmIncorreto,
    totalCritico,
    percentualCritico: totalRotas > 0 ? (totalCritico / totalRotas) * 100 : 0,
    cells: ([1, 2, 3] as CellNumber[]).map(c => calculateCellSummary(routes, c, referenceDate))
  }
}

export function filterRoutesByDate(routes: Route[], startDate: Date | null, endDate: Date | null): Route[] {
  if (!startDate && !endDate) return routes
  
  return routes.filter(route => {
    if (!route.inicio) return false
    
    // Parse date from format "DD/MM/YYYY HH:MM" or "DD/MM/YYYY"
    const dateStr = route.inicio.split(' ')[0]
    const parts = dateStr.split('/')
    if (parts.length !== 3) return false
    
    const routeDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
    
    // Reset hours for comparison
    const start = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) : null
    const end = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null
    
    if (start && routeDate < start) return false
    if (end && routeDate > end) return false
    
    return true
  })
}

export function filterRoutesByCell(routes: Route[], celula: CellNumber | 'all'): Route[] {
  if (celula === 'all') return routes
  return routes.filter(r => r.celula === celula)
}

export function getWorstOperations(routes: Route[], limit: number = 10, referenceDate?: string | null): (PlantSummary & { totalCritico: number, percentualCritico: number })[] {
  const plants = [...new Set(routes.map(r => r.planta))]
  const summaries = plants.map(planta => {
    const plantRoutes = routes.filter(r => r.planta === planta)
    const celula = plantRoutes[0]?.celula || 1
    return calculatePlantSummary(routes, planta, celula, referenceDate)
  })
  
  return summaries
    .sort((a, b) => b.totalCritico - a.totalCritico)
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
