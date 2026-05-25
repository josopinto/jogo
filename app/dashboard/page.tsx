'use client'

import { useState, useMemo } from 'react'
import { CCOProvider, useCCO } from '@/components/cco-context'
import { UploadTab } from '@/components/upload-tab'
import { ExecutiveDashboard } from '@/components/executive-dashboard'
import { CellDetailTab } from '@/components/cell-detail-tab'
import { OperationalDetailTab } from '@/components/operational-detail-tab'
import { ActionPlanTab } from '@/components/action-plan-tab'
import { SummaryTab } from '@/components/summary-tab'
import { calculateGlobalSummary, formatPercentage, formatNumber, filterRoutesByAuditPeriod, applyStatusScope } from '@/lib/data-utils'

type TabId = 'upload' | 'summary' | 'executive' | 'cell' | 'operational' | 'action'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  { 
    id: 'upload', 
    label: 'Upload', 
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    )
  },
  { 
    id: 'summary', 
    label: 'Resumo', 
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  { 
    id: 'executive', 
    label: 'Visao Geral', 
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    id: 'cell', 
    label: 'Por Celula', 
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  },
  { 
    id: 'operational', 
    label: 'Detalhamento', 
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )
  },
  { 
    id: 'action', 
    label: 'Plano de Acao', 
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
]

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<TabId>('summary')
  const { routes, uploadSummary, referenceDate, auditPeriod, indicatorScope } = useCCO()
  
  // Base Filtrada pelo Período de Auditoria para o Header
  const routesInAudit = useMemo(() => {
    return filterRoutesByAuditPeriod(routes, auditPeriod.start, auditPeriod.end)
  }, [routes, auditPeriod])

  const summary = useMemo(() => calculateGlobalSummary(routesInAudit, referenceDate), [routesInAudit, referenceDate])
  
  // Indicadores respeitando o escopo para contra-leite e KM no header
  const routesInScope = useMemo(() => {
    return applyStatusScope(routesInAudit, indicatorScope, referenceDate)
  }, [routesInAudit, indicatorScope, referenceDate])
  
  const indicatorStats = useMemo(() => calculateGlobalSummary(routesInScope, referenceDate), [routesInScope, referenceDate])

  const totalRoutes = summary.totalRotas
  const pendentesTotal = summary.pendencias

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Header Principal */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">CCO BI - Auditoria Operacional</h1>
                <p className="text-xs text-muted-foreground">VIA Group - Transporte de Leite e Agronegocios</p>
              </div>
            </div>
            
            {/* KPIs Resumidos no Header */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex flex-col items-end mr-4 border-r border-border pr-4">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase">Auditoria Ativa</span>
                 <span className="text-xs font-mono font-bold text-primary">{auditPeriod.start || '---'} ate {auditPeriod.end || '---'}</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50">
                <span className="text-xs text-muted-foreground">Encerramento:</span>
                <span className={`text-sm font-bold ${summary.percentualEncerramento >= 95 ? 'text-success' : 'text-danger'}`}>
                  {formatPercentage(summary.percentualEncerramento)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50">
                <span className="text-xs text-muted-foreground">Pendentes:</span>
                <span className="text-sm font-bold text-danger">{formatNumber(summary.pendencias)}</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50">
                <span className="text-xs text-muted-foreground">S.C. Leite*:</span>
                <span className="text-sm font-bold text-warning">{formatNumber(indicatorStats.semContraLeite)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs com Indicadores */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto py-2" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Barra de Status Rapido - Mobile */}
      <div className="lg:hidden border-b border-border bg-secondary/30 px-4 py-2">
        <div className="container mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${summary.percentualEncerramento >= 95 ? 'bg-success' : summary.percentualEncerramento >= 90 ? 'bg-warning' : 'bg-danger animate-pulse'}`} />
            <span className={`font-bold ${summary.percentualEncerramento >= 95 ? 'text-success' : summary.percentualEncerramento >= 90 ? 'text-warning' : 'text-danger'}`}>
              {formatPercentage(summary.percentualEncerramento)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Total: <strong className="text-foreground">{formatNumber(summary.totalRotas)}</strong></span>
            <span className="text-muted-foreground">Pend: <strong className="text-danger">{formatNumber(pendentesTotal)}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {activeTab === 'upload' && <UploadTab />}
        {activeTab === 'summary' && <SummaryTab />}
        {activeTab === 'executive' && <ExecutiveDashboard />}
        {activeTab === 'cell' && <CellDetailTab />}
        {activeTab === 'operational' && <OperationalDetailTab />}
        {activeTab === 'action' && <ActionPlanTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4 mt-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>VIA Group - Sistema de BI do CCO - Auditoria Operacional</p>
            <div className="flex items-center gap-4">
              <span>Celulas: 3</span>
              <span>|</span>
              <span>Operacoes: 28</span>
              <span>|</span>
              <span>Rotas: {formatNumber(totalRoutes)}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <CCOProvider>
      <DashboardContent />
    </CCOProvider>
  )
}
