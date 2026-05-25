'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { type Route, type CellNumber, type AppState, type FilterScope } from '@/lib/types'
import { INITIAL_STATE } from '@/lib/initial-data'
import { normalizeDateToISO } from '@/lib/data-utils'

interface CCOContextType {
  routes: Route[]
  lastUpload: string | null
  referenceDate: string | null // ISO format YYYY-MM-DD
  auditPeriod: { start: string | null; end: string | null } // ISO format YYYY-MM-DD
  indicatorScope: FilterScope
  uploadSummary: { cell1: number; cell2: number; cell3: number }
  addRoutes: (newRoutes: Route[], celula: CellNumber, periodStart: string, periodEnd: string) => void
  clearCellRoutes: (celula: CellNumber) => void
  setLastUpload: (date: string) => void
  setReferenceDate: (date: string | null) => void
  setAuditPeriod: (start: string | null, end: string | null) => void
  setIndicatorScope: (scope: FilterScope) => void
}

const CCOContext = createContext<CCOContextType | undefined>(undefined)

export function CCOProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL_STATE)

  const addRoutes = useCallback((newRoutes: Route[], celula: CellNumber, periodStart: string, periodEnd: string) => {
    setState(prev => {
      const startISO = normalizeDateToISO(periodStart)
      const endISO = normalizeDateToISO(periodEnd)

      // Remover rotas antigas da mesma célula que pertencem ao mesmo período de auditoria
      const otherRoutes = prev.routes.filter(r => 
        !(r.celula === celula && r.dataAuditoriaInicio === startISO && r.dataAuditoriaFim === endISO)
      )
      
      const updatedRoutes = [...otherRoutes, ...newRoutes]
      const cellCount = updatedRoutes.filter(r => r.celula === celula).length
      
      return {
        ...prev,
        routes: updatedRoutes,
        uploadSummary: {
          ...prev.uploadSummary,
          [`cell${celula}`]: cellCount
        }
      }
    })
  }, [])

  const clearCellRoutes = useCallback((celula: CellNumber) => {
    setState(prev => ({
      ...prev,
      routes: prev.routes.filter(r => r.celula !== celula),
      uploadSummary: {
        ...prev.uploadSummary,
        [`cell${celula}`]: 0
      }
    }))
  }, [])

  const setLastUpload = useCallback((date: string) => {
    setState(prev => ({ ...prev, lastUpload: date }))
  }, [])

  const setReferenceDate = useCallback((date: string | null) => {
    setState(prev => ({ ...prev, referenceDate: normalizeDateToISO(date) }))
  }, [])

  const setAuditPeriod = useCallback((start: string | null, end: string | null) => {
    setState(prev => ({ 
      ...prev, 
      auditPeriod: { 
        start: normalizeDateToISO(start), 
        end: normalizeDateToISO(end) 
      } 
    }))
  }, [])

  const setIndicatorScope = useCallback((scope: FilterScope) => {
    setState(prev => ({ ...prev, indicatorScope: scope }))
  }, [])

  return (
    <CCOContext.Provider
      value={{
        routes: state.routes,
        lastUpload: state.lastUpload,
        referenceDate: state.referenceDate,
        auditPeriod: state.auditPeriod,
        indicatorScope: state.indicatorScope,
        uploadSummary: state.uploadSummary,
        addRoutes,
        clearCellRoutes,
        setLastUpload,
        setReferenceDate,
        setAuditPeriod,
        setIndicatorScope
      }}
    >
      {children}
    </CCOContext.Provider>
  )
}

export function useCCO() {
  const context = useContext(CCOContext)
  if (context === undefined) {
    throw new Error('useCCO must be used within a CCOProvider')
  }
  return context
}
