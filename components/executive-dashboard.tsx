'use client'

import { useMemo } from 'react'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { 
  calculateGlobalSummary, 
  getWorstOperations,
  formatNumber, 
  formatPercentage,
  getPercentageColor,
  filterRoutesByAuditPeriod,
  applyStatusScope,
  calculateCellSummary
} from '@/lib/data-utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from 'recharts'
import { type FilterScope } from '@/lib/types'

const STATUS_COLORS = {
  encerradas: '#00c9a7',
  pendencias: '#ff6b6b',
  emExecucao: '#ffd166',
  previsto: '#6b7280',
  regresso: '#ff6b6b'
}

const KM_COLORS = {
  ok: '#00c9a7',
  mais: '#ff9f43',
  menos: '#4da6ff'
}

const PROBLEM_COLORS = {
  pendentes: '#ff6b6b',
  semContraLeite: '#ffd166',
  kmErrado: '#ff9f43'
}

export function ExecutiveDashboard() {
  const { 
    routes, 
    referenceDate, 
    auditPeriod, 
    setAuditPeriod, 
    indicatorScope, 
    setIndicatorScope 
  } = useCCO()

  // 1. Base Filtrada pelo Período de Auditoria
  const routesInAudit = useMemo(() => {
    return filterRoutesByAuditPeriod(routes, auditPeriod.start, auditPeriod.end)
  }, [routes, auditPeriod])

  // 2. Base para Indicadores (Escopo)
  const routesInScope = useMemo(() => {
    return applyStatusScope(routesInAudit, indicatorScope, referenceDate)
  }, [routesInAudit, indicatorScope, referenceDate])

  const summary = useMemo(() => calculateGlobalSummary(routesInAudit, referenceDate), [routesInAudit, referenceDate])
  const indicatorStats = useMemo(() => calculateGlobalSummary(routesInScope, referenceDate), [routesInScope, referenceDate])
  const worstOperations = useMemo(() => getWorstOperations(routesInAudit, 10, referenceDate), [routesInAudit, referenceDate])

  // Dados para grafico de pizza de status
  const pieData = useMemo(() => [
    { name: 'Encerradas', value: summary.encerradas, color: STATUS_COLORS.encerradas },
    { name: 'Pendencias', value: summary.pendencias, color: STATUS_COLORS.pendencias },
    { name: 'Em Execucao', value: summary.emExecucao, color: STATUS_COLORS.emExecucao },
    { name: 'Previsto', value: summary.previsto, color: STATUS_COLORS.previsto },
    { name: 'Regresso Antigo', value: summary.regressoAntigo, color: STATUS_COLORS.regresso }
  ].filter(d => d.value > 0), [summary])

  // Dados para grafico de pendencias por celula
  const pendenciasBarData = useMemo(() => {
    return summary.cells.map(cell => ({
      name: `C${cell.celula}`,
      Encerradas: cell.encerradas,
      Pendencias: cell.pendencias
    }))
  }, [summary])

  // Dados para grafico de KM por celula (respeita escopo)
  const kmBarData = useMemo(() => {
    return indicatorStats.cells.map(cell => ({
      name: `C${cell.celula}`,
      'KM OK': cell.kmOk,
      'KM Incorreto': cell.kmErrado
    }))
  }, [indicatorStats])

  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Nenhum dado importado</h2>
          <p className="text-muted-foreground">Faça upload dos arquivos do KMM para visualizar os indicadores.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-xl border border-border">
         <div className="flex flex-wrap gap-4 items-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Periodo Auditoria</span>
              <div className="flex gap-2">
                <Input type="date" value={auditPeriod.start || ''} onChange={e => setAuditPeriod(e.target.value, auditPeriod.end)} className="h-8 w-32 text-xs" />
                <Input type="date" value={auditPeriod.end || ''} onChange={e => setAuditPeriod(auditPeriod.start, e.target.value)} className="h-8 w-32 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Escopo Indicadores</span>
              <Select value={indicatorScope} onValueChange={(v) => setIndicatorScope(v as FilterScope)}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue placeholder="Escopo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as rotas</SelectItem>
                  <SelectItem value="pending">Apenas Pendentes</SelectItem>
                  <SelectItem value="closed">Apenas Encerradas</SelectItem>
                </SelectContent>
              </Select>
            </div>
         </div>
         <div className="text-right">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">Referencia Auditoria</span>
            <span className="text-sm font-bold text-primary">{referenceDate}</span>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card border-border border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Total Rotas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(summary.totalRotas)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">no periodo selecionado</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-danger">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Rotas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-danger">{formatNumber(summary.pendencias)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{formatPercentage(summary.percentualEncerramento)} encerradas</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-warning">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Sem Contra Leite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{formatNumber(indicatorStats.semContraLeite)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">escopo: {indicatorScope}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-orange">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">KM Status Errado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange">{formatNumber(indicatorStats.kmIncorreto)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">escopo: {indicatorScope}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-danger">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Regresso Antigo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-danger">{formatNumber(summary.regressoAntigo)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">data rota != ref</p>
          </CardContent>
        </Card>
      </div>

      {/* Graficos Principais */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Distribuicao de Status</CardTitle>
            <CardDescription>Visao geral da base de auditoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                    formatter={(value: number) => [formatNumber(value), 'Rotas']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Pendencias por Celula</CardTitle>
            <CardDescription>Comparativo de encerramento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pendenciasBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="Encerradas" fill={STATUS_COLORS.encerradas} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pendencias" fill={STATUS_COLORS.pendencias} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">KM Status e Contra Leite por Celula</CardTitle>
            <CardDescription>Indicadores no escopo: {indicatorScope}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kmBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="KM OK" fill={KM_COLORS.ok} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="KM Incorreto" fill={KM_COLORS.mais} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
