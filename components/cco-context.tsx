'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { type Route, type CellNumber, type AppState, type UploadDiagnostic } from '@/lib/types'

// Estado inicial vazio - sem dados mockados
const EMPTY_STATE: AppState = {
  routes: [],
  lastUpload: null,
  dataReferencia: null,
  uploadSummary: {
    cell1: 0,
    cell2: 0,
    cell3: 0
  },
  uploadDiagnostics: [],
  hasImportedData: false
}

interface CCOContextType {
  routes: Route[]
  lastUpload: string | null
  dataReferencia: string | null
  uploadSummary: { cell1: number; cell2: number; cell3: number }
  uploadDiagnostics: UploadDiagnostic[]
  hasImportedData: boolean
  addRoutes: (newRoutes: Route[], celula: CellNumber, diagnostic: UploadDiagnostic) => void
  clearAllRoutes: () => void
  setLastUpload: (date: string) => void
  setDataReferencia: (date: string) => void
}

const CCOContext = createContext<CCOContextType | undefined>(undefined)

export function CCOProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE)

  const addRoutes = useCallback((newRoutes: Route[], celula: CellNumber, diagnostic: UploadDiagnostic) => {
    setState(prev => {
      // Remove rotas antigas da mesma célula
      const otherRoutes = prev.routes.filter(r => r.celula !== celula)
      const updatedRoutes = [...otherRoutes, ...newRoutes]
      
      const cellKey = `cell${celula}` as 'cell1' | 'cell2' | 'cell3'
      
      // Atualiza ou adiciona diagnóstico da célula
      const existingDiagIndex = prev.uploadDiagnostics.findIndex(d => d.celula === celula)
      const newDiagnostics = [...prev.uploadDiagnostics]
      if (existingDiagIndex >= 0) {
        newDiagnostics[existingDiagIndex] = diagnostic
      } else {
        newDiagnostics.push(diagnostic)
      }
      
      return {
        ...prev,
        routes: updatedRoutes,
        uploadSummary: {
          ...prev.uploadSummary,
          [cellKey]: newRoutes.length
        },
        uploadDiagnostics: newDiagnostics,
        hasImportedData: true
      }
    })
  }, [])

  const clearAllRoutes = useCallback(() => {
    setState(EMPTY_STATE)
  }, [])

  const setLastUpload = useCallback((date: string) => {
    setState(prev => ({
      ...prev,
      lastUpload: date
    }))
  }, [])

  const setDataReferencia = useCallback((date: string) => {
    setState(prev => ({
      ...prev,
      dataReferencia: date
    }))
  }, [])

  return (
    <CCOContext.Provider
      value={{
        routes: state.routes,
        lastUpload: state.lastUpload,
        dataReferencia: state.dataReferencia,
        uploadSummary: state.uploadSummary,
        uploadDiagnostics: state.uploadDiagnostics,
        hasImportedData: state.hasImportedData,
        addRoutes,
        clearAllRoutes,
        setLastUpload,
        setDataReferencia
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
