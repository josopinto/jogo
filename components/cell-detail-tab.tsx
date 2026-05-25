'use client'

import { useMemo, useState } from 'react'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { 
  calculateCellSummary, 
  formatNumber, 
  formatPercentage, 
  getPercentageColor, 
  filterRoutesByAuditPeriod,
  applyStatusScope,
  formatDateBR 
} from '@/lib/data-utils'
import { type CellNumber } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell as RechartsCell,
  CartesianGrid
} from 'recharts'

export function CellDetailTab() {
  const { routes, referenceDate, auditPeriod, indicatorScope } = useCCO()
  const [selectedCell, setSelectedCell] = useState<CellNumber>(1)

  // --- HOOKS ---

  // 1. Filtrar pelo período de auditoria
  const routesInAudit = useMemo(() => {
    return filterRoutesByAuditPeriod(routes, auditPeriod.start, auditPeriod.end)
  }, [routes, auditPeriod])

  // 2. Calcular sumário da célula
  const cellSummary = useMemo(() => {
    return calculateCellSummary(routesInAudit, selectedCell, referenceDate)
  }, [routesInAudit, selectedCell, referenceDate])

  // 3. Calcular indicadores por escopo para as plantas da célula
  const plantIndicatorStats = useMemo(() => {
     const cellRoutesInScope = applyStatusScope(
       routesInAudit.filter(r => r.celula === selectedCell),
       indicatorScope,
       referenceDate
     )
     const plantas = [...new Set(cellRoutesInScope.map(r => r.planta))]
     return plantas.map(p => {
        const pRoutes = cellRoutesInScope.filter(r => r.planta === p)
        return {
           planta: p,
           semContraLeite: pRoutes.filter(r => Number(r.litrosDescarregados) === 0).length,
           kmErrado: pRoutes.filter(r => r.kmStatus !== 'OK').length
        }
     })
  }, [routesInAudit, selectedCell, indicatorScope, referenceDate])

  // Dados para gráfico de ranking (Encerramento)
  const rankingData = useMemo(() => {
    return [...cellSummary.plantas]
      .sort((a, b) => a.percentualEncerramento - b.percentualEncerramento)
      .map(p => ({
        name: p.planta.length > 25 ? p.planta.substring(0, 23) + '...' : p.planta,
        fullName: p.planta,
        percentual: p.percentualEncerramento,
        fill: p.percentualEncerramento >= 95 ? '#00c9a7' : p.percentualEncerramento >= 90 ? '#ffd166' : '#ff6b6b'
      }))
  }, [cellSummary])

  const isEmpty = routes.length === 0

  // --- RENDER ---

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Nenhum dado consolidado</h2>
          <p className="text-muted-foreground">Faça upload dos arquivos para ver o detalhe por célula.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
         <div className="flex items-center gap-4">
            <Select value={selectedCell.toString()} onValueChange={(v) => setSelectedCell(Number(v) as CellNumber)}>
              <SelectTrigger className="w-48 bg-secondary border-border h-9">
                <SelectValue placeholder="Selecionar celula" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Celula 1</SelectItem>
                <SelectItem value="2">Celula 2</SelectItem>
                <SelectItem value="3">Celula 3</SelectItem>
              </SelectContent>
            </Select>
            <div className="h-4 w-[1px] bg-border mx-2 hidden md:block" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Periodo:</span>
            <span className="text-xs font-mono">{formatDateBR(auditPeriod.start)} ate {formatDateBR(auditPeriod.end)}</span>
         </div>
         <div className="text-right text-xs">
            <span className="text-muted-foreground uppercase font-bold mr-2">Escopo Indicadores:</span>
            <span className="font-bold text-primary capitalize">{indicatorScope}</span>
         </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-[10px] text-muted-foreground uppercase font-bold">% Encerramento</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className={`text-2xl font-bold ${cellSummary.percentualEncerramento >= 95 ? 'text-success' : 'text-danger'}`}>
              {formatPercentage(cellSummary.percentualEncerramento)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-[10px] text-muted-foreground uppercase font-bold">Total Rotas</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">{formatNumber(cellSummary.totalRotas)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-danger">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-[10px] text-muted-foreground uppercase font-bold text-danger">Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-danger">{formatNumber(cellSummary.pendencias)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-warning">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-[10px] text-muted-foreground uppercase font-bold text-warning">S.C. Leite*</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-warning">{formatNumber(cellSummary.semContraLeite)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-orange">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-[10px] text-muted-foreground uppercase font-bold text-orange">KM Errado*</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-orange">{formatNumber(cellSummary.kmErrado)}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-1 p-4">
            <CardTitle className="text-[10px] text-muted-foreground uppercase font-bold">Reg. Antigo</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-danger">{formatNumber(cellSummary.regressoAntigo)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         <Card className="bg-card border-border shadow-sm">
            <CardHeader>
               <CardTitle className="text-sm font-bold">% Encerramento por Planta</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingData} layout="vertical" margin={{ left: 30, right: 30 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#2d3748" />
                     <XAxis type="number" domain={[0, 100]} hide />
                     <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={10} width={120} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                        formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Encerramento']}
                     />
                     <Bar dataKey="percentual" radius={[0, 4, 4, 0]}>
                        {rankingData.map((entry, index) => (
                           <RechartsCell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
         </Card>

         <Card className="bg-card border-border shadow-sm">
            <CardHeader>
               <CardTitle className="text-sm font-bold">Resumo por Planta (Célula {selectedCell})</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-80 overflow-y-auto">
               <table className="w-full text-[11px]">
                  <thead className="bg-secondary/50 sticky top-0">
                     <tr className="border-b border-border">
                        <th className="text-left p-2">Planta</th>
                        <th className="text-right p-2">Total</th>
                        <th className="text-right p-2 text-danger">Pend.</th>
                        <th className="text-right p-2 text-warning">SCL*</th>
                        <th className="text-right p-2 text-orange">KM*</th>
                        <th className="text-right p-2">Reg.A</th>
                        <th className="text-right p-2">% Enc.</th>
                     </tr>
                  </thead>
                  <tbody>
                     {cellSummary.plantas.sort((a,b) => a.percentualEncerramento - b.percentualEncerramento).map(p => {
                        const pInScope = plantIndicatorStats.find(s => s.planta === p.planta)
                        return (
                           <tr key={p.planta} className="border-b border-border/50 hover:bg-secondary/20">
                              <td className="p-2 font-bold">{p.planta}</td>
                              <td className="p-2 text-right">{p.totalRotas}</td>
                              <td className="p-2 text-right text-danger font-bold">{p.pendencias}</td>
                              <td className="p-2 text-right text-warning">{pInScope?.semContraLeite || 0}</td>
                              <td className="p-2 text-right text-orange">{pInScope?.kmErrado || 0}</td>
                              <td className="p-2 text-right text-danger">{p.regressoAntigo}</td>
                              <td className={`p-2 text-right font-bold ${p.percentualEncerramento < 90 ? 'text-danger' : 'text-success'}`}>
                                 {formatPercentage(p.percentualEncerramento)}
                              </td>
                           </tr>
                        )
                     })}
                  </tbody>
               </table>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
