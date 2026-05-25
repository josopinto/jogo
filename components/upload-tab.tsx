'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { type Route, type CellNumber, type RouteStatus, type KmStatus } from '@/lib/types'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatNumber, normalizeDateToISO, formatDateBR } from '@/lib/data-utils'
import { Input } from '@/components/ui/input'

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

// Mapeador de colunas flexível
const COLUMN_MAP: Record<string, string[]> = {
  roteiro: ['Roteiro', 'roteiro'],
  status: ['Status', 'status'],
  placa: ['Placa', 'placa'],
  kmStatus: ['KM status', 'KM Status', 'kmStatus'],
  observacao: ['Observação 2', 'Observação', 'Observacao', 'observacao'],
  litrosColetados: ['Total litros coletados', 'Litros Col.', 'Litros Coletados', 'litrosColetados'],
  litrosDescarregados: ['Litros descarregados', 'Litros Des.', 'Total litros descarregados', 'litrosDescarregados'],
  inicio: ['Data início manual', 'Data Inicio', 'Início', 'Inicio', 'inicio'],
  termino: ['Data término manual', 'Data Termino', 'Término', 'Termino', 'termino']
}

function findColumnIndex(headers: string[], keys: string[]): number {
  return headers.findIndex(h => keys.some(k => String(h || '').trim().toLowerCase() === k.toLowerCase()))
}

function parseExcelFile(
  file: File, 
  celula: CellNumber, 
  auditStart: string, 
  auditEnd: string
): Promise<Route[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        const sheetName = workbook.SheetNames.find(name => 
          ['dados', 'planilha1', 'sheet1'].includes(name.toLowerCase())
        ) || workbook.SheetNames[0]
        
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as any[][]
        
        if (jsonData.length < 2) {
          resolve([])
          return
        }

        let headerRowIndex = jsonData.findIndex(row => 
          row.some(cell => String(cell || '').trim().toLowerCase() === 'roteiro')
        )
        if (headerRowIndex === -1) headerRowIndex = 0
        
        const headers = jsonData[headerRowIndex].map(h => String(h || '').trim())
        
        const idx = {
          roteiro: findColumnIndex(headers, COLUMN_MAP.roteiro),
          status: findColumnIndex(headers, COLUMN_MAP.status),
          placa: findColumnIndex(headers, COLUMN_MAP.placa),
          kmStatus: findColumnIndex(headers, COLUMN_MAP.kmStatus),
          observacao: findColumnIndex(headers, COLUMN_MAP.observacao),
          litrosColetados: findColumnIndex(headers, COLUMN_MAP.litrosColetados),
          litrosDescarregados: findColumnIndex(headers, COLUMN_MAP.litrosDescarregados),
          inicio: findColumnIndex(headers, COLUMN_MAP.inicio),
          termino: findColumnIndex(headers, COLUMN_MAP.termino)
        }

        const routes: Route[] = []
        let currentPlanta = ''
        const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue
          
          const firstCellValue = String(row[0] || '').trim()
          
          if (firstCellValue.toLowerCase().includes('planta:')) {
            currentPlanta = firstCellValue.split(/planta:/i)[1].trim()
            continue
          }
          
          const roteiro = idx.roteiro !== -1 ? String(row[idx.roteiro] || '').trim() : ''
          const status = idx.status !== -1 ? String(row[idx.status] || 'Previsto').trim() as RouteStatus : 'Previsto'
          
          if (!roteiro || roteiro.toLowerCase() === 'roteiro' || roteiro.toLowerCase().includes('total')) {
            continue
          }

          const placa = idx.placa !== -1 ? String(row[idx.placa] || '').trim() : ''
          if (!status && !placa) continue

          const rawInicio = idx.inicio !== -1 ? row[idx.inicio] : null
          const rawTermino = idx.termino !== -1 ? row[idx.termino] : null
          
          const dataRotaISO = normalizeDateToISO(rawInicio || rawTermino)

          routes.push({
            id: `${celula}-${roteiro}-${i}-${uploadId}`,
            celula,
            planta: currentPlanta || `Planta C${celula}`,
            roteiro,
            status: (['Encerrado', 'Com Pendências', 'Em execução', 'Previsto', 'Regresso'].includes(status) 
              ? status 
              : 'Previsto') as RouteStatus,
            eventos: '', 
            placa,
            kmStatus: (['OK', 'Rodado a mais', 'Rodado a menos'].includes(String(row[idx.kmStatus])) 
              ? row[idx.kmStatus] 
              : 'OK') as KmStatus,
            dataInicioManual: String(rawInicio || ''),
            dataTerminoManual: String(rawTermino || ''),
            inicio: String(rawInicio || ''),
            termino: String(rawTermino || ''),
            observacao: idx.observacao !== -1 ? String(row[idx.observacao] || '').trim() : '',
            litrosColetados: idx.litrosColetados !== -1 ? (Number(row[idx.litrosColetados]) || 0) : 0,
            litrosDescarregados: idx.litrosDescarregados !== -1 ? (Number(row[idx.litrosDescarregados]) || 0) : 0,
            kmPrevisto: 0,
            kmDiferenca: 0,
            kmPrevistoTotal: 0,
            kmRodadoTotal: 0,
            kmRodado: 0,
            kmFechamento: 0,
            kmRecebido: 0,
            dataRota: dataRotaISO,
            dataAuditoriaInicio: auditStart,
            dataAuditoriaFim: auditEnd,
            uploadId,
            nomeArquivo: file.name
          })
        }
        
        resolve(routes)
      } catch (error) {
        console.error('Erro no parser:', error)
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsBinaryString(file)
  })
}

