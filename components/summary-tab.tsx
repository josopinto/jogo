'use client'

import { useMemo } from 'react'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { 
  calculateGlobalSummary, 
  getWorstOperations, 
  formatNumber, 
  formatPercentage,
  getPercentageTextColor,
  filterRoutesByAuditPeriod,
  applyStatusScope
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
  
  // 1. Filtrar rotas pelo período de auditoria selecionado
  const routesInAudit = useMemo(() => {
    return filterRoutesByAuditPeriod(routes, auditPeriod.start, auditPeriod.end)
  }, [routes, auditPeriod])

  // 2. Aplicar escopo para indicadores de Sem Contra Leite e KM Status
  // Note: Total de rotas e Pendências são sempre sobre a base completa do período de auditoria
  const routesForIndicators = useMemo(() => {
    return applyStatusScope(routesInAudit, indicatorScope, referenceDate)
  }, [routesInAudit, indicatorScope, referenceDate])

  // Sumários
  const summary = useMemo(() => calculateGlobalSummary(routesInAudit, referenceDate), [routesInAudit, referenceDate])
  const indicatorStats = useMemo(() => calculateGlobalSummary(routesForIndicators, referenceDate), [routesForIndicators, referenceDate])
  const worstOperations = useMemo(() => getWorstOperations(routesInAudit, 10, referenceDate), [routesInAudit, referenceDate])

  const isEmpty = routes.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Nenhum dado consolidado</h2>
          <p className="text-muted-foreground">Faça upload dos arquivos do KMM na aba Upload para visualizar o resumo.</p>
        </div>
      </div>
    )
  }

  // Texto automático de leitura rápida
  const quickReadText = useMemo(() => {
    if (summary.totalRotas === 0) return "Nenhuma rota encontrada para o período selecionado."
    
    const mostPendingCell = [...summary.cells].sort((a, b) => b.pendencias - a.pendencias)[0]
    const top3Critical = worstOperations.slice(0, 3).map(op => op.planta).join(', ')
    
    return `Foram analisadas ${formatNumber(summary.totalRotas)} rotas no período de auditoria selecionado. A célula com maior volume de pendências foi a Célula ${mostPendingCell.celula}. As operações mais críticas são ${top3Critical}. Os principais pontos de atenção são sem contra leite, rotas pendentes e KM Status errado.`
  }, [summary, worstOperations])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="grid gap-4 md:grid-cols-3 flex-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground">Periodo de Auditoria (De/Ate)</label>
            <div className="flex gap-2">
              <Input 
                type="date" 
                value={auditPeriod.start || ''} 
                onChange={e => setAuditPeriod(e.target.value, auditPeriod.end)}
                className="h-9 bg-secondary text-xs"
              />
              <Input 
                type="date" 
                value={auditPeriod.end || ''} 
                onChange={e => setAuditPeriod(auditPeriod.start, e.target.value)}
                className="h-9 bg-secondary text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground">Escopo dos Indicadores</label>
            <Select value={indicatorScope} onValueChange={(v) => setIndicatorScope(v as FilterScope)}>
              <SelectTrigger className="h-9 bg-secondary text-xs">
                <SelectValue placeholder="Escopo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as rotas</SelectItem>
                <SelectItem value="pending">Apenas Pendentes / Nao Encerradas</SelectItem>
                <SelectItem value="closed">Apenas Encerradas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 text-right">
             <p className="text-[10px] text-muted-foreground uppercase font-bold">Data de Referencia Atual:</p>
             <p className="text-sm font-mono font-bold text-primary">{referenceDate || 'Nao definida'}</p>
          </div>
        </div>
      </div>

      {/* A) Objetivo do projeto */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <p className="text-sm text-foreground/80 leading-relaxed italic">
            &quot;O objetivo do projeto é melhorar o encerramento de rotas no KMM, aumentar a confiabilidade das informações operacionais e apoiar o CCO no acompanhamento por célula, planta e operação.&quot;
          </p>
        </CardContent>
      </Card>

      {/* B) Cards principais */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground font-bold uppercase">Total de Rotas</CardTitle>
            <span className="text-[10px] bg-secondary px-1.5 rounded text-muted-foreground">Periodo</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold">{formatNumber(summary.totalRotas)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Rotas validas importadas</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-danger">
          <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground font-bold uppercase">Rotas Pendentes</CardTitle>
            <span className="text-[10px] bg-danger/10 px-1.5 rounded text-danger font-bold">Critico</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-danger">{formatNumber(summary.pendencias)}</div>
            <p className="text-xs font-semibold text-danger/80">{formatPercentage(summary.percentualEncerramento === 100 ? 0 : 100 - summary.percentualEncerramento)} do total</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-warning">
          <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground font-bold uppercase">Sem Contra Leite</CardTitle>
            <span className="text-[10px] bg-warning/10 px-1.5 rounded text-warning font-bold capitalize">{indicatorScope === 'all' ? 'Todas' : indicatorScope === 'pending' ? 'Pendentes' : 'Encerradas'}</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-warning">{formatNumber(indicatorStats.semContraLeite)}</div>
            <p className="text-xs font-semibold text-warning/80">{formatPercentage(summary.totalRotas > 0 ? (indicatorStats.semContraLeite / summary.totalRotas) * 100 : 0)} do total</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-orange">
          <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
            <CardTitle className="text-xs text-muted-foreground font-bold uppercase">KM Status Errado</CardTitle>
            <span className="text-[10px] bg-orange/10 px-1.5 rounded text-orange font-bold capitalize">{indicatorScope === 'all' ? 'Todas' : indicatorScope === 'pending' ? 'Pendentes' : 'Encerradas'}</span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-orange">{formatNumber(indicatorStats.kmIncorreto)}</div>
            <p className="text-xs font-semibold text-orange/80">{formatPercentage(summary.totalRotas > 0 ? (indicatorStats.kmIncorreto / summary.totalRotas) * 100 : 0)} do total</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-l-4 border-l-danger">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs text-muted-foreground font-bold uppercase">Regresso Antigo</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex justify-between items-end">
            <div className="text-2xl font-bold text-danger">{formatNumber(summary.regressoAntigo)}</div>
            <div className="text-[10px] font-bold text-danger bg-danger/5 px-2 py-0.5 rounded">
              {formatPercentage(summary.totalRotas > 0 ? (summary.regressoAntigo / summary.totalRotas) * 100 : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* E) Texto automático de leitura rápida */}
      <Card className="bg-secondary/20 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Leitura Rápida Automatica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base font-medium text-foreground leading-relaxed">
            &quot;{quickReadText}&quot;
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-1">
        {/* C) Resumo por célula */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 border-b border-border mb-4">
            <CardTitle className="text-base font-bold">Resumo por Célula Importada</CardTitle>
            <CardDescription>Consolidado do periodo de auditoria</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead className="font-bold">Célula</TableHead>
                  <TableHead className="text-right font-bold">Total Rotas</TableHead>
                  <TableHead className="text-right font-bold text-danger">Pendentes</TableHead>
                  <TableHead className="text-right font-bold text-warning">Sem Contra Leite*</TableHead>
                  <TableHead className="text-right font-bold text-orange">KM Errado*</TableHead>
                  <TableHead className="text-right font-bold text-danger">Regresso Ant.</TableHead>
                  <TableHead className="text-right font-bold">% Crítico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.cells.filter(c => c.totalRotas > 0).map((cell) => {
                  // Calcular indicadores por escopo para a célula
                  const cellRoutesInScope = applyStatusScope(
                    routesInAudit.filter(r => r.celula === cell.celula),
                    indicatorScope,
                    referenceDate
                  )
                  const cellIndicatorStats = calculateCellSummary(cellRoutesInScope, cell.celula, referenceDate)

                  return (
                    <TableRow key={cell.celula} className="hover:bg-secondary/10 transition-colors">
                      <TableCell className="font-bold text-primary">Célula {cell.celula}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(cell.totalRotas)}</TableCell>
                      <TableCell className="text-right text-danger font-bold">{formatNumber(cell.pendencias)}</TableCell>
                      <TableCell className="text-right text-warning font-semibold">{formatNumber(cellIndicatorStats.semContraLeite)}</TableCell>
                      <TableCell className="text-right text-orange font-semibold">{formatNumber(cellIndicatorStats.kmErrado)}</TableCell>
                      <TableCell className="text-right text-danger">{formatNumber(cell.regressoAntigo)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${getPercentageColor(100 - cell.percentualCritico)} ${getPercentageTextColor(100 - cell.percentualCritico)} bg-opacity-10`}>
                          {formatPercentage(cell.percentualCritico)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="p-3 bg-secondary/10 border-t border-border">
              <p className="text-[10px] text-muted-foreground italic">
                * Indicadores marcados com asterisco (*) respeitam o escopo de status selecionado ({indicatorScope === 'all' ? 'Todas as Rotas' : indicatorScope === 'pending' ? 'Apenas Pendentes' : 'Apenas Encerradas'}).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* D) Operações mais críticas */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 border-b border-border mb-4">
            <CardTitle className="text-base font-bold">Operações Mais Críticas (TOP 10)</CardTitle>
            <CardDescription>Plantas que exigem açao imediata do CCO</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow>
                  <TableHead className="w-[60px] font-bold text-center">Pos.</TableHead>
                  <TableHead className="w-[80px] font-bold">Célula</TableHead>
                  <TableHead className="font-bold">Planta</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                  <TableHead className="text-right font-bold text-danger">Pendentes</TableHead>
                  <TableHead className="text-right font-bold text-warning">S.C. Leite*</TableHead>
                  <TableHead className="text-right font-bold text-orange">KM Err.*</TableHead>
                  <TableHead className="text-right font-bold">Reg. Ant.</TableHead>
                  <TableHead className="text-right font-bold">Total Crítico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {worstOperations.map((op, index) => {
                   const opRoutesInScope = applyStatusScope(
                    routesInAudit.filter(r => r.planta === op.planta),
                    indicatorScope,
                    referenceDate
                  )
                  const opIndicatorStats = opRoutesInScope.length > 0 
                    ? opRoutesInScope.filter(r => isSemContraLeite(r)).length 
                    : 0
                  const opKmStats = opRoutesInScope.length > 0 
                    ? opRoutesInScope.filter(r => isKmStatusIncorreto(r)).length 
                    : 0

                  return (
                    <TableRow key={op.planta} className="hover:bg-secondary/10 transition-colors">
                      <TableCell className="text-center font-bold text-muted-foreground">{index + 1}º</TableCell>
                      <TableCell className="font-medium">C{op.celula}</TableCell>
                      <TableCell className="font-bold truncate max-w-[200px]" title={op.planta}>{op.planta}</TableCell>
                      <TableCell className="text-right">{formatNumber(op.totalRotas)}</TableCell>
                      <TableCell className="text-right text-danger font-bold">{formatNumber(op.pendencias)}</TableCell>
                      <TableCell className="text-right text-warning">{formatNumber(opIndicatorStats)}</TableCell>
                      <TableCell className="text-right text-orange">{formatNumber(opKmStats)}</TableCell>
                      <TableCell className="text-right text-danger">{formatNumber(op.regressoAntigo)}</TableCell>
                      <TableCell className="text-right bg-secondary/5 font-black text-foreground">{formatNumber(op.totalCritico)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
