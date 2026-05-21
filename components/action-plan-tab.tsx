'use client'

import { useMemo, useState } from 'react'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { analyzeDelayReasons, formatNumber } from '@/lib/data-utils'
import { type ActionPlan, type ActionStatus, type ActionPriority, type CellNumber } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  ResponsiveContainer
} from 'recharts'

// Sample action plans data
const INITIAL_ACTION_PLANS: ActionPlan[] = [
  {
    id: '1',
    auditoria: 'Auditoria CCO - Encerramento D+0',
    acao: 'Acompanhamento diario das rotas abertas e cobrar encerramento no mesmo dia (D+0)',
    responsavel: 'Josue',
    celula: 'Todas',
    planta: 'Todas',
    prioridade: 'Alta',
    status: 'Em andamento',
    prazo: '2026-05-31',
    dataCriacao: '2026-05-01',
    dataConclusao: null,
    motivo: 'Rotas permanecendo abertas alem do prazo estabelecido',
    impactoEsperado: 'Aumentar % de encerramento no prazo para 100%',
    observacao: 'Cobranca diaria via grupo de WhatsApp',
    evidencia: '',
    proximoPasso: 'Implementar dashboard automatico de cobranca'
  },
  {
    id: '2',
    auditoria: 'Auditoria CCO - Encerramento D+0',
    acao: 'Controle semanal por celula e operacao para acompanhar % encerramento no prazo',
    responsavel: 'Josue',
    celula: 'Todas',
    planta: 'Todas',
    prioridade: 'Alta',
    status: 'Em andamento',
    prazo: '2026-06-30',
    dataCriacao: '2026-05-01',
    dataConclusao: null,
    motivo: 'Necessidade de visibilidade gerencial do indicador',
    impactoEsperado: 'Permitir tomada de decisao baseada em dados',
    observacao: 'Apresentar em reuniao semanal de resultados',
    evidencia: '',
    proximoPasso: 'Criar apresentacao padrao para reunioes'
  },
  {
    id: '3',
    auditoria: 'Auditoria CCO - Encerramento D+0',
    acao: 'Apresentar ranking das operacoes com mais pendencias e atrasos',
    responsavel: 'Josue',
    celula: 'Todas',
    planta: 'Todas',
    prioridade: 'Media',
    status: 'Concluido',
    prazo: '2026-05-15',
    dataCriacao: '2026-05-01',
    dataConclusao: '2026-05-10',
    motivo: 'Identificar operacoes que precisam de mais atencao',
    impactoEsperado: 'Direcionar esforcos para operacoes criticas',
    observacao: 'Ranking implementado no BI',
    evidencia: 'Dashboard BI - Aba Visao Executiva',
    proximoPasso: 'Manter atualizado semanalmente'
  },
  {
    id: '4',
    auditoria: 'Auditoria CCO - Encerramento D+0',
    acao: 'Identificar principais motivos de atraso (motorista, filial, contra leite, manutencao)',
    responsavel: 'Josue',
    celula: 'Todas',
    planta: 'Todas',
    prioridade: 'Media',
    status: 'Em andamento',
    prazo: '2026-05-31',
    dataCriacao: '2026-05-01',
    dataConclusao: null,
    motivo: 'Entender causas raiz dos atrasos',
    impactoEsperado: 'Criar acoes direcionadas para cada tipo de problema',
    observacao: 'Analise de palavras-chave nas observacoes',
    evidencia: '',
    proximoPasso: 'Categorizar motivos e criar plano especifico'
  },
  {
    id: '5',
    auditoria: 'Auditoria CCO - Encerramento D+0',
    acao: 'Criar historico para acompanhar evolucao e futuramente transformar em BI oficial',
    responsavel: 'Josue',
    celula: 'Todas',
    planta: 'Todas',
    prioridade: 'Baixa',
    status: 'Concluido',
    prazo: '2026-05-20',
    dataCriacao: '2026-05-01',
    dataConclusao: '2026-05-17',
    motivo: 'Necessidade de ferramenta visual para gestao',
    impactoEsperado: 'BI funcional para acompanhamento diario',
    observacao: 'BI desenvolvido e em uso',
    evidencia: 'Sistema atual',
    proximoPasso: 'Evoluir com base no feedback dos usuarios'
  },
  {
    id: '6',
    auditoria: 'Auditoria CCO - Contra Leite',
    acao: 'Verificar rotas encerradas sem contra leite e cobrar correcao',
    responsavel: 'Josue',
    celula: 1,
    planta: 'DPA - ARARAS',
    prioridade: 'Alta',
    status: 'Nao iniciado',
    prazo: '2026-05-25',
    dataCriacao: '2026-05-17',
    dataConclusao: null,
    motivo: 'Rotas com litros descarregados = 0',
    impactoEsperado: 'Garantir registro correto de contra leite',
    observacao: '',
    evidencia: '',
    proximoPasso: 'Levantar rotas afetadas e notificar operacao'
  },
  {
    id: '7',
    auditoria: 'Auditoria CCO - KM Status',
    acao: 'Analisar rotas com KM rodado a mais e verificar causa',
    responsavel: 'Josue',
    celula: 2,
    planta: 'DANONE - BOA ESPERANÇA',
    prioridade: 'Media',
    status: 'Aguardando operacao',
    prazo: '2026-05-28',
    dataCriacao: '2026-05-17',
    dataConclusao: null,
    motivo: 'KM rodado acima do previsto',
    impactoEsperado: 'Identificar desvios de rota ou erros de registro',
    observacao: 'Aguardando retorno da filial',
    evidencia: '',
    proximoPasso: 'Cobrar retorno da operacao'
  }
]