export function UploadTab() {
  const { addRoutes, setLastUpload, referenceDate, setReferenceDate } = useCCO()
  
  const [auditPeriod, setAuditPeriodState] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

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
    if (!auditPeriod.start || !auditPeriod.end) {
      alert('Por favor, preencha o Período de Auditoria.')
      return
    }

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
        const routes = await parseExcelFile(file, celula, auditPeriod.start, auditPeriod.end)
        addRoutes(routes, celula, auditPeriod.start, auditPeriod.end)
        
        if (!referenceDate) {
          setReferenceDate(auditPeriod.start)
        }

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
  }, [files, auditPeriod, addRoutes, setLastUpload, referenceDate, setReferenceDate])

  const hasFiles = files.cell1 || files.cell2 || files.cell3

  return (
    <div className="space-y-6">
      <TabHeader 
        title="Upload de Dados KMM" 
        description="Configure o periodo de auditoria e faca o upload dos arquivos por celula"
        showGlobalKpis={false}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">1. Periodo da Auditoria</CardTitle>
            <CardDescription>Quando estes dados foram extraidos do KMM?</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial:</label>
              <Input 
                type="date" 
                value={auditPeriod.start} 
                onChange={e => setAuditPeriodState(p => ({ ...p, start: e.target.value }))}
                className="bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final:</label>
              <Input 
                type="date" 
                value={auditPeriod.end} 
                onChange={e => setAuditPeriodState(p => ({ ...p, end: e.target.value }))}
                className="bg-secondary"
              />
            </div>
            <p className="text-xs text-muted-foreground md:col-span-2">
              * O sistema consolidara todos os arquivos deste periodo. Se importar um novo arquivo para a mesma celula e periodo, os dados anteriores serao substituidos.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">2. Data de Referencia (Regresso)</CardTitle>
            <CardDescription>Usada para identificar Regresso Antigo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data para Auditoria:</label>
              <Input
                type="date"
                className="bg-secondary"
                value={referenceDate || ''}
                onChange={(e) => setReferenceDate(e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">Rotas com status &quot;Regresso&quot; fora desta data ({formatDateBR(referenceDate)}) serao contadas como pendencias.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {([1, 2, 3] as CellNumber[]).map((celula) => (
          <Card key={celula} className={`bg-card border-border ${files[`cell${celula}` as keyof UploadState] ? 'border-primary/50' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Célula {celula}
                {files[`cell${celula}` as keyof UploadState] && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <label 
                  htmlFor={`file-${celula}`}
                  className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-2 pb-3">
                    <svg className="w-6 h-6 mb-1 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs text-muted-foreground px-2 text-center truncate w-full">
                      {files[`cell${celula}` as keyof UploadState]?.name || 'Selecionar Excel'}
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
                
                {processing[`cell${celula}` as keyof Omit<ProcessingStatus, 'isProcessing'>] && (
                  <div className="text-xs">
                    {(processing[`cell${celula}` as 'cell1' | 'cell2' | 'cell3'] as any).status === 'processing' && (
                      <span className="text-warning">Processando...</span>
                    )}
                    {(processing[`cell${celula}` as 'cell1' | 'cell2' | 'cell3'] as any).status === 'done' && (
                      <span className="text-success font-medium">
                        {formatNumber((processing[`cell${celula}` as 'cell1' | 'cell2' | 'cell3'] as any).count)} rotas importadas
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button 
        onClick={handleProcess}
        disabled={!hasFiles || processing.isProcessing}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-lg font-bold"
      >
        {processing.isProcessing ? 'Processando Arquivos...' : 'Consolidar Auditoria'}
      </Button>

      <Card className="bg-secondary/30 border-border">
        <CardHeader>
          <CardTitle className="text-sm">Informaçoes sobre o Parser</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• O sistema reconhece colunas com nomes variados (Roteiro, Placa, Status, Litros, etc).</p>
          <p>• Linhas iniciadas com &quot;Planta:&quot; sao usadas para agrupar as rotas abaixo.</p>
          <p>• Sem Contra Leite é calculado sobre a coluna de <strong>Litros Descarregados</strong>.</p>
        </CardContent>
      </Card>
    </div>
  )
}
