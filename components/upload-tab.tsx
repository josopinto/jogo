'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { type Route, type CellNumber, type RouteStatus, type KmStatus } from '@/lib/types'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/data-utils'

interface UploadState {
  cell1: File | null
  cell2: File | null
  cell3: File | null
}

interface ProcessingStatus {
  isProcessing: boolean
  cell1: { status: 'idle' | 'processing' | 'done' | 'error'; count: number }
  cell2: { status: 'idle' | 'processing' | 'done' | 'error'; count: number }
  cell3: { status: 'idle' | 'processing' | 'done' | 'error'; count: number }
}

function parseExcelFile(file: File, celula: CellNumber): Promise<Route[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        // Procurar aba "Dados"
        const sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase() === 'dados'
        ) || workbook.SheetNames[0]
        
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]
        
        const routes: Route[] = []
        let currentPlanta = ''
        
        // Processa as linhas
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as (string | number | boolean | null | undefined)[]
          if (!row || row.length === 0) continue
          
          const firstCell = String(row[0] || '').trim()
          
          // Verifica se é uma linha de planta
          if (firstCell.toLowerCase().startsWith('planta:')) {
            currentPlanta = firstCell.replace(/planta:/i, '').trim()
            continue
          }
          
          // Verifica se é uma linha de dados (coluna A = "false" ou vazia)
          if (firstCell === 'false' || firstCell === '' || firstCell === 'FALSE') {
            const roteiro = String(row[1] || '').trim()
            if (!roteiro) continue
            
            const status = String(row[2] || 'Previsto').trim() as RouteStatus
            const eventos = String(row[3] || '').trim()
            const placa = String(row[4] || '').trim()
            const kmStatus = String(row[5] || 'OK').trim() as KmStatus
            const dataInicioManual = row[6] ? String(row[6]) : null
            const dataTerminoManual = row[7] ? String(row[7]) : null
            const inicio = row[8] ? String(row[8]) : null
            const termino = row[9] ? String(row[9]) : null
            const observacao = String(row[10] || '').trim()
            const litrosColetados = Number(row[11]) || 0
            const litrosDescarregados = Number(row[12]) || 0
            const kmPrevisto = Number(row[13]) || 0
            const kmDiferenca = Number(row[14]) || 0
            const kmPrevistoTotal = Number(row[15]) || 0
            const kmRodadoTotal = Number(row[16]) || 0
            const kmRodado = Number(row[17]) || 0
            const kmFechamento = Number(row[18]) || 0
            const kmRecebido = Number(row[19]) || 0
            
            routes.push({
              id: `${celula}-${currentPlanta}-${i}-${Date.now()}`,
              celula,
              planta: currentPlanta || `Planta ${celula}`,
              roteiro,
              status: ['Encerrado', 'Com Pendências', 'Em execução', 'Previsto', 'Regresso'].includes(status) 
                ? status 
                : 'Previsto',
              eventos,
              placa,
              kmStatus: ['OK', 'Rodado a mais', 'Rodado a menos'].includes(kmStatus) ? kmStatus : 'OK',
              dataInicioManual,
              dataTerminoManual,
              inicio,
              termino,
              observacao,
              litrosColetados,
              litrosDescarregados,
              kmPrevisto,
              kmDiferenca,
              kmPrevistoTotal,
              kmRodadoTotal,
              kmRodado,
              kmFechamento,
              kmRecebido
            })
          }
        }
        
        resolve(routes)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsBinaryString(file)
  })
}

