'use client'

import { useState, useMemo } from 'react'
import { CCOProvider, useCCO } from '@/components/cco-context'
import { UploadTab } from '@/components/upload-tab'
import { ExecutiveDashboard } from '@/components/executive-dashboard'
import { CellDetailTab } from '@/components/cell-detail-tab'
import { OperationalDetailTab } from '@/components/operational-detail-tab'
import { ActionPlanTab } from '@/components/action-plan-tab'
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
  { id: 'summary', label: 'Executive Summary', icon: 'dashboard' },
  { id: 'cell', label: 'Cell Analysis', icon: 'analytics' },
  { id: 'executive', label: 'Operations Management', icon: 'settings_suggest' },
  { id: 'upload', label: 'Upload/Action Plan', icon: 'cloud_upload' },
]

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<TabId>('summary')
  const { routes, referenceDate, auditPeriod, indicatorScope } = useCCO()
  
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
      {/* SideNavBar Component */}
      <nav className="fixed left-0 top-0 h-screen w-64 flex-col p-md z-40 bg-surface-container-low border-r border-outline-variant hidden md:flex">
        <div className="flex items-center gap-sm mb-xl mt-sm">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center overflow-hidden shrink-0">
            <span className="material-symbols-outlined text-on-primary">corporate_fare</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-headline-md text-headline-md text-primary truncate leading-tight">VIA Group CCO</span>
            <span className="font-label-md text-label-md text-on-surface-variant truncate">Operational Oversight</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-xs flex-grow">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-md px-3 py-2.5 rounded-lg transition-all duration-200 ease-in-out text-left
                ${activeTab === tab.id 
                  ? 'bg-primary-fixed-dim text-primary font-bold' 
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
            onClick={() => setActiveTab('operational')}
            className={`flex items-center gap-md px-3 py-2.5 rounded-lg transition-all duration-200 ease-in-out text-left
              ${activeTab === 'operational' 
                ? 'bg-primary-fixed-dim text-primary font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
              }`}
          >
            <span className={`material-symbols-outlined shrink-0 ${activeTab === 'operational' ? 'fill-current' : ''}`}>
              list_alt
            </span>
            <span className="font-label-lg text-label-lg truncate">Detalhamento</span>
          </button>
        </div>

        <div className="flex flex-col gap-xs pt-md mt-auto border-t border-outline-variant">
          <a className="flex items-center gap-md px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all hover:bg-surface-container-highest duration-200 ease-in-out" href="#">
            <span className="material-symbols-outlined shrink-0">settings</span>
            <span className="font-label-lg text-label-lg truncate">Settings</span>
          </a>
          <a className="flex items-center gap-md px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all hover:bg-surface-container-highest duration-200 ease-in-out" href="#">
            <span className="material-symbols-outlined shrink-0">contact_support</span>
            <span className="font-label-lg text-label-lg truncate">Support</span>
          </a>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-64 relative min-h-screen">
        {/* TopNavBar Component */}
        <header className="fixed top-0 right-0 left-0 md:left-64 z-30 flex items-center justify-between px-gutter h-16 bg-surface-container-lowest border-b border-outline-variant shadow-sm">
          <div className="flex items-center md:hidden gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-sm">corporate_fare</span>
            </div>
            <h1 className="font-headline-md text-primary font-bold">VIA Group CCO</h1>
          </div>
          
          <div className="hidden md:flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Auditoria Ativa</span>
            <span className="text-sm font-mono font-bold text-primary">
              {formatDateBR(auditPeriod.start)} ate {formatDateBR(auditPeriod.end)}
            </span>
          </div>

          <div className="flex items-center gap-lg">
            {/* Quick Stats Header */}
            <div className="hidden lg:flex items-center gap-4 border-r border-outline-variant pr-lg mr-xs">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Encerramento</span>
                  <span className={`text-sm font-bold ${summary.percentualEncerramento >= 95 ? 'text-success' : 'text-error'}`}>
                    {formatPercentage(summary.percentualEncerramento)}
                  </span>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Pendentes</span>
                  <span className="text-sm font-bold text-error">{formatNumber(pendentesTotal)}</span>
               </div>
            </div>

            <div className="flex items-center gap-xs">
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:scale-95">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:scale-95">
                <span className="material-symbols-outlined">help</span>
              </button>
              <div className="w-10 h-10 rounded-full overflow-hidden ml-xs border border-outline-variant cursor-pointer active:scale-95">
                <img 
                  alt="Executive User Profile" 
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFCHM54Ig1vZr-inMdxAH2_eDTUsMsHnFGEMQm621iDfm-KhxJ8eNxEFJdtvVMY-LgIJWs5HjKaq0aBmLtSj37ZD9Eacbho4d6J7lxa-rZ05zLztG-pes_Vc90691-u52nBqRn5alnWieDgFHVw1sC-BMK7dzMGhzNqc5GhwKdOHxd_WTIFZocNW0cl9EFxddxNKJ0pjTdh_ru0HOsEXYyxmlZl2msAhiV8ShPRTFNsuhBgmeVwMEgGS2_bvQOgFM3juZTtf1mnv4"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Canvas Area */}
        <main className="flex-1 overflow-y-auto pt-16 px-gutter pb-margin">
          <div className="max-w-[1600px] mx-auto mt-lg">
            {activeTab === 'summary' && <SummaryTab />}
            {activeTab === 'cell' && <CellDetailTab />}
            {activeTab === 'executive' && <ExecutiveDashboard />}
            {activeTab === 'upload' && <UploadTab />}
            {activeTab === 'operational' && <OperationalDetailTab />}
            {activeTab === 'action' && <ActionPlanTab />}
          </div>
        </main>
        
        {/* Simple Footer inside main area for branding */}
        <footer className="mt-auto py-md border-t border-outline-variant/30 flex items-center justify-between text-on-surface-variant px-gutter">
           <p className="text-xs">VIA Group - Operational BI Dashboard</p>
           <div className="flex gap-4 text-xs font-mono">
              <span>Cell: 3</span>
              <span>Ops: 28</span>
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
