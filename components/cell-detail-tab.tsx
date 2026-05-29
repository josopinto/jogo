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
  formatDateBR,
  isSemContraLeite,
  isKmStatusIncorreto
} from '@/lib/data-utils'
import { type CellNumber } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

  const routesInAudit = useMemo(() => {
    return filterRoutesByAuditPeriod(routes, auditPeriod.start, auditPeriod.end)
  }, [routes, auditPeriod])

  const cellSummaries = useMemo(() => {
    return ([1, 2, 3] as CellNumber[]).map(c => calculateCellSummary(routesInAudit, c, referenceDate))
  }, [routesInAudit, referenceDate])

  const activeCellSummary = useMemo(() => {
    return cellSummaries.find(s => s.celula === selectedCell) || cellSummaries[0]
  }, [cellSummaries, selectedCell])

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
           semContraLeite: pRoutes.filter(r => isSemContraLeite(r)).length,
           kmErrado: pRoutes.filter(r => isKmStatusIncorreto(r)).length
        }
     })
  }, [routesInAudit, selectedCell, indicatorScope, referenceDate])

  const rankingData = useMemo(() => {
    return [...activeCellSummary.plantas]
      .sort((a, b) => a.percentualEncerramento - b.percentualEncerramento)
      .map(p => ({
        name: p.planta.length > 25 ? p.planta.substring(0, 23) + '...' : p.planta,
        fullName: p.planta,
        percentual: p.percentualEncerramento,
        fill: p.percentualEncerramento >= 95 ? '#00c9a7' : p.percentualEncerramento >= 90 ? '#ffd166' : '#ff6b6b'
      }))
  }, [activeCellSummary])

  const isEmpty = routes.length === 0

  // --- RENDER ---

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center shadow-surface">
          <span className="material-symbols-outlined text-outline text-3xl">analytics</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-on-surface">Nenhum arquivo importado</h2>
          <p className="text-on-surface-variant">Faça upload dos dados para ver o detalhe por célula.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-xl">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-2 tracking-tight">Análise por Célula</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Visão operacional detalhada por agrupamento logístico.</p>
        </div>
        <div className="hidden md:block text-right">
           <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Período</span>
           <p className="text-sm font-mono font-bold text-primary">{formatDateBR(auditPeriod.start)} - {formatDateBR(auditPeriod.end)}</p>
        </div>
      </div>

      {/* Cell Selector (Summary Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {cellSummaries.map((summary) => {
          const isActive = selectedCell === summary.celula
          const isCritical = summary.percentualCritico > 10
          
          return (
            <div 
              key={summary.celula}
              onClick={() => setSelectedCell(summary.celula)}
              className={`bg-surface-container-lowest rounded-xl shadow-surface p-md cursor-pointer relative overflow-hidden transition-all hover:shadow-overlay border-2
                ${isActive ? 'border-primary' : 'border-outline-variant/30 opacity-80 hover:opacity-100'}
              `}
            >
              {isActive && <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-[32px] -z-10"></div>}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`font-headline-md text-headline-md ${isActive ? 'text-primary' : 'text-on-surface'}`}>Célula {summary.celula}</h3>
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    {summary.celula === 1 ? 'Sudeste / Sul' : summary.celula === 2 ? 'Nordeste' : 'Centro-Oeste / Norte'}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-label-md text-[11px] font-bold
                  ${isCritical ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-on-surface-variant'}
                `}>
                  {isCritical && <span className="material-symbols-outlined text-[14px]">warning</span>}
                  {isCritical ? 'Crítico' : 'Estável'}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="font-body-sm text-[10px] font-bold uppercase text-on-surface-variant mb-1">Total Rotas</p>
                  <p className="font-headline-lg text-headline-lg text-on-surface leading-none">{formatNumber(summary.totalRotas)}</p>
                </div>
                <div className="text-right">
                  <p className="font-body-sm text-[10px] font-bold uppercase text-on-surface-variant mb-1">% Crítico</p>
                  <p className={`font-headline-lg text-headline-lg leading-none ${isCritical ? 'text-error' : 'text-on-surface'}`}>
                    {formatPercentage(summary.percentualCritico)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Cell Detailed View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left Column: KPIs (Span 8) */}
        <div className="lg:col-span-8 flex flex-col gap-gutter">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-gutter">
            {/* Total Rotas */}
            <Card className="bg-surface-container-lowest rounded-xl shadow-surface p-lg flex flex-col border border-outline-variant/30">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">route</span>
                <h4 className="font-body-md text-on-surface-variant font-semibold">Total Rotas</h4>
              </div>
              <div className="mt-auto">
                <span className="font-display-lg text-display-lg text-on-surface block leading-none">{formatNumber(activeCellSummary.totalRotas)}</span>
                <span className="font-body-sm text-on-surface-variant mt-1 block tracking-tighter uppercase font-bold text-[9px]">Volume planejado</span>
              </div>
            </Card>

            {/* Pendentes */}
            <Card className="bg-surface-container-lowest rounded-xl shadow-surface p-lg flex flex-col border-b-4 border-error border-x border-t border-outline-variant/30">
              <div className="flex items-center gap-2 mb-4 text-error">
                <span className="material-symbols-outlined text-[20px]">pending_actions</span>
                <h4 className="font-body-md text-error font-semibold">Pendentes</h4>
              </div>
              <div className="mt-auto">
                <span className="font-display-lg text-display-lg text-error block leading-none">{formatNumber(activeCellSummary.pendencias)}</span>
                <span className="font-body-sm text-on-surface-variant mt-1 block tracking-tighter uppercase font-bold text-[9px]">Aguardando ação</span>
              </div>
            </Card>

            {/* Sem Contra Leite */}
            <Card className="bg-surface-container-lowest rounded-xl shadow-surface p-lg flex flex-col border border-outline-variant/30">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                <h4 className="font-body-md text-on-surface-variant font-semibold uppercase text-[11px] tracking-tighter">S. Contra Leite*</h4>
              </div>
              <div className="mt-auto">
                <span className="font-display-lg text-display-lg text-on-surface block leading-none">{formatNumber(activeCellSummary.semContraLeite)}</span>
                <span className="font-body-sm text-on-surface-variant mt-1 block tracking-tighter uppercase font-bold text-[9px]">Doc. faltante</span>
              </div>
            </Card>

            {/* KM Errado */}
            <Card className="bg-surface-container-lowest rounded-xl shadow-surface p-lg flex flex-col border border-outline-variant/30">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">wrong_location</span>
                <h4 className="font-body-md text-on-surface-variant font-semibold">KM Incorreto*</h4>
              </div>
              <div className="mt-auto">
                <span className="font-display-lg text-display-lg text-on-surface block leading-none">{formatNumber(activeCellSummary.kmErrado)}</span>
                <span className="font-body-sm text-on-surface-variant mt-1 block tracking-tighter uppercase font-bold text-[9px]">Desvios de rota</span>
              </div>
            </Card>

            {/* Regresso Antigo */}
            <Card className="bg-surface-container-lowest rounded-xl shadow-surface p-lg flex flex-col border-b-4 border-error border-x border-t border-outline-variant/30">
              <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">history_toggle_off</span>
                <h4 className="font-body-md text-on-surface-variant font-semibold">Regresso Antigo</h4>
              </div>
              <div className="mt-auto">
                <span className="font-display-lg text-display-lg text-error block leading-none">{formatNumber(activeCellSummary.regressoAntigo)}</span>
                <span className="font-body-sm text-on-surface-variant mt-1 block tracking-tighter uppercase font-bold text-[9px]">Atraso &gt; Ref.</span>
              </div>
            </Card>

            <div className="bg-surface-container-low rounded-xl p-lg flex items-center justify-center border border-dashed border-outline-variant/50 opacity-40">
              <span className="font-body-sm text-outline uppercase font-bold tracking-tighter">Espaço Reservado</span>
            </div>
          </div>

          {/* Ranking Vertical Chart */}
          <Card className="bg-surface-container-lowest rounded-xl shadow-surface border border-outline-variant/50 overflow-hidden text-on-surface">
            <CardHeader className="border-b border-outline-variant/30 px-lg py-md">
               <CardTitle className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">Ranking de Encerramento por Planta</CardTitle>
            </CardHeader>
            <CardContent className="h-96 p-lg">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingData} layout="vertical" margin={{ left: 20, right: 40 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                     <XAxis type="number" domain={[0, 100]} hide />
                     <YAxis type="category" dataKey="name" stroke="#737783" fontSize={10} width={120} axisLine={false} tickLine={false} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Eficiência']}
                     />
                     <Bar dataKey="percentual" radius={[0, 4, 4, 0]} barSize={24}>
                        {rankingData.map((entry, index) => (
                           <RechartsCell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Health & Top Plants (Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-gutter">
          {/* Health Indicator */}
          <div className="bg-surface-container-lowest rounded-xl shadow-surface p-lg flex flex-col items-center justify-center relative overflow-hidden h-[280px] border border-outline-variant/30">
            <div className={`absolute inset-0 opacity-10 ${activeCellSummary.percentualCritico > 10 ? 'bg-error' : 'bg-success'}`}></div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-6 relative z-10 w-full text-left tracking-tight">Saúde da Célula {selectedCell}</h3>
            
            <div className="relative w-40 h-40 rounded-full flex items-center justify-center bg-surface-container-highest" 
                 style={{ background: `conic-gradient(${activeCellSummary.percentualCritico > 10 ? '#ba1a1a' : '#147832'} 0% ${activeCellSummary.percentualCritico}%, #e6e8ea ${activeCellSummary.percentualCritico}% 100%)` }}>
              <div className="absolute inset-3 bg-surface-container-lowest rounded-full flex flex-col items-center justify-center shadow-inner">
                <span className={`font-headline-lg text-headline-lg leading-none ${activeCellSummary.percentualCritico > 10 ? 'text-error' : 'text-success'}`}>
                  {formatPercentage(activeCellSummary.percentualCritico)}
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase mt-1 tracking-widest">Crítico</span>
              </div>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant mt-4 text-center z-10 font-medium leading-tight">
              Meta: &lt; 5% <br/> 
              <span className={`text-[11px] uppercase tracking-wider ${activeCellSummary.percentualCritico > 10 ? 'text-error font-bold animate-pulse' : 'text-success font-bold'}`}>
                {activeCellSummary.percentualCritico > 10 ? 'Ação Corretiva Necessária' : 'Operação Estável'}
              </span>
            </p>
          </div>

          {/* Top Plants List */}
          <div className="bg-surface-container-lowest rounded-xl shadow-surface flex flex-col flex-1 border border-outline-variant/30 overflow-hidden">
            <div className="h-[56px] px-lg border-b border-outline-variant/30 flex items-center justify-between bg-surface-bright/30">
              <h3 className="font-headline-md text-headline-md text-on-surface tracking-tight">Top Ofensoras</h3>
              <span className="material-symbols-outlined text-on-surface-variant">sort</span>
            </div>
            <div className="p-0 flex-1 overflow-y-auto max-h-[400px] divide-y divide-outline-variant/10 text-on-surface">
              {activeCellSummary.plantas
                .sort((a, b) => b.totalCritico - a.totalCritico)
                .slice(0, 8)
                .map((p, idx) => (
                  <div key={p.planta} className={`flex items-center justify-between px-lg py-4 hover:bg-surface-container-low transition-colors cursor-default ${idx % 2 !== 0 ? 'bg-surface-bright/20' : ''}`}>
                    <div className="flex flex-col">
                      <span className="font-label-lg text-label-lg font-bold truncate max-w-[180px]" title={p.planta}>{p.planta}</span>
                      <span className="font-body-sm text-[11px] text-on-surface-variant">{p.pendencias} Pendentes</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-headline-md text-xl font-black ${p.percentualCritico > 20 ? 'text-error' : 'text-on-surface-variant'}`}>
                        {formatPercentage(p.percentualCritico)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Table Section */}
      <Card className="bg-surface-container-lowest rounded-xl shadow-surface border border-outline-variant/50 overflow-hidden text-on-surface">
        <div className="h-[56px] px-lg border-b border-outline-variant/30 flex items-center justify-between bg-surface-bright/30">
          <h3 className="font-headline-md text-headline-md text-on-surface tracking-tight">Resumo por Planta (Célula {selectedCell})</h3>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest hidden sm:block">Listagem Completa</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-lg py-3 font-label-lg text-[10px] uppercase font-bold text-on-surface-variant">Planta</th>
                <th className="px-lg py-3 font-label-lg text-[10px] uppercase font-bold text-on-surface-variant text-right">Total</th>
                <th className="px-lg py-3 font-label-lg text-[10px] uppercase font-bold text-error text-right">Pend.</th>
                <th className="px-lg py-3 font-label-lg text-[10px] uppercase font-bold text-warning text-right">SCL*</th>
                <th className="px-lg py-3 font-label-lg text-[10px] uppercase font-bold text-orange text-right">KM*</th>
                <th className="px-lg py-3 font-label-lg text-[10px] uppercase font-bold text-error text-right">Reg.A</th>
                <th className="px-lg py-3 font-label-lg text-[10px] uppercase font-bold text-on-surface-variant text-right">% Enc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {activeCellSummary.plantas.sort((a,b) => a.percentualEncerramento - b.percentualEncerramento).map((p, idx) => {
                const pInScope = plantIndicatorStats.find(s => s.planta === p.planta)
                return (
                  <tr key={p.planta} className={`hover:bg-surface-container-low transition-colors group ${idx % 2 !== 0 ? 'bg-surface-bright/10' : ''}`}>
                    <td className="px-lg py-4 font-bold text-on-surface">{p.planta}</td>
                    <td className="px-lg py-4 text-right text-on-surface-variant font-medium">{formatNumber(p.totalRotas)}</td>
                    <td className="px-lg py-4 text-right text-error font-black">{formatNumber(p.pendencias)}</td>
                    <td className="px-lg py-4 text-right text-warning font-bold">{formatNumber(pInScope?.semContraLeite || 0)}</td>
                    <td className="px-lg py-4 text-right text-orange font-bold">{formatNumber(pInScope?.kmErrado || 0)}</td>
                    <td className="px-lg py-4 text-right text-error font-medium">{formatNumber(p.regressoAntigo)}</td>
                    <td className="px-lg py-4 text-right">
                      <span className={`px-2 py-1 rounded-full font-bold text-[10px] shadow-sm ${getPercentageColor(p.percentualEncerramento)} text-on-primary`}>
                        {formatPercentage(p.percentualEncerramento)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
