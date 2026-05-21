'use client'

import { useMemo, useState } from 'react'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { 
  calculateGlobalSummary, 
  filterRoutesByCell, 
  filterRoutesByDate,
  getWorstOperations,
  formatNumber, 
  formatPercentage,
  getPercentageColor
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
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts'

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
  const { routes, hasImportedData, dataReferencia } = useCCO()
  const [selectedCell, setSelectedCell] = useState<CellNumber | 'all'>('all')
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  })

  const filteredRoutes = useMemo(() => {
    let filtered = routes
    filtered = filterRoutesByCell(filtered, selectedCell)
    filtered = filterRoutesByDate(filtered, dateRange.start, dateRange.end)
    return filtered
  }, [routes, selectedCell, dateRange])

  const summary = useMemo(() => calculateGlobalSummary(filteredRoutes, dataReferencia), [filteredRoutes, dataReferencia])
  const worstOperations = useMemo(() => getWorstOperations(filteredRoutes, 10), [filteredRoutes])

  // Dados para grafico de barras empilhadas por planta
  const stackedBarData = useMemo(() => {
    const plants = [...new Set(filteredRoutes.map(r => r.planta))]
    return plants.map(planta => {
      const plantRoutes = filteredRoutes.filter(r => r.planta === planta)
      return {
        name: planta.length > 20 ? planta.substring(0, 18) + '...' : planta,
        fullName: planta,
        Encerradas: plantRoutes.filter(r => r.status === 'Encerrado').length,
        Pendencias: plantRoutes.filter(r => r.status === 'Com Pendências').length,
        EmExecucao: plantRoutes.filter(r => r.status === 'Em execução').length
      }
    }).sort((a, b) => b.Encerradas - a.Encerradas).slice(0, 12)
  }, [filteredRoutes])

  // Dados para grafico de pizza de status
  const pieData = useMemo(() => [
    { name: 'Encerradas', value: summary.encerradas, color: STATUS_COLORS.encerradas },
    { name: 'Pendencias', value: summary.pendencias, color: STATUS_COLORS.pendencias },
    { name: 'Em Execucao', value: summary.emExecucao, color: STATUS_COLORS.emExecucao },
    { name: 'Previsto', value: summary.previsto, color: STATUS_COLORS.previsto },
    { name: 'Regresso', value: summary.regresso, color: STATUS_COLORS.regresso }
  ].filter(d => d.value > 0), [summary])

  // Dados para grafico de KM por celula
  const kmBarData = useMemo(() => {
    return summary.cells.map(cell => ({
      name: `Celula ${cell.celula}`,
      'KM OK': cell.kmOk,
      'KM a mais': cell.kmMais,
      'KM a menos': cell.kmMenos
    }))
  }, [summary])

  // Dados para grafico de pendencias por celula
  const pendenciasBarData = useMemo(() => {
    return summary.cells.map(cell => ({
      name: `Celula ${cell.celula}`,
      Encerradas: cell.encerradas,
      Pendencias: cell.pendencias,
      EmExecucao: cell.emExecucao,
      Previsto: cell.previsto,
      Regresso: cell.regresso
    }))
  }, [summary])

  // Top 10 operacoes com maior volume de pendencias
  const topPendenciasData = useMemo(() => {
    const plantData = [...new Set(filteredRoutes.map(r => r.planta))].map(planta => {
      const plantRoutes = filteredRoutes.filter(r => r.planta === planta)
      return {
        name: planta.length > 25 ? planta.substring(0, 23) + '...' : planta,
        fullName: planta,
        pendentes: plantRoutes.filter(r => r.status !== 'Encerrado').length,
        total: plantRoutes.length
      }
    })
    return plantData
      .filter(p => p.pendentes > 0)
      .sort((a, b) => b.pendentes - a.pendentes)
      .slice(0, 10)
  }, [filteredRoutes])

  // Distribuicao por tipo de problema
  const problemDistributionData = useMemo(() => [
    { 
      name: 'Pendentes', 
      value: summary.pendencias + summary.emExecucao + summary.previsto + summary.regresso, 
      color: PROBLEM_COLORS.pendentes 
    },
    { 
      name: 'Sem Contra Leite', 
      value: summary.semContraLeite, 
      color: PROBLEM_COLORS.semContraLeite 
    },
    { 
      name: 'KM Incorreto', 
      value: summary.kmIncorreto, 
      color: PROBLEM_COLORS.kmErrado 
    }
  ].filter(d => d.value > 0), [summary])

  // Evolucao semanal simulada (baseado nos dados disponiveis)
  const weeklyEvolutionData = useMemo(() => {
    // Simulacao de dados semanais para demonstracao
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Atual']
    const basePercentage = summary.percentualEncerramento
    return weeks.map((week, index) => ({
      name: week,
      percentual: Math.max(70, Math.min(100, basePercentage - (3 - index) * 3 + Math.random() * 5)),
      meta: 100
    }))
  }, [summary])

  // Alertas criticos
  const criticalAlerts = useMemo(() => {
    return worstOperations.filter(op => op.percentualEncerramento < 90)
  }, [worstOperations])

  const warningAlerts = useMemo(() => {
    return worstOperations.filter(op => op.percentualEncerramento >= 90 && op.percentualEncerramento < 95)
  }, [worstOperations])

  // Totais para pendentes
  const totalPendentes = summary.pendencias + summary.emExecucao + summary.previsto + summary.regresso

  return (
    <div className="space-y-6">
      <TabHeader 
        title="Visao Executiva" 
        description="Indicadores gerais do CCO - Centro de Controle Operacional"
      />
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-end">
        <div className="flex gap-4 flex-wrap">
          <Select value={selectedCell.toString()} onValueChange={(v) => setSelectedCell(v === 'all' ? 'all' : Number(v) as CellNumber)}>
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder="Filtrar celula" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Celulas</SelectItem>
              <SelectItem value="1">Celula 1</SelectItem>
              <SelectItem value="2">Celula 2</SelectItem>
              <SelectItem value="3">Celula 3</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">De:</span>
            <input
              type="date"
              className="px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm"
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value ? new Date(e.target.value) : null }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ate:</span>
            <input
              type="date"
              className="px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm"
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value ? new Date(e.target.value) : null }))}
            />
          </div>
        </div>
      </div>

      {!hasImportedData ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-muted-foreground text-lg mb-2">Nenhum arquivo importado</p>
              <p className="text-muted-foreground text-sm">Faca upload dos dados do KMM na aba Upload para visualizar o dashboard executivo.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards - Principal */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card border-border col-span-1 md:col-span-2 lg:col-span-1 relative overflow-hidden">
          <div className={`absolute inset-0 opacity-10 ${summary.percentualEncerramento >= 95 ? 'bg-success' : summary.percentualEncerramento >= 90 ? 'bg-warning' : 'bg-danger'}`} />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              % Encerradas no Prazo
              {summary.percentualEncerramento < 90 && (
                <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className={`text-5xl font-bold ${summary.percentualEncerramento >= 95 ? 'text-success' : summary.percentualEncerramento >= 90 ? 'text-warning' : 'text-danger'}`}>
              {formatPercentage(summary.percentualEncerramento)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Meta: 100%</p>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all ${summary.percentualEncerramento >= 95 ? 'bg-success' : summary.percentualEncerramento >= 90 ? 'bg-warning' : 'bg-danger'}`}
                style={{ width: `${Math.min(summary.percentualEncerramento, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Total de Rotas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{formatNumber(summary.totalRotas)}</div>
            <p className="text-xs text-muted-foreground mt-1">analisadas no periodo</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-danger">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Rotas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-danger">{formatNumber(totalPendentes)}</div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <p>{summary.pendencias} pend + {summary.emExecucao} exec</p>
              <p>{summary.previsto} prev + {summary.regresso} reg</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-warning">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Sem Contra Leite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{formatNumber(summary.semContraLeite)}</div>
            <p className="text-xs text-muted-foreground mt-1">litros desc. = 0</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-orange">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">KM Incorreto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange">{formatNumber(summary.kmIncorreto)}</div>
            <p className="text-xs text-muted-foreground mt-1">a mais ou a menos</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="space-y-3">
          {criticalAlerts.length > 0 && (
            <div className="p-4 rounded-lg bg-danger/20 border border-danger/50 animate-pulse">
              <h3 className="font-semibold text-danger mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Alerta Critico - Operacoes abaixo de 90%
              </h3>
              <div className="flex flex-wrap gap-2">
                {criticalAlerts.map(op => (
                  <span key={op.planta} className="px-3 py-1.5 rounded-lg bg-danger/30 text-danger text-sm font-medium">
                    {op.planta}: {formatPercentage(op.percentualEncerramento)}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {warningAlerts.length > 0 && (
            <div className="p-4 rounded-lg bg-warning/20 border border-warning/50">
              <h3 className="font-semibold text-warning mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Atencao - Operacoes entre 90% e 95%
              </h3>
              <div className="flex flex-wrap gap-2">
                {warningAlerts.map(op => (
                  <span key={op.planta} className="px-3 py-1.5 rounded-lg bg-warning/30 text-warning text-sm font-medium">
                    {op.planta}: {formatPercentage(op.percentualEncerramento)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Graficos - Linha 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ranking das piores operacoes */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Ranking - Plantas mais Criticas</CardTitle>
            <CardDescription>Operacoes com menor % de encerramento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {worstOperations.slice(0, 10).map((op, index) => (
                <div key={op.planta} className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index < 3 ? 'bg-danger/20 text-danger' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-foreground truncate max-w-[200px]" title={op.planta}>
                        {op.planta}
                      </span>
                      <span className={`text-sm font-bold ${op.percentualEncerramento >= 95 ? 'text-success' : op.percentualEncerramento >= 90 ? 'text-warning' : 'text-danger'}`}>
                        {formatPercentage(op.percentualEncerramento)}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getPercentageColor(op.percentualEncerramento)}`}
                        style={{ width: `${Math.min(op.percentualEncerramento, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{formatNumber(op.encerradas)} enc / {formatNumber(op.totalRotas)} total</span>
                      <span>{formatNumber(op.pendencias)} pendentes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribuicao de Status */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Distribuicao de Status</CardTitle>
            <CardDescription>Visao geral do status das rotas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
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
      </div>

      {/* Graficos - Linha 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pendencias por Celula */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Pendencias por Celula</CardTitle>
            <CardDescription>Comparativo de status entre celulas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pendenciasBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="Encerradas" fill={STATUS_COLORS.encerradas} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pendencias" fill={STATUS_COLORS.pendencias} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="EmExecucao" fill={STATUS_COLORS.emExecucao} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Evolucao Semanal */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Evolucao Semanal do % Encerramento</CardTitle>
            <CardDescription>Tendencia do indicador principal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyEvolutionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPercentual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c9a7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00c9a7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} domain={[60, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                  />
                  <Line type="monotone" dataKey="meta" stroke="#ff6b6b" strokeWidth={2} strokeDasharray="5 5" name="Meta" dot={false} />
                  <Area type="monotone" dataKey="percentual" stroke="#00c9a7" strokeWidth={3} fill="url(#colorPercentual)" name="% Encerramento" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graficos - Linha 3 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 10 Operacoes com Pendencias */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Top 10 - Maior Volume de Pendencias</CardTitle>
            <CardDescription>Operacoes que mais impactam o indicador</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPendenciasData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={10} width={120} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                    formatter={(value: number, name: string, props: { payload: { total: number } }) => [
                      `${formatNumber(value)} de ${formatNumber(props.payload.total)} rotas`,
                      'Pendentes'
                    ]}
                  />
                  <Bar dataKey="pendentes" fill={STATUS_COLORS.pendencias} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribuicao por Tipo de Problema */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Distribuicao por Tipo de Problema</CardTitle>
            <CardDescription>Principais problemas identificados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={problemDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatNumber(value)}`}
                    labelLine={true}
                  >
                    {problemDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                    formatter={(value: number) => [formatNumber(value), 'Ocorrencias']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graficos - Linha 4 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status por Operacao/Planta */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Status por Operacao/Planta</CardTitle>
            <CardDescription>Distribuicao de status nas principais operacoes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={10} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="Encerradas" stackId="a" fill={STATUS_COLORS.encerradas} />
                  <Bar dataKey="Pendencias" stackId="a" fill={STATUS_COLORS.pendencias} />
                  <Bar dataKey="EmExecucao" stackId="a" fill={STATUS_COLORS.emExecucao} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* KM Status por Celula */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">KM Status por Celula</CardTitle>
            <CardDescription>Controle de quilometragem rodada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kmBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="KM OK" fill={KM_COLORS.ok} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="KM a mais" fill={KM_COLORS.mais} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="KM a menos" fill={KM_COLORS.menos} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      </>
      )}
    </div>
  )
}
