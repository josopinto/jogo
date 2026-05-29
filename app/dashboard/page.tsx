'use client'

import { useState, useMemo } from 'react'
import { CCOProvider, useCCO } from '@/components/cco-context'
import { UploadTab } from '@/components/upload-tab'
import { ExecutiveDashboard } from '@/components/executive-dashboard'
import { CellDetailTab } from '@/components/cell-detail-tab'
import { OperationalDetailTab } from '@/components/operational-detail-tab'
import { SummaryTab } from '@/components/summary-tab'
import { 
  calculateGlobalSummary, 
  formatPercentage, 
  formatNumber, 
  filterRoutesByAuditPeriod, 
  applyStatusScope,
  formatDateBR 
} from '@/lib/data-utils'

type TabId = 'upload' | 'summary' | 'executive' | 'cell' | 'operational' | 'action'

interface Tab {
  id: TabId
  label: string
  icon: string
}

const mainTabs: Tab[] = [
  { id: 'summary', label: 'Resumo Executivo', icon: 'dashboard' },
  { id: 'cell', label: 'Análise por Célula', icon: 'analytics' },
  { id: 'executive', label: 'Visão Geral', icon: 'settings_suggest' },
  { id: 'upload', label: 'Importação', icon: 'cloud_upload' },
]

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<TabId>('summary')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { routes, referenceDate, auditPeriod, indicatorScope } = useCCO()

  // Troca de aba e fecha o menu lateral (relevante no mobile)
  const goTab = (id: TabId) => {
    setActiveTab(id)
    setSidebarOpen(false)
  }
  
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
    <div className="flex min-h-screen bg-surface text-on-surface antialiased">
      {/* Backdrop do menu no mobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40 md:hidden" aria-hidden="true" />
      )}

      {/* Sidebar de Navegação */}
      <nav className={`fixed left-0 top-0 h-screen w-64 flex-col p-md z-50 bg-surface-container-low border-r border-outline-variant shadow-sm flex transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary active:scale-95"
          aria-label="Fechar menu"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="flex items-center gap-sm mb-xl mt-sm">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center overflow-hidden shrink-0 shadow-surface">
            <span className="material-symbols-outlined text-on-primary">corporate_fare</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-headline-md text-headline-md text-primary truncate leading-tight tracking-tight">VIA Group CCO</span>
            <span className="font-label-md text-label-md text-on-surface-variant truncate">Gestão Operacional</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-xs flex-grow">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => goTab(tab.id)}
              className={`flex items-center gap-md px-3 py-2.5 rounded-lg transition-all duration-200 ease-in-out text-left
                ${activeTab === tab.id 
                  ? 'bg-primary-fixed-dim text-primary font-bold shadow-sm' 
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
                }`}
            >
              <span className={`material-symbols-outlined shrink-0 ${activeTab === tab.id ? 'fill-current' : ''}`}>
                {tab.icon}
              </span>
              <span className="font-label-lg text-label-lg truncate">{tab.label}</span>
            </button>
          ))}
          
          <button
            onClick={() => goTab('operational')}
            className={`flex items-center gap-md px-3 py-2.5 rounded-lg transition-all duration-200 ease-in-out text-left
              ${activeTab === 'operational'
                ? 'bg-primary-fixed-dim text-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              }`}
          >
            <span className={`material-symbols-outlined shrink-0 ${activeTab === 'operational' ? 'fill-current' : ''}`}>
              list_alt
            </span>
            <span className="font-label-lg text-label-lg truncate">Detalhamento</span>
          </button>
        </div>

        <div className="pt-md mt-auto border-t border-outline-variant/30">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">VIA Group · CCO v2.0</p>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col md:ml-64 relative min-h-screen">
        {/* TopNavBar Principal */}
        <header className="fixed top-0 right-0 left-0 md:left-64 z-30 flex items-center justify-between px-gutter h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm">
          <div className="flex items-center md:hidden gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary active:scale-95"
              aria-label="Abrir menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-sm">corporate_fare</span>
            </div>
            <h1 className="font-headline-md text-primary font-bold tracking-tight text-lg">VIA Group CCO</h1>
          </div>
          
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Período Selecionado</span>
            <span className="text-sm font-mono font-bold text-primary">
              {formatDateBR(auditPeriod.start)} até {formatDateBR(auditPeriod.end)}
            </span>
          </div>

          <div className="flex items-center gap-lg">
            {/* Indicadores no Header */}
            <div className="hidden lg:flex items-center gap-4">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant leading-none mb-1 tracking-tighter">Encerramento</span>
                  <span className={`text-sm font-bold ${summary.percentualEncerramento >= 95 ? 'text-success' : 'text-error'}`}>
                    {formatPercentage(summary.percentualEncerramento)}
                  </span>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant leading-none mb-1 tracking-tighter text-error">Pendentes</span>
                  <span className="text-sm font-bold text-error">{formatNumber(pendentesTotal)}</span>
               </div>
            </div>
          </div>
        </header>

        {/* Área de Visualização das Abas */}
        <main className="flex-1 overflow-y-auto pt-16 px-gutter pb-margin">
          <div className="max-w-[1600px] mx-auto mt-lg">
            {activeTab === 'summary' && <SummaryTab />}
            {activeTab === 'cell' && <CellDetailTab />}
            {activeTab === 'executive' && <ExecutiveDashboard />}
            {activeTab === 'upload' && <UploadTab />}
            {activeTab === 'operational' && <OperationalDetailTab />}
          </div>
        </main>
        
        {/* Rodapé Interno */}
        <footer className="mt-auto py-md border-t border-outline-variant/30 flex flex-col md:flex-row items-center justify-between text-on-surface-variant px-gutter gap-4">
           <p className="text-xs font-medium">VIA Group - Sistema de BI Operacional do CCO</p>
           <div className="flex gap-4 text-xs font-mono font-bold">
              <span>Células: 3</span>
              <span>Plantas: 28</span>
              <span>Total Rotas: {formatNumber(totalRoutes)}</span>
           </div>
        </footer>
      </div>
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
