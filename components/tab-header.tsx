'use client'

import { useMemo } from 'react'
import { useCCO } from './cco-context'
import { calculateGlobalSummary, formatNumber, formatPercentage } from '@/lib/data-utils'

interface TabHeaderProps {
  title: string
  description: string
  showGlobalKpis?: boolean
}

export function TabHeader({ title, description, showGlobalKpis = true }: TabHeaderProps) {
  const { routes, lastUpload, uploadSummary } = useCCO()
  
  const summary = useMemo(() => calculateGlobalSummary(routes), [routes])
  
  const totalRoutes = uploadSummary.cell1 + uploadSummary.cell2 + uploadSummary.cell3
  const pendentesTotal = summary.pendencias + summary.emExecucao + summary.previsto + summary.regresso

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      
      {showGlobalKpis && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-secondary/80 to-secondary/40 border border-border">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* Percentual Encerramento */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${summary.percentualEncerramento >= 95 ? 'bg-success' : summary.percentualEncerramento >= 90 ? 'bg-warning' : 'bg-danger'}`} />
              <span className="text-sm text-muted-foreground">Encerramento:</span>
              <span className={`text-lg font-bold ${summary.percentualEncerramento >= 95 ? 'text-success' : summary.percentualEncerramento >= 90 ? 'text-warning' : 'text-danger'}`}>
                {formatPercentage(summary.percentualEncerramento)}
              </span>
            </div>
            
            {/* Divisor */}
            <div className="hidden sm:block w-px h-6 bg-border" />
            
            {/* Total Rotas */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="text-lg font-bold text-foreground">{formatNumber(totalRoutes)}</span>
              <span className="text-xs text-muted-foreground">rotas</span>
            </div>
            
            {/* Divisor */}
            <div className="hidden sm:block w-px h-6 bg-border" />
            
            {/* Encerradas */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Encerradas:</span>
              <span className="text-lg font-bold text-success">{formatNumber(summary.encerradas)}</span>
            </div>
            
            {/* Divisor */}
            <div className="hidden sm:block w-px h-6 bg-border" />
            
            {/* Pendentes */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Pendentes:</span>
              <span className="text-lg font-bold text-danger">{formatNumber(pendentesTotal)}</span>
            </div>
            
            {/* Divisor */}
            <div className="hidden sm:block w-px h-6 bg-border" />
            
            {/* Sem Contra Leite */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sem Contra Leite:</span>
              <span className="text-lg font-bold text-warning">{formatNumber(summary.semContraLeite)}</span>
            </div>
            
            {/* Divisor */}
            <div className="hidden sm:block w-px h-6 bg-border" />
            
            {/* KM Incorreto */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">KM Incorreto:</span>
              <span className="text-lg font-bold text-orange">{formatNumber(summary.kmIncorreto)}</span>
            </div>
            
            {/* Divisor */}
            <div className="hidden lg:block w-px h-6 bg-border" />
            
            {/* Ultimo Upload */}
            {lastUpload && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-muted-foreground">Atualizado: {lastUpload}</span>
              </div>
            )}
          </div>
          
          {/* Detalhes por Celula */}
          <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-4 text-xs">
            {summary.cells.map(cell => (
              <div key={cell.celula} className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-medium">C{cell.celula}</span>
                <span className="text-muted-foreground">{formatNumber(cell.totalRotas)} rotas</span>
                <span className="text-muted-foreground">|</span>
                <span className={`font-medium ${cell.percentualEncerramento >= 95 ? 'text-success' : cell.percentualEncerramento >= 90 ? 'text-warning' : 'text-danger'}`}>
                  {formatPercentage(cell.percentualEncerramento)}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-danger">{cell.pendencias + cell.emExecucao + cell.previsto + cell.regresso} pend.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
