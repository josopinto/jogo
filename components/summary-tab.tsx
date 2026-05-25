'use client'

import { useMemo } from 'react'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { 
  calculateGlobalSummary, 
  calculateCellSummary,
  getWorstOperations, 
  formatNumber, 
  formatPercentage,
  getPercentageTextColor,
  getPercentageColor,
  filterRoutesByAuditPeriod,
  applyStatusScope,
  formatDateBR,
  isSemContraLeite,
  isKmStatusIncorreto
} from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { type FilterScope } from '@/lib/types'

export function SummaryTab() {
  const { 
    routes, 
    referenceDate, 
    auditPeriod, 
    setAuditPeriod, 
    indicatorScope, 
    setIndicatorScope 
  } = useCCO()
  
  // --- HOOKS ---

  const routesInAudit = useMemo(() => {
    return filterRoutesByAuditPeriod(routes, auditPeriod.start, auditPeriod.end)
  }, [routes, auditPeriod])

  const routesForIndicators = useMemo(() => {
    return applyStatusScope(routesInAudit, indicatorScope, referenceDate)
  }, [routesInAudit, indicatorScope, referenceDate])

  const summary = useMemo(() => calculateGlobalSummary(routesInAudit, referenceDate), [routesInAudit, referenceDate])
  const indicatorStats = useMemo(() => calculateGlobalSummary(routesForIndicators, referenceDate), [routesForIndicators, referenceDate])
  const worstOperations = useMemo(() => getWorstOperations(routesInAudit, 10, referenceDate), [routesInAudit, referenceDate])

  const quickReadText = useMemo(() => {
    if (summary.totalRotas === 0) return "Nenhuma rota encontrada para o período selecionado."
    
    const validCells = summary.cells.filter(c => c.totalRotas > 0)
    if (validCells.length === 0) return "Aguardando processamento de dados..."

    const mostPendingCell = [...validCells].sort((a, b) => b.pendencias - a.pendencias)[0]
    const top3Critical = worstOperations.slice(0, 3).map(op => op.planta).join(', ')
    
    return `Foram analisadas ${formatNumber(summary.totalRotas)} rotas no período de auditoria selecionado. A célula com maior volume de pendências foi a Célula ${mostPendingCell.celula}. As operações mais críticas são ${top3Critical}. Os principais pontos de atenção são sem contra leite, rotas pendentes e KM Status errado.`
  }, [summary, worstOperations])

  const isEmpty = routes.length === 0

  // --- RENDER ---

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center shadow-surface">
          <span className="material-symbols-outlined text-outline text-3xl">description</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-on-surface">Nenhum dado consolidado</h2>
          <p className="text-on-surface-variant">Faça upload dos arquivos do KMM na aba Upload para visualizar o resumo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-gutter">
      {/* Configuration Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between bg-surface-container-lowest p-lg rounded-xl border border-outline-variant/30 shadow-surface">
        <div className="grid gap-gutter md:grid-cols-3 flex-1">
          <div className="space-y-xs">
            <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Periodo de Auditoria (De/Ate)</label>
            <div className="flex gap-2">
              <Input 
                type="date" 
                value={auditPeriod.start || ''} 
                onChange={e => setAuditPeriod(e.target.value, auditPeriod.end)}
                className="h-10 bg-surface border-outline-variant focus:border-primary text-xs"
              />
              <Input 
                type="date" 
                value={auditPeriod.end || ''} 
                onChange={e => setAuditPeriod(auditPeriod.start, e.target.value)}
                className="h-10 bg-surface border-outline-variant focus:border-primary text-xs"
              />
            </div>
          </div>

          <div className="space-y-xs">
            <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">Escopo dos Indicadores</label>
            <Select value={indicatorScope} onValueChange={(v) => setIndicatorScope(v as FilterScope)}>
              <SelectTrigger className="h-10 bg-surface border-outline-variant focus:border-primary text-xs">
                <SelectValue placeholder="Escopo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as rotas</SelectItem>
                <SelectItem value="pending">Apenas Pendentes / Nao Encerradas</SelectItem>
                <SelectItem value="closed">Apenas Encerradas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-xs text-right hidden md:block">
             <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Data de Referencia Atual:</p>
             <p className="text-lg font-bold text-primary font-mono">{formatDateBR(referenceDate)}</p>
          </div>
        </div>
      </div>

      {/* Objetivo Section */}
      <section className="bg-surface-container-lowest rounded-xl p-lg shadow-surface border border-outline-variant/50">
        <div className="flex items-center gap-sm mb-md">
          <span className="material-symbols-outlined text-primary">target</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Objetivo do Projeto</h2>
        </div>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-4xl leading-relaxed italic">
          &quot;O objetivo do projeto é melhorar o encerramento de rotas no KMM, aumentar a confiabilidade das informações operacionais e apoiar o CCO no acompanhamento por célula, planta e operação.&quot;
        </p>
      </section>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-md md:gap-gutter">
        {/* KPI 1 */}
        <Card className="bg-surface-container-lowest rounded-xl p-md shadow-surface border border-outline-variant/50 flex flex-col h-[120px] justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-outline opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[100px]">route</span>
          </div>
          <CardHeader className="p-0 space-y-0 relative z-10">
            <CardTitle className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Total Analisadas</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className="font-data-display text-data-display text-primary">{formatNumber(summary.totalRotas)}</div>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="bg-surface-container-lowest rounded-xl p-md shadow-surface border border-outline-variant/50 flex flex-col h-[120px] justify-between relative overflow-hidden group border-b-4 border-b-success">
          <div className="absolute -right-4 -top-4 text-success opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[100px]">check_circle</span>
          </div>
          <CardHeader className="p-0 space-y-0 relative z-10">
            <CardTitle className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">% Encerradas</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className={`font-data-display text-data-display ${getPercentageTextColor(summary.percentualEncerramento)}`}>
              {formatPercentage(summary.percentualEncerramento)}
            </div>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="bg-surface-container-lowest rounded-xl p-md shadow-surface border border-outline-variant/50 flex flex-col h-[120px] justify-between relative overflow-hidden group border-b-4 border-b-error">
          <div className="absolute -right-4 -top-4 text-error opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[100px]">pending_actions</span>
          </div>
          <CardHeader className="p-0 space-y-0 relative z-10">
            <CardTitle className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider text-error">Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className="font-data-display text-data-display text-error">{formatNumber(summary.pendencias)}</div>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="bg-surface-container-lowest rounded-xl p-md shadow-surface border border-outline-variant/50 flex flex-col h-[120px] justify-between relative overflow-hidden group border-b-4 border-b-warning">
          <div className="absolute -right-4 -top-4 text-warning opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[100px]">receipt_long</span>
          </div>
          <CardHeader className="p-0 space-y-0 relative z-10">
            <CardTitle className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">S.C. Leite*</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className="font-data-display text-data-display text-warning">{formatNumber(indicatorStats.semContraLeite)}</div>
          </CardContent>
        </Card>

        {/* KPI 5 */}
        <Card className="bg-surface-container-lowest rounded-xl p-md shadow-surface border border-outline-variant/50 flex flex-col h-[120px] justify-between relative overflow-hidden group border-b-4 border-b-orange">
          <div className="absolute -right-4 -top-4 text-orange opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[100px]">speed</span>
          </div>
          <CardHeader className="p-0 space-y-0 relative z-10">
            <CardTitle className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">KM Errado*</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className="font-data-display text-data-display text-orange">{formatNumber(indicatorStats.kmErrado)}</div>
          </CardContent>
        </Card>

        {/* KPI 6 */}
        <Card className="bg-surface-container-lowest rounded-xl p-md shadow-surface border border-outline-variant/50 flex flex-col h-[120px] justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-tertiary-container opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[100px]">history</span>
          </div>
          <CardHeader className="p-0 space-y-0 relative z-10">
            <CardTitle className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Reg. Antigo</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className="font-data-display text-data-display text-tertiary-container">{formatNumber(summary.regressoAntigo)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Read Section */}
      <div className="bg-gradient-to-br from-primary to-primary-container rounded-xl shadow-md border border-outline-variant/30 flex flex-col p-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
        <div className="flex items-center gap-sm mb-md relative z-10 text-on-primary">
          <span className="material-symbols-outlined">lightbulb</span>
          <h3 className="font-headline-md text-headline-md">Leitura Rápida Automática</h3>
        </div>
        <div className="flex-grow flex flex-col gap-md relative z-10">
          <p className="text-body-lg text-primary-fixed leading-relaxed font-medium">
            &quot;{quickReadText}&quot;
          </p>
          <div className="bg-on-primary/10 rounded-lg p-md mt-sm backdrop-blur-sm border border-on-primary/20">
            <h4 className="font-label-lg text-label-lg text-on-primary mb-xs flex items-center gap-xs uppercase tracking-widest">
              <span className="material-symbols-outlined text-[16px]">info</span> Ponto de Atenção
            </h4>
            <p className="font-body-md text-body-md text-primary-fixed-dim">
              Indicadores marcados com (*) respeitam o escopo: <strong className="text-on-primary capitalize">{indicatorScope}</strong>. 
              As pendências de regresso antigo são calculadas baseadas na data de referência <strong className="text-on-primary">{formatDateBR(referenceDate)}</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-gutter lg:grid-cols-1">
        {/* Cell Breakdown Table */}
        <div className="bg-surface-container-lowest rounded-xl shadow-surface border border-outline-variant/50 flex flex-col overflow-hidden">
          <div className="h-[56px] px-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">table_chart</span>
              Resumo por Célula Importada
            </h3>
            <span className="text-[10px] font-mono text-on-surface-variant font-bold">CONSOLIDADO DA AUDITORIA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-bright">
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium">Célula</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium text-right">Total Rotas</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium text-right text-error">Pendentes</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium text-right text-warning">SCL*</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium text-right text-orange">KM*</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium text-right text-error">Reg. Ant.</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium text-right">% Crítico</th>
                </tr>
              </thead>
              <tbody>
                {summary.cells.filter(c => c.totalRotas > 0).map((cell) => {
                  const cellRoutesInScope = applyStatusScope(
                    routesInAudit.filter(r => r.celula === cell.celula),
                    indicatorScope,
                    referenceDate
                  )
                  const cellIndicatorStats = calculateCellSummary(cellRoutesInScope, cell.celula, referenceDate)

                  return (
                    <tr key={cell.celula} className="border-b border-outline-variant/30 h-[52px] hover:bg-surface-container-low transition-colors group">
                      <td className="font-body-md text-body-md text-on-surface px-lg py-sm font-bold text-primary">Célula {cell.celula}</td>
                      <td className="font-body-md text-body-md text-on-surface px-lg py-sm text-right">{formatNumber(cell.totalRotas)}</td>
                      <td className="font-body-md text-body-md text-error px-lg py-sm text-right font-bold">{formatNumber(cell.pendencias)}</td>
                      <td className="font-body-md text-body-md text-warning px-lg py-sm text-right font-semibold">{formatNumber(cellIndicatorStats.semContraLeite)}</td>
                      <td className="font-body-md text-body-md text-orange px-lg py-sm text-right font-semibold">{formatNumber(cellIndicatorStats.kmErrado)}</td>
                      <td className="font-body-md text-body-md text-error px-lg py-sm text-right">{formatNumber(cell.regressoAntigo)}</td>
                      <td className="px-lg py-sm text-right">
                        <span className={`inline-flex items-center justify-center font-label-md text-label-md font-bold px-3 py-1 rounded-full w-[65px] ${getPercentageColor(100 - cell.percentualCritico)} text-on-primary`}>
                          {formatPercentage(cell.percentualCritico)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* TOP 10 Operations Table */}
        <div className="bg-surface-container-lowest rounded-xl shadow-surface border border-outline-variant/50 flex flex-col overflow-hidden">
          <div className="h-[56px] px-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary">analytics</span>
              TOP 10 Operações Mais Críticas
            </h3>
            <span className="text-[10px] font-mono text-on-surface-variant font-bold uppercase tracking-tighter">Prioridade de Acao CCO</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-bright">
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium">Pos.</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium">Planta</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium">Célula</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium text-right">Total</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium text-right text-error">Pendentes</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium text-right text-warning">SCL*</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium text-right text-orange">KM*</th>
                  <th className="font-label-lg text-label-lg text-on-surface-variant px-lg py-sm border-b border-outline-variant font-medium text-right font-bold text-on-surface">Total Crítico</th>
                </tr>
              </thead>
              <tbody>
                {worstOperations.map((op, index) => {
                   const opRoutesInScope = applyStatusScope(
                    routesInAudit.filter(r => r.planta === op.planta),
                    indicatorScope,
                    referenceDate
                  )
                  const opSCLStats = opRoutesInScope.filter(r => isSemContraLeite(r)).length 
                  const opKMStats = opRoutesInScope.filter(r => isKmStatusIncorreto(r)).length 

                  return (
                    <tr key={op.planta} className="border-b border-outline-variant/30 h-[52px] table-row-zebra hover:bg-surface-container-low transition-colors group">
                      <td className="font-body-md text-body-md text-on-surface-variant px-lg py-sm">{index + 1}º</td>
                      <td className="font-body-md text-body-md text-on-surface px-lg py-sm font-bold truncate max-w-[200px]" title={op.planta}>{op.planta}</td>
                      <td className="font-body-md text-body-md text-on-surface-variant px-lg py-sm">C{op.celula}</td>
                      <td className="font-body-md text-body-md text-on-surface-variant px-lg py-sm text-right">{formatNumber(op.totalRotas)}</td>
                      <td className="font-body-md text-body-md text-error px-lg py-sm text-right font-bold">{formatNumber(op.pendencias)}</td>
                      <td className="font-body-md text-body-md text-warning px-lg py-sm text-right">{formatNumber(opSCLStats)}</td>
                      <td className="font-body-md text-body-md text-orange px-lg py-sm text-right">{formatNumber(opKMStats)}</td>
                      <td className="font-body-md text-body-md text-on-surface px-lg py-sm text-right font-black bg-primary/5">{formatNumber(op.totalCritico)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