export function UploadTab() {
  const { addRoutes, setLastUpload, uploadSummary, lastUpload } = useCCO()
  const [files, setFiles] = useState<UploadState>({
    cell1: null,
    cell2: null,
    cell3: null
  })
  const [processing, setProcessing] = useState<ProcessingStatus>({
    isProcessing: false,
    cell1: { status: 'idle', count: 0 },
    cell2: { status: 'idle', count: 0 },
    cell3: { status: 'idle', count: 0 }
  })

  const handleFileChange = useCallback((celula: CellNumber, file: File | null) => {
    setFiles(prev => ({
      ...prev,
      [`cell${celula}`]: file
    }))
  }, [])

  const handleProcess = useCallback(async () => {
    setProcessing(prev => ({ ...prev, isProcessing: true }))
    
    const cellNumbers: CellNumber[] = [1, 2, 3]
    
    for (const celula of cellNumbers) {
      const file = files[`cell${celula}` as keyof UploadState]
      if (!file) continue
      
      setProcessing(prev => ({
        ...prev,
        [`cell${celula}`]: { status: 'processing', count: 0 }
      }))
      
      try {
        const routes = await parseExcelFile(file, celula)
        addRoutes(routes, celula)
        
        setProcessing(prev => ({
          ...prev,
          [`cell${celula}`]: { status: 'done', count: routes.length }
        }))
      } catch (error) {
        console.error(`Erro ao processar célula ${celula}:`, error)
        setProcessing(prev => ({
          ...prev,
          [`cell${celula}`]: { status: 'error', count: 0 }
        }))
      }
    }
    
    setLastUpload(new Date().toLocaleString('pt-BR'))
    setProcessing(prev => ({ ...prev, isProcessing: false }))
  }, [files, addRoutes, setLastUpload])

  const hasFiles = files.cell1 || files.cell2 || files.cell3

  return (
    <div className="space-y-6">
      <TabHeader 
        title="Upload de Dados" 
        description="Faca upload dos arquivos Excel exportados do KMM para cada celula operacional"
        showGlobalKpis={true}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {([1, 2, 3] as CellNumber[]).map((celula) => (
          <Card key={celula} className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Arquivo Célula {celula}</CardTitle>
              <CardDescription>
                {celula === 1 && '9 operações: DPA, ITALAC, LACTALIS, NESTLE, PIRACANJUBA, VERDE CAMPO'}
                {celula === 2 && '10 operações: BRQ, DANONE, DEALE, ITALAC, CATUPIRY, LATPASSOS'}
                {celula === 3 && '9 operações: CBL, CCPR, ITALAC, LACTALIS, POLENGHI'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <label 
                  htmlFor={`file-${celula}`}
                  className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-muted-foreground">
                      {files[`cell${celula}` as keyof UploadState]?.name || 'Clique para selecionar arquivo .xlsx'}
                    </p>
                  </div>
                  <input
                    id={`file-${celula}`}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => handleFileChange(celula, e.target.files?.[0] || null)}
                  />
                </label>
                
                {processing[`cell${celula}` as keyof Omit<ProcessingStatus, 'isProcessing'>] && 
                 typeof processing[`cell${celula}` as keyof Omit<ProcessingStatus, 'isProcessing'>] === 'object' && (
                  <div className="text-sm">
                    {(processing[`cell${celula}` as 'cell1' | 'cell2' | 'cell3'] as { status: string; count: number }).status === 'processing' && (
                      <span className="text-warning">Processando...</span>
                    )}
                    {(processing[`cell${celula}` as 'cell1' | 'cell2' | 'cell3'] as { status: string; count: number }).status === 'done' && (
                      <span className="text-success">
                        {formatNumber((processing[`cell${celula}` as 'cell1' | 'cell2' | 'cell3'] as { status: string; count: number }).count)} rotas processadas
                      </span>
                    )}
                    {(processing[`cell${celula}` as 'cell1' | 'cell2' | 'cell3'] as { status: string; count: number }).status === 'error' && (
                      <span className="text-danger">Erro ao processar arquivo</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <Button 
          onClick={handleProcess}
          disabled={!hasFiles || processing.isProcessing}
          className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {processing.isProcessing ? 'Processando...' : 'Processar Dados'}
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Resumo dos Dados Carregados</CardTitle>
          {lastUpload && (
            <CardDescription>Ultimo upload: {lastUpload}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Célula 1</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(uploadSummary.cell1)}</p>
              <p className="text-xs text-muted-foreground">rotas</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Célula 2</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(uploadSummary.cell2)}</p>
              <p className="text-xs text-muted-foreground">rotas</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Célula 3</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(uploadSummary.cell3)}</p>
              <p className="text-xs text-muted-foreground">rotas</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/20">
              <p className="text-sm text-muted-foreground">Total Geral</p>
              <p className="text-2xl font-bold text-primary">{formatNumber(uploadSummary.cell1 + uploadSummary.cell2 + uploadSummary.cell3)}</p>
              <p className="text-xs text-muted-foreground">rotas carregadas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/30 border-border">
        <CardHeader>
          <CardTitle className="text-base">Estrutura Esperada do Excel</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>O arquivo Excel deve conter uma aba chamada <strong className="text-foreground">&quot;Dados&quot;</strong> com as seguintes colunas:</p>
          <div className="grid gap-1 text-xs font-mono bg-background/50 p-3 rounded-lg overflow-x-auto">
            <p>A: Marcador | B: Roteiro | C: Status | D: Eventos | E: Placa | F: KM Status</p>
            <p>G: Data Inicio Manual | H: Data Termino Manual | I: Inicio | J: Termino</p>
            <p>K: Observacao | L: Litros Coletados | M: Litros Descarregados</p>
            <p>N: KM Previsto | O: KM Diferenca | P-T: KM diversos</p>
          </div>
          <p>As plantas devem estar identificadas em linhas separadas no formato: <strong className="text-foreground">Planta: NOME DA PLANTA</strong></p>
        </CardContent>
      </Card>
    </div>
  )
}