const STATUS_COLORS: Record<ActionStatus, string> = {
  'Nao iniciado': 'bg-muted text-muted-foreground border-muted',
  'Em andamento': 'bg-info/20 text-info border-info/30',
  'Aguardando operacao': 'bg-warning/20 text-warning border-warning/30',
  'Aguardando suporte': 'bg-orange/20 text-orange border-orange/30',
  'Concluido': 'bg-success/20 text-success border-success/30',
  'Atrasado': 'bg-danger/20 text-danger border-danger/30',
  'Cancelado': 'bg-muted/50 text-muted-foreground border-muted line-through'
}

const PRIORITY_COLORS: Record<ActionPriority, string> = {
  'Alta': 'bg-danger/20 text-danger',
  'Media': 'bg-warning/20 text-warning',
  'Baixa': 'bg-muted text-muted-foreground'
}

const KANBAN_COLUMNS: { status: ActionStatus; label: string; color: string }[] = [
  { status: 'Nao iniciado', label: 'Nao Iniciado', color: 'border-t-muted-foreground' },
  { status: 'Em andamento', label: 'Em Andamento', color: 'border-t-info' },
  { status: 'Aguardando operacao', label: 'Aguardando Op.', color: 'border-t-warning' },
  { status: 'Concluido', label: 'Concluido', color: 'border-t-success' },
  { status: 'Atrasado', label: 'Atrasado', color: 'border-t-danger' }
]

type ViewMode = 'table' | 'kanban'

