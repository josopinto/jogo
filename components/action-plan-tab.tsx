'use client'

import { useMemo, useState } from 'react'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { analyzeDelayReasons, formatNumber, formatDateBR } from '@/lib/data-utils'
import { type ActionPlan, type ActionStatus, type ActionPriority, type CellNumber } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function ActionPlanTab() {
  const { routes } = useCCO()
  
  // Mock data for action plan (since it's usually dynamic in a real app)
  const actionPlans: ActionPlan[] = useMemo(() => [
    {
      id: 'ACT-092',
      auditoria: '2023-10-20',
      acao: 'Recalibrate Cell Alpha route variance algorithm',
      responsavel: 'J. Doe (Ops)',
      celula: 1,
      planta: 'Guarulhos - SP',
      prioridade: 'Alta',
      status: 'Atrasado',
      prazo: '2023-10-20',
      dataCriacao: '2023-10-15',
      dataConclusao: null,
      motivo: 'Inconsistência recorrente no KMM',
      impactoEsperado: 'Redução de 15% nas divergências de KM',
      observacao: 'Falar com TI local',
      evidencia: '',
      proximoPasso: 'Aguardando deploy do novo script'
    },
    {
      id: 'ACT-095',
      auditoria: '2023-10-24',
      acao: 'Update missing columns mapping in KMM template',
      responsavel: 'M. Silva (IT)',
      celula: 2,
      planta: 'RJ - Matriz',
      prioridade: 'Media',
      status: 'Em andamento',
      prazo: '2023-10-28',
      dataCriacao: '2023-10-24',
      dataConclusao: null,
      motivo: 'Parser falhando em colunas novas',
      impactoEsperado: 'Confiabilidade total na importação',
      observacao: '',
      evidencia: '',
      proximoPasso: 'Testar com arquivo Cell 2'
    },
    {
      id: 'ACT-098',
      auditoria: '2023-10-24',
      acao: 'Review Q2 audit exceptions report',
      responsavel: 'A. Costa (Audit)',
      celula: 'Todas',
      planta: 'Multi-Planta',
      prioridade: 'Baixa',
      status: 'Em andamento',
      prazo: '2023-11-05',
      dataCriacao: '2023-10-24',
      dataConclusao: null,
      motivo: 'Fechamento trimestral',
      impactoEsperado: 'Compliance 100%',
      observacao: '',
      evidencia: '',
      proximoPasso: 'Coletar assinaturas'
    }
  ], [])

  const stats = useMemo(() => {
    return {
      delayed: actionPlans.filter(p => p.status === 'Atrasado').length,
      inProgress: actionPlans.filter(p => p.status === 'Em andamento').length,
      completed: 28 // Mocked Q3 completed
    }
  }, [actionPlans])

  const delayReasons = useMemo(() => analyzeDelayReasons(routes), [routes])

  const isEmpty = routes.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center shadow-surface">
          <span className="material-symbols-outlined text-outline text-3xl">task</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-on-surface">Plano de Ação Vazio</h2>
          <p className="text-on-surface-variant">Importe dados para analisar motivos de atraso e gerar ações.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-xl">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface tracking-tight">Action Plan Matrix</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-sm">Strategic task management and operational remediation.</p>
        </div>
        <Button className="bg-primary text-on-primary px-6 h-11 rounded-xl font-bold shadow-md hover:bg-primary-container transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">add</span> New Action Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <Card className="executive-card p-md flex items-center gap-4 border border-outline-variant/30">
          <div className="w-14 h-14 rounded-full bg-error-container/20 flex items-center justify-center text-error border border-error/20">
            <span className="material-symbols-outlined text-3xl">warning</span>
          </div>
          <div>
            <p className="font-label-md text-[10px] text-on-surface-variant uppercase font-bold tracking-widest leading-none mb-1">Delayed Items</p>
            <p className="font-data-display text-4xl font-bold text-on-surface leading-none">{stats.delayed}</p>
          </div>
        </Card>

        <Card className="executive-card p-md flex items-center gap-4 border border-outline-variant/30">
          <div className="w-14 h-14 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary border border-secondary/20">
            <span className="material-symbols-outlined text-3xl">pending_actions</span>
          </div>
          <div>
            <p className="font-label-md text-[10px] text-on-surface-variant uppercase font-bold tracking-widest leading-none mb-1">In Progress</p>
            <p className="font-data-display text-4xl font-bold text-on-surface leading-none">{stats.inProgress}</p>
          </div>
        </Card>

        <Card className="executive-card p-md flex items-center gap-4 border border-outline-variant/30">
          <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface border border-outline-variant/50">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <div>
            <p className="font-label-md text-[10px] text-on-surface-variant uppercase font-bold tracking-widest leading-none mb-1">Completed (Q3)</p>
            <p className="font-data-display text-4xl font-bold text-on-surface leading-none">{stats.completed}</p>
          </div>
        </Card>
      </div>

      {/* Action List Table */}
      <Card className="executive-card overflow-hidden border border-outline-variant/50">
        <div className="px-xl py-md border-b border-outline-variant/20 flex justify-between items-center bg-surface-bright/30">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
             <span className="material-symbols-outlined text-secondary">assignment_turned_in</span>
             Active Remediation Tasks
          </h3>
          <div className="flex gap-4">
            <button className="text-secondary font-bold text-xs hover:text-primary uppercase tracking-widest">Filter</button>
            <button className="text-secondary font-bold text-xs hover:text-primary uppercase tracking-widest">Export</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-surface-container-low border-b border-outline-variant/20 h-[52px]">
                <TableHead className="px-xl font-label-lg text-label-lg text-on-surface-variant font-bold uppercase text-[10px]">ID</TableHead>
                <TableHead className="px-md font-label-lg text-label-lg text-on-surface-variant font-bold uppercase text-[10px]">Priority</TableHead>
                <TableHead className="px-md font-label-lg text-label-lg text-on-surface-variant font-bold uppercase text-[10px] w-1/3">Task Description</TableHead>
                <TableHead className="px-md font-label-lg text-label-lg text-on-surface-variant font-bold uppercase text-[10px]">Responsible</TableHead>
                <TableHead className="px-md font-label-lg text-label-lg text-on-surface-variant font-bold uppercase text-[10px]">Due Date</TableHead>
                <TableHead className="px-xl font-label-lg text-label-lg text-on-surface-variant font-bold uppercase text-[10px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actionPlans.map((plan, idx) => (
                <TableRow key={plan.id} className={`h-[60px] border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors group ${idx % 2 !== 0 ? 'bg-surface-bright/10' : ''}`}>
                  <td className="px-xl font-body-sm text-xs text-on-surface-variant font-mono">{plan.id}</td>
                  <td className="px-md">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border
                      ${plan.prioridade === 'Alta' ? 'bg-error-container/20 text-error border-error/30' : 
                        plan.prioridade === 'Media' ? 'bg-secondary-container/20 text-secondary border-secondary/30' : 
                        'bg-surface-container-highest text-on-surface border-outline-variant/50'}
                    `}>
                      {plan.prioridade}
                    </span>
                  </td>
                  <td className="px-md font-body-sm text-sm text-on-surface font-semibold truncate max-w-[300px]" title={plan.acao}>{plan.acao}</td>
                  <td className="px-md font-body-sm text-xs text-on-surface-variant">{plan.responsavel}</td>
                  <td className="px-md font-body-sm text-xs font-bold text-on-surface-variant">{formatDateBR(plan.prazo)}</td>
                  <td className="px-xl">
                    <span className={`flex items-center gap-1.5 text-xs font-bold
                      ${plan.status === 'Atrasado' ? 'text-error' : 'text-secondary'}
                    `}>
                      <span className="material-symbols-outlined text-[16px]">{plan.status === 'Atrasado' ? 'error' : 'sync'}</span>
                      {plan.status}
                    </span>
                  </td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delay Reasons Analysis */}
      <Card className="bg-surface-container-lowest rounded-xl p-lg shadow-surface border border-outline-variant/50">
        <CardHeader className="p-0 mb-lg flex flex-row items-center justify-between">
           <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Análise de Motivos de Atraso</CardTitle>
              <CardDescription className="text-xs">IDENTIFICADOS NAS OBSERVAÇÕES DO KMM</CardDescription>
           </div>
           <span className="material-symbols-outlined text-primary/50 text-3xl">analytics</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-md">
            {Object.entries(delayReasons).map(([reason, count]) => (
              <div key={reason} className="bg-surface-container-low p-md rounded-xl border border-outline-variant/20 group hover:border-primary/30 transition-all cursor-default shadow-sm">
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-tighter mb-1 truncate" title={reason}>{reason}</p>
                <p className="text-xl font-bold text-on-surface leading-none group-hover:text-primary transition-colors">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
