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
  calculateCellSummary,
  formatDateBR
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
  pendencias: '#ba1a1a',
  emExecucao: '#ffb464',
  previsto: '#737783',
  regresso: '#ba1a1a'
}

const KM_COLORS = {
  ok: '#00c9a7',
  mais: '#c86400',
  menos: '#3e5f8f'
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

  // --- HOOKS ---

  const routesInAudit = useMemo(() => {
    return filterRoutesByAuditPeriod(routes, auditPeriod.start, auditPeriod.end)
  }, [routes, auditPeriod])

  const routesInScope = useMemo(() => {
    return applyStatusScope(routesInAudit, indicatorScope, referenceDate)
  }, [routesInAudit, indicatorScope, referenceDate])

  const summary = useMemo(() => calculateGlobalSummary(routesInAudit, referenceDate), [routesInAudit, referenceDate])
  const indicatorStats = useMemo(() => calculateGlobalSummary(routesInScope, referenceDate), [routesInScope, referenceDate])

  const pieData = useMemo(() => [
    { name: 'Encerradas', value: summary.encerradas, color: STATUS_COLORS.encerradas },
    { name: 'Pendencias', value: summary.pendencias, color: STATUS_COLORS.pendencias },
    { name: 'Em Execucao', value: summary.emExecucao, color: STATUS_COLORS.emExecucao },
    { name: 'Previsto', value: summary.previsto, color: STATUS_COLORS.previsto },
    { name: 'Regresso Antigo', value: summary.regressoAntigo, color: STATUS_COLORS.regresso }
  ].filter(d => d.value > 0), [summary])

  const pendenciasBarData = useMemo(() => {
    return summary.cells.map(cell => ({
      name: `C${cell.celula}`,
      Encerradas: cell.encerradas,
      Pendencias: cell.pendencias
    }))
  }, [summary])

  const kmBarData = useMemo(() => {
    return indicatorStats.cells.map(cell => ({
      name: `C${cell.celula}`,
      'KM OK': cell.kmOk,
      'KM Incorreto': cell.kmErrado
    }))
  }, [indicatorStats])

  const isEmpty = routes.length === 0

  // --- RENDER ---

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center shadow-surface">
          <span className="material-symbols-outlined text-outline text-3xl">settings_suggest</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-on-surface">Nenhum dado importado</h2>
          <p className="text-on-surface-variant">Faça upload dos arquivos do KMM para visualizar os indicadores.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-gutter">
      {/* Configuration Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-surface-container-lowest p-lg rounded-xl border border-outline-variant/30 shadow-surface">
         <div className="flex flex-wrap gap-gutter items-center">
            <div className="space-y-xs">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Periodo Auditoria</span>
              <div className="flex gap-2">
                <Input type="date" value={auditPeriod.start || ''} onChange={e => setAuditPeriod(e.target.value, auditPeriod.end)} className="h-9 w-36 text-xs bg-surface border-outline-variant" />
                <Input type="date" value={auditPeriod.end || ''} onChange={e => setAuditPeriod(auditPeriod.start, e.target.value)} className="h-9 w-36 text-xs bg-surface border-outline-variant" />
              </div>
            </div>
            <div className="space-y-xs">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Escopo Indicadores</span>
              <Select value={indicatorScope} onValueChange={(v) => setIndicatorScope(v as FilterScope)}>
                <SelectTrigger className="h-9 w-48 text-xs bg-surface border-outline-variant">
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
         <div className="text-right border-l border-outline-variant/30 pl-lg hidden lg:block">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase block tracking-widest">Referencia Auditoria</span>
            <span className="text-sm font-bold text-primary font-mono">{formatDateBR(referenceDate)}</span>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-md md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-surface-container-lowest rounded-xl p-md shadow-surface border border-outline-variant/50 flex flex-col h-[110px] justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-primary opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[90px]">route</span>
          </div>
          <CardHeader className="p-0 space-y-0 relative z-10">
            <CardTitle className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Total Rotas</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className="font-data-display text-2xl font-bold text-primary">{formatNumber(summary.totalRotas)}</div>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest rounded-xl p-md shadow-surface border border-outline-variant/50 flex flex-col h-[110px] justify-between relative overflow-hidden group border-l-4 border-l-error">
          <div className="absolute -right-4 -top-4 text-error opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[90px]">pending_actions</span>
          </div>
          <CardHeader className="p-0 space-y-0 relative z-10">
            <CardTitle className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider text-error">Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className="font-data-display text-2xl font-bold text-error">{formatNumber(summary.pendencias)}</div>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest rounded-xl p-md shadow-surface border border-outline-variant/50 flex flex-col h-[110px] justify-between relative overflow-hidden group border-l-4 border-l-warning">
          <div className="absolute -right-4 -top-4 text-warning opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[90px]">receipt_long</span>
          </div>
          <CardHeader className="p-0 space-y-0 relative z-10">
            <CardTitle className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Sem Contra Leite*</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className="font-data-display text-2xl font-bold text-warning">{formatNumber(indicatorStats.semContraLeite)}</div>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest rounded-xl p-md shadow-surface border border-outline-variant/50 flex flex-col h-[110px] justify-between relative overflow-hidden group border-l-4 border-l-orange">
          <div className="absolute -right-4 -top-4 text-orange opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[90px]">speed</span>
          </div>
          <CardHeader className="p-0 space-y-0 relative z-10">
            <CardTitle className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">KM Status*</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className="font-data-display text-2xl font-bold text-orange">{formatNumber(indicatorStats.kmErrado)}</div>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest rounded-xl p-md shadow-surface border border-outline-variant/50 flex flex-col h-[110px] justify-between relative overflow-hidden group border-l-4 border-l-error">
          <div className="absolute -right-4 -top-4 text-tertiary-container opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[90px]">history</span>
          </div>
          <CardHeader className="p-0 space-y-0 relative z-10">
            <CardTitle className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-wider">Reg. Antigo</CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10">
            <div className="font-data-display text-2xl font-bold text-error">{formatNumber(summary.regressoAntigo)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid gap-gutter lg:grid-cols-2">
        <Card className="bg-surface-container-lowest rounded-xl shadow-surface border border-outline-variant/50 overflow-hidden">
          <CardHeader className="border-b border-outline-variant/10 px-lg py-md bg-surface-bright/30">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Distribuição de Status</CardTitle>
            <CardDescription className="text-[10px]">VISÃO GERAL DA BASE DE AUDITORIA</CardDescription>
          </CardHeader>
          <CardContent className="p-lg">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    formatter={(value: number) => [formatNumber(value), 'Rotas']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-container-lowest rounded-xl shadow-surface border border-outline-variant/50 overflow-hidden">
          <CardHeader className="border-b border-outline-variant/10 px-lg py-md bg-surface-bright/30">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Pendências por Célula</CardTitle>
            <CardDescription className="text-[10px]">COMPARATIVO DE ENCERRAMENTO D+0</CardDescription>
          </CardHeader>
          <CardContent className="p-lg">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pendenciasBarData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#737783" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="#737783" fontSize={11} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                  <Legend verticalAlign="top" align="right" height={36} iconType="rect" />
                  <Bar dataKey="Encerradas" fill={STATUS_COLORS.encerradas} radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="Pendencias" fill={STATUS_COLORS.pendencias} radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-surface-container-lowest rounded-xl shadow-surface border border-outline-variant/50 overflow-hidden">
        <CardHeader className="border-b border-outline-variant/10 px-lg py-md bg-surface-bright/30">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Status KM por Célula</CardTitle>
          <CardDescription className="text-[10px]">INDICADORES NO ESCOPO: {indicatorScope.toUpperCase()}</CardDescription>
        </CardHeader>
        <CardContent className="p-lg">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kmBarData} barGap={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#737783" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#737783" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Legend verticalAlign="top" align="center" height={36} iconType="circle" />
                <Bar dataKey="KM OK" fill={KM_COLORS.ok} radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="KM Incorreto" fill={KM_COLORS.mais} radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
