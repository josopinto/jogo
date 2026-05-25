'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { type Route, type CellNumber, type AppState } from '@/lib/types'
import { INITIAL_STATE, INITIAL_ROUTES } from '@/lib/initial-data'

interface CCOContextType {
  routes: Route[]
  lastUpload: string | null
  referenceDate: string | null
  uploadSummary: { cell1: number; cell2: number; cell3: number }
  addRoutes: (newRoutes: Route[], celula: CellNumber) => void
  clearCellRoutes: (celula: CellNumber) => void
  setLastUpload: (date: string) => void
  setReferenceDate: (date: string | null) => void
}

const CCOContext = createContext<CCOContextType | undefined>(undefined)

export function CCOProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL_STATE)

  const addRoutes = useCallback((newRoutes: Route[], celula: CellNumber) => {
    setState(prev => {
      // Remove rotas antigas da mesma célula
      const otherRoutes = prev.routes.filter(r => r.celula !== celula)
      const updatedRoutes = [...otherRoutes, ...newRoutes]
      
      const cellKey = `cell${celula}` as 'cell1' | 'cell2' | 'cell3'
      
      return {
        ...prev,
        routes: updatedRoutes,
        uploadSummary: {
          ...prev.uploadSummary,
          [cellKey]: newRoutes.length
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
    setState(prev => ({
      ...prev,
      lastUpload: date
    }))
  }, [])

  const setReferenceDate = useCallback((date: string | null) => {
    setState(prev => ({
      ...prev,
      referenceDate: date
    }))
  }, [])

  return (
    <CCOContext.Provider
      value={{
        routes: state.routes,
        lastUpload: state.lastUpload,
        referenceDate: state.referenceDate,
        uploadSummary: state.uploadSummary,
        addRoutes,
        clearCellRoutes,
        setLastUpload,
        setReferenceDate
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