export function ActionPlanTab() {
  const { routes } = useCCO()
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>(INITIAL_ACTION_PLANS)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filters, setFilters] = useState({
    responsavel: 'all',
    celula: 'all' as 'all' | CellNumber | 'Todas',
    status: 'all' as 'all' | ActionStatus,
    prioridade: 'all' as 'all' | ActionPriority,
    auditoria: 'all'
  })
  const [showAddForm, setShowAddForm] = useState(false)

  // Analise de motivos de atraso
  const delayReasons = useMemo(() => {
    const pendingRoutes = routes.filter(r => r.status !== 'Encerrado')
    return analyzeDelayReasons(pendingRoutes)
  }, [routes])

  // Dados para grafico de motivos
  const reasonsChartData = useMemo(() => {
    return Object.entries(delayReasons)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [delayReasons])

  // Filtered action plans
  const filteredPlans = useMemo(() => {
    return actionPlans.filter(plan => {
      if (filters.responsavel !== 'all' && plan.responsavel !== filters.responsavel) return false
      if (filters.celula !== 'all' && plan.celula !== filters.celula) return false
      if (filters.status !== 'all' && plan.status !== filters.status) return false
      if (filters.prioridade !== 'all' && plan.prioridade !== filters.prioridade) return false
      if (filters.auditoria !== 'all' && plan.auditoria !== filters.auditoria) return false
      return true
    })
  }, [actionPlans, filters])

  // Stats
  const stats = useMemo(() => {
    return {
      total: actionPlans.length,
      emAndamento: actionPlans.filter(p => p.status === 'Em andamento').length,
      atrasadas: actionPlans.filter(p => {
        if (p.status === 'Concluido' || p.status === 'Cancelado') return false
        return new Date(p.prazo) < new Date()
      }).length,
      concluidas: actionPlans.filter(p => p.status === 'Concluido').length,
      altaPrioridade: actionPlans.filter(p => p.prioridade === 'Alta' && p.status !== 'Concluido' && p.status !== 'Cancelado').length
    }
  }, [actionPlans])

  // Unique values for filters
  const uniqueResponsaveis = useMemo(() => [...new Set(actionPlans.map(p => p.responsavel))], [actionPlans])
  const uniqueAuditorias = useMemo(() => [...new Set(actionPlans.map(p => p.auditoria))], [actionPlans])

  const getStatusBadge = (status: ActionStatus) => (
    <span className={`px-2 py-1 rounded border text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  )

  const getPriorityBadge = (priority: ActionPriority) => (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
      {priority}
    </span>
  )

  const updatePlanStatus = (planId: string, newStatus: ActionStatus) => {
    setActionPlans(prev => prev.map(p => 
      p.id === planId 
        ? { ...p, status: newStatus, dataConclusao: newStatus === 'Concluido' ? new Date().toISOString().split('T')[0] : p.dataConclusao }
        : p
    ))
  }

  const KanbanCard = ({ plan }: { plan: ActionPlan }) => (
    <div className="p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-foreground line-clamp-2">{plan.acao}</h4>
        {getPriorityBadge(plan.prioridade)}
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {plan.responsavel}
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {plan.prazo}
        </div>
        {plan.celula !== 'Todas' && (
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Celula {plan.celula}
          </div>
        )}
      </div>
      {new Date(plan.prazo) < new Date() && plan.status !== 'Concluido' && plan.status !== 'Cancelado' && (
        <div className="mt-2 text-xs text-danger font-medium">Atrasado</div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <TabHeader 
        title="Plano de Acao / Auditoria" 
        description="Acompanhamento das acoes de melhoria do CCO"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Acoes</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-bold text-info">{stats.emAndamento}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-danger">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Atrasadas</p>
                <p className="text-2xl font-bold text-danger">{stats.atrasadas}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluidas</p>
                <p className="text-2xl font-bold text-success">{stats.concluidas}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-danger">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alta Prioridade</p>
                <p className="text-2xl font-bold text-danger">{stats.altaPrioridade}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center animate-pulse">
                <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Filtros e Visualizacao</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Tabela
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Kanban
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <Select value={filters.responsavel} onValueChange={(v) => setFilters(prev => ({ ...prev, responsavel: v }))}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Responsavel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueResponsaveis.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.celula.toString()} onValueChange={(v) => setFilters(prev => ({ ...prev, celula: v === 'all' ? 'all' : v === 'Todas' ? 'Todas' : Number(v) as CellNumber }))}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Celula" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Celulas</SelectItem>
                <SelectItem value="Todas">Geral (Todas)</SelectItem>
                <SelectItem value="1">Celula 1</SelectItem>
                <SelectItem value="2">Celula 2</SelectItem>
                <SelectItem value="3">Celula 3</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v as typeof filters.status }))}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="Nao iniciado">Nao iniciado</SelectItem>
                <SelectItem value="Em andamento">Em andamento</SelectItem>
                <SelectItem value="Aguardando operacao">Aguardando operacao</SelectItem>
                <SelectItem value="Aguardando suporte">Aguardando suporte</SelectItem>
                <SelectItem value="Concluido">Concluido</SelectItem>
                <SelectItem value="Atrasado">Atrasado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.prioridade} onValueChange={(v) => setFilters(prev => ({ ...prev, prioridade: v as typeof filters.prioridade }))}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Media">Media</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.auditoria} onValueChange={(v) => setFilters(prev => ({ ...prev, auditoria: v }))}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Auditoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {uniqueAuditorias.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-5">
          {KANBAN_COLUMNS.map(column => {
            const columnPlans = filteredPlans.filter(p => p.status === column.status)
            return (
              <div key={column.status} className={`rounded-lg bg-secondary/30 border-t-4 ${column.color}`}>
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground text-sm">{column.label}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-background text-xs text-muted-foreground">
                      {columnPlans.length}
                    </span>
                  </div>
                </div>
                <div className="p-2 space-y-2 min-h-[200px] max-h-[500px] overflow-y-auto">
                  {columnPlans.map(plan => (
                    <KanbanCard key={plan.id} plan={plan} />
                  ))}
                  {columnPlans.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Nenhuma acao
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Acoes da Auditoria Operacional</CardTitle>
            <CardDescription>Plano de acao para melhoria do indicador de encerramento de rotas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Auditoria</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Acao</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Responsavel</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Celula</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Prioridade</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Prazo</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">Proximo Passo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((plan) => (
                    <tr key={plan.id} className={`border-b border-border/50 hover:bg-secondary/30 ${new Date(plan.prazo) < new Date() && plan.status !== 'Concluido' && plan.status !== 'Cancelado' ? 'bg-danger/5' : ''}`}>
                      <td className="py-3 px-3 text-muted-foreground text-xs max-w-[150px] truncate" title={plan.auditoria}>{plan.auditoria}</td>
                      <td className="py-3 px-3 text-foreground max-w-[250px]" title={plan.acao}>
                        <span className="line-clamp-2">{plan.acao}</span>
                      </td>
                      <td className="py-3 px-3 text-foreground">{plan.responsavel}</td>
                      <td className="py-3 px-3 text-foreground">{plan.celula === 'Todas' ? 'Todas' : `Cel ${plan.celula}`}</td>
                      <td className="py-3 px-3">{getPriorityBadge(plan.prioridade)}</td>
                      <td className="py-3 px-3">{getStatusBadge(plan.status)}</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs whitespace-nowrap">
                        {plan.prazo}
                        {new Date(plan.prazo) < new Date() && plan.status !== 'Concluido' && plan.status !== 'Cancelado' && (
                          <span className="ml-1 text-danger">(Atrasado)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground text-xs max-w-[150px] truncate" title={plan.proximoPasso}>{plan.proximoPasso || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPlans.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma acao encontrada com os filtros selecionados.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analise de Motivos de Atraso */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Analise de Motivos de Atraso</CardTitle>
            <CardDescription>
              Palavras-chave identificadas nas observacoes das rotas pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reasonsChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reasonsChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={12} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                      formatter={(value: number) => [formatNumber(value), 'Ocorrencias']}
                    />
                    <Bar dataKey="value" fill="#ff6b6b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Nenhum motivo de atraso identificado nas rotas pendentes
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Resumo de Motivos</CardTitle>
            <CardDescription>Contagem de ocorrencias por palavra-chave</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(delayReasons).map(([keyword, count]) => (
                <div key={keyword} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <span className="text-foreground font-medium">{keyword}</span>
                  <span className={`text-lg font-bold ${count > 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informacoes da Auditoria */}
      <Card className="bg-secondary/30 border-border">
        <CardHeader>
          <CardTitle className="text-base">Sobre a Auditoria Operacional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-foreground mb-2">Objetivo</h4>
              <p>Garantir 100% das rotas encerradas no mesmo dia (D+0), melhorando a qualidade operacional e a conformidade das entregas de leite.</p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Responsavel</h4>
              <p>Josue - CCO (Centro de Controle Operacional)</p>
              <p className="mt-1">Suporte: Area de Tecnologia</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-foreground mb-2">Regras de Negocio</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Meta de encerramento: 100% das rotas encerradas no mesmo dia (D+0)</li>
              <li>Alerta critico: operacoes com % encerramento menor que 90%</li>
              <li>Alerta atencao: operacoes entre 90% e 95%</li>
              <li>KM incorreto nao impede encerramento, mas e um indicador auxiliar</li>
              <li>Litros descarregados = 0 em rota encerrada deve ser sinalizado</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Celulas Operacionais</h4>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="p-3 rounded bg-background/50">
                <span className="font-medium text-foreground">Celula 1</span>
                <p className="text-xs mt-1">9 operacoes: DPA, ITALAC, LACTALIS, NESTLE, PIRACANJUBA, VERDE CAMPO</p>
              </div>
              <div className="p-3 rounded bg-background/50">
                <span className="font-medium text-foreground">Celula 2</span>
                <p className="text-xs mt-1">10 operacoes: BRQ, DANONE, DEALE, ITALAC, CATUPIRY, LATPASSOS</p>
              </div>
              <div className="p-3 rounded bg-background/50">
                <span className="font-medium text-foreground">Celula 3</span>
                <p className="text-xs mt-1">9 operacoes: CBL, CCPR, ITALAC, LACTALIS, POLENGHI</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
