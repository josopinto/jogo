'use client'

import { useMemo } from 'react'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { 
  calculateGlobalSummary, 
  getWorstOperations, 
  formatNumber, 
  formatPercentage,
  getPercentageTextColor
} from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function SummaryTab() {
  const { routes, referenceDate } = useCCO()
  
  const summary = useMemo(() => calculateGlobalSummary(routes, referenceDate), [routes, referenceDate])
  const worstOperations = useMemo(() => getWorstOperations(routes, 10, referenceDate), [routes, referenceDate])

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
          <h2 className="text-xl font-semibold">Nenhum arquivo importado</h2>
          <p className="text-muted-foreground">Faça upload dos dados do KMM para visualizar o painel.</p>
        </div>
      </div>
    )
  }

  // Texto automático de leitura rápida
  const quickReadText = useMemo(() => {
    const mostPendingCell = [...summary.cells].sort((a, b) => b.pendencias - a.pendencias)[0]
    const top3Critical = worstOperations.slice(0, 3).map(op => op.planta).join(', ')
    
    return `Foram analisadas ${formatNumber(summary.totalRotas)} rotas. A célula com maior volume de pendências foi a Célula ${mostPendingCell.celula}. As operações mais críticas são ${top3Critical}. Os principais pontos de atenção são rotas pendentes, contra leite e KM Status.`
  }, [summary, worstOperations])

  return (
    <div className="space-y-8">
      <TabHeader 
        title="Resumo Executivo" 
        description="Visão simplificada para reuniões e acompanhamento de metas"
      />

      {/* A) Objetivo do projeto */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold">Objetivo do Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/80 leading-relaxed">
            O objetivo do projeto é melhorar o encerramento de rotas no KMM, aumentando a confiabilidade das informações operacionais, reduzindo pendências e permitindo acompanhamento por célula, planta e operação.
          </p>
        </CardContent>
      </Card>

      {/* B) Cards principais */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card className="bg-card">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total de Rotas</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold">{formatNumber(summary.totalRotas)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs text-muted-foreground font-medium">% Encerradas no Prazo</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className={`text-2xl font-bold ${getPercentageTextColor(summary.percentualEncerramento)}`}>
              {formatPercentage(summary.percentualEncerramento)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs text-muted-foreground font-medium">Rotas Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex justify-between items-end">
            <div className="text-2xl font-bold text-danger">{formatNumber(summary.pendencias)}</div>
            <div className="text-xs text-muted-foreground font-medium">
              {formatPercentage(summary.totalRotas > 0 ? (summary.pendencias / summary.totalRotas) * 100 : 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs text-muted-foreground font-medium">Sem Contra Leite</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex justify-between items-end">
            <div className="text-2xl font-bold text-warning">{formatNumber(summary.semContraLeite)}</div>
            <div className="text-xs text-muted-foreground font-medium">
              {formatPercentage(summary.totalRotas > 0 ? (summary.semContraLeite / summary.totalRotas) * 100 : 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs text-muted-foreground font-medium">KM Status Errado</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex justify-between items-end">
            <div className="text-2xl font-bold text-orange">{formatNumber(summary.kmIncorreto)}</div>
            <div className="text-xs text-muted-foreground font-medium">
              {formatPercentage(summary.totalRotas > 0 ? (summary.kmIncorreto / summary.totalRotas) * 100 : 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs text-muted-foreground font-medium">Regresso Antigo</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 flex justify-between items-end">
            <div className="text-2xl font-bold text-danger">{formatNumber(summary.regressoAntigo)}</div>
            <div className="text-xs text-muted-foreground font-medium">
              {formatPercentage(summary.totalRotas > 0 ? (summary.regressoAntigo / summary.totalRotas) * 100 : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* E) Texto automático de leitura rápida */}
      <Card className="bg-secondary/30 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Leitura Rápida</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium italic">
            &quot;{quickReadText}&quot;
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-1">
        {/* C) Resumo por célula */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Resumo por Célula</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Célula</TableHead>
                  <TableHead className="text-right">Total de Rotas</TableHead>
                  <TableHead className="text-right">Rotas Pendentes</TableHead>
                  <TableHead className="text-right">Sem Contra Leite</TableHead>
                  <TableHead className="text-right">KM Status Errado</TableHead>
                  <TableHead className="text-right">Regresso Antigo</TableHead>
                  <TableHead className="text-right">% Crítico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.cells.map((cell) => (
                  <TableRow key={cell.celula}>
                    <TableCell className="font-medium">Célula {cell.celula}</TableCell>
                    <TableCell className="text-right">{formatNumber(cell.totalRotas)}</TableCell>
                    <TableCell className="text-right text-danger font-medium">{formatNumber(cell.pendencias)}</TableCell>
                    <TableCell className="text-right text-warning">{formatNumber(cell.plantas.reduce((sum, p) => sum + p.semContraLeite, 0))}</TableCell>
                    <TableCell className="text-right text-orange">{formatNumber(cell.kmMais + cell.kmMenos)}</TableCell>
                    <TableCell className="text-right text-danger">{formatNumber(cell.regressoAntigo)}</TableCell>
                    <TableCell className={`text-right font-bold ${(cell as any).percentualCritico > 20 ? 'text-danger' : 'text-foreground'}`}>
                      {formatPercentage((cell as any).percentualCritico)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* D) Operações mais críticas */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Operações Mais Críticas (TOP 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Posição</TableHead>
                  <TableHead>Célula</TableHead>
                  <TableHead>Planta</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pendentes</TableHead>
                  <TableHead className="text-right">Sem Contra Leite</TableHead>
                  <TableHead className="text-right">KM Errado</TableHead>
                  <TableHead className="text-right">Regresso Ant.</TableHead>
                  <TableHead className="text-right">Total Crítico</TableHead>
                  <TableHead className="text-right">% Crítico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {worstOperations.map((op, index) => (
                  <TableRow key={op.planta}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell>C{op.celula}</TableCell>
                    <TableCell className="font-medium truncate max-w-[200px]" title={op.planta}>{op.planta}</TableCell>
                    <TableCell className="text-right">{formatNumber(op.totalRotas)}</TableCell>
                    <TableCell className="text-right text-danger">{formatNumber(op.pendencias)}</TableCell>
                    <TableCell className="text-right text-warning">{formatNumber(op.semContraLeite)}</TableCell>
                    <TableCell className="text-right text-orange">{formatNumber(op.kmMais + op.kmMenos)}</TableCell>
                    <TableCell className="text-right text-danger">{formatNumber(op.regressoAntigo)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(op.totalCritico)}</TableCell>
                    <TableCell className={`text-right font-bold ${op.percentualCritico > 50 ? 'text-danger' : 'text-warning'}`}>
                      {formatPercentage(op.percentualCritico)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
