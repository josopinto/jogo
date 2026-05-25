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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UploadState {
  cell1: File | null
  cell2: File | null
  cell3: File | null
}

interface ProcessingStatus {
  isProcessing: boolean
  cell1: { status: 'idle' | 'processing' | 'done' | 'error'; count: number; plants: number; alerts: number }
  cell2: { status: 'idle' | 'processing' | 'done' | 'error'; count: number; plants: number; alerts: number }
  cell3: { status: 'idle' | 'processing' | 'done' | 'error'; count: number; plants: number; alerts: number }
}

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
): Promise<{ routes: Route[]; plantCount: number; alerts: number }> {
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
          resolve({ routes: [], plantCount: 0, alerts: 0 })
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
        const plantSet = new Set<string>()
        let alerts = 0
        let currentPlanta = ''
        const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue
          
          const firstCellValue = String(row[0] || '').trim()
          
          if (firstCellValue.toLowerCase().includes('planta:')) {
            currentPlanta = firstCellValue.split(/planta:/i)[1].trim()
            plantSet.add(currentPlanta)
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

          if (!dataRotaISO) alerts++

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
        
        resolve({ routes, plantCount: plantSet.size, alerts })
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
  const { addRoutes, setLastUpload, referenceDate, setReferenceDate, auditPeriod, setAuditPeriod } = useCCO()
  
  const [selectedCell, setSelectedCell] = useState<CellNumber>(1)
  
  const [files, setFiles] = useState<UploadState>({
    cell1: null,
    cell2: null,
    cell3: null
  })

  const [processing, setProcessing] = useState<ProcessingStatus>({
    isProcessing: false,
    cell1: { status: 'idle', count: 0, plants: 0, alerts: 0 },
    cell2: { status: 'idle', count: 0, plants: 0, alerts: 0 },
    cell3: { status: 'idle', count: 0, plants: 0, alerts: 0 }
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
    
    const file = files[`cell${selectedCell}` as keyof UploadState]
    if (!file) {
      alert(`Por favor, selecione um arquivo para a Célula ${selectedCell}`)
      setProcessing(prev => ({ ...prev, isProcessing: false }))
      return
    }
    
    setProcessing(prev => ({
      ...prev,
      [`cell${selectedCell}`]: { status: 'processing', count: 0, plants: 0, alerts: 0 }
    }))
    
    try {
      const result = await parseExcelFile(file, selectedCell, auditPeriod.start, auditPeriod.end)
      addRoutes(result.routes, selectedCell, auditPeriod.start, auditPeriod.end)
      
      if (!referenceDate) {
        setReferenceDate(auditPeriod.start)
      }

      setProcessing(prev => ({
        ...prev,
        [`cell${selectedCell}`]: { 
          status: 'done', 
          count: result.routes.length, 
          plants: result.plantCount, 
          alerts: result.alerts 
        }
      }))
    } catch (error) {
      console.error(`Erro ao processar célula ${selectedCell}:`, error)
      setProcessing(prev => ({
        ...prev,
        [`cell${selectedCell}`]: { status: 'error', count: 0, plants: 0, alerts: 0 }
      }))
    }
    
    setLastUpload(new Date().toLocaleString('pt-BR'))
    setProcessing(prev => ({ ...prev, isProcessing: false }))
  }, [files, selectedCell, auditPeriod, addRoutes, setLastUpload, referenceDate, setReferenceDate])

  const currentProcessing = processing[`cell${selectedCell}` as keyof Omit<ProcessingStatus, 'isProcessing'>]
  const currentFile = files[`cell${selectedCell}` as keyof UploadState]

  return (
    <div className="space-y-xl">
      <div className="mb-lg">
        <h2 className="font-display-lg text-display-lg text-on-surface tracking-tight">Data Import</h2>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-sm">Upload KMM operational data for cell analysis and integration.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Upload Section */}
        <div className="lg:col-span-2 flex flex-col gap-gutter">
          {/* Parameters Card */}
          <section className="executive-card p-xl">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-md border-b border-outline-variant/30 pb-sm">Import Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              <div className="space-y-xs">
                <label className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">Operational Cell</label>
                <Select value={selectedCell.toString()} onValueChange={(v) => setSelectedCell(Number(v) as CellNumber)}>
                  <SelectTrigger className="w-full h-11 bg-surface border-outline-variant focus:ring-primary focus:border-primary text-body-md">
                    <SelectValue placeholder="Select Cell" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Cell 1 - Sudeste / Sul</SelectItem>
                    <SelectItem value="2">Cell 2 - Nordeste</SelectItem>
                    <SelectItem value="3">Cell 3 - Centro-Oeste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-xs">
                <label className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">Audit Period Start</label>
                <Input 
                  type="date" 
                  value={auditPeriod.start || ''} 
                  onChange={e => setAuditPeriod(e.target.value, auditPeriod.end)}
                  className="h-11 bg-surface border-outline-variant focus:border-primary text-body-md"
                />
              </div>
              <div className="space-y-xs">
                <label className="block font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">Reference Date (Return)</label>
                <Input 
                  type="date" 
                  value={referenceDate || ''} 
                  onChange={e => setReferenceDate(e.target.value)}
                  className="h-11 bg-surface border-outline-variant focus:border-primary text-body-md"
                />
              </div>
            </div>
            <p className="text-[10px] text-on-surface-variant mt-4 italic">
              * Auditoria Fim sera automaticamente sincronizada se nao houver alteracao no Detalhamento.
            </p>
          </section>

          {/* Dropzone Card */}
          <section 
            className="executive-card p-xl flex flex-col items-center justify-center min-h-[340px] dropzone-border cursor-pointer relative overflow-hidden group"
            onClick={() => document.getElementById(`file-${selectedCell}`)?.click()}
          >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-4xl text-primary">upload_file</span>
            </div>
            <h4 className="font-headline-md text-headline-md text-on-surface mb-2">Drag and drop Excel file here</h4>
            <p className="font-body-md text-body-md text-on-surface-variant mb-8 text-center max-w-md">
              Supported formats: .xlsx, .xls, .csv. Maximum file size: 50MB. <br/>
              Uploading for <strong className="text-primary">Cell {selectedCell}</strong>.
            </p>
            <Button variant="outline" className="h-11 px-8 border-primary text-primary font-bold hover:bg-primary hover:text-on-primary">
               Browse Files
            </Button>
            <input
              id={`file-${selectedCell}`}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFileChange(selectedCell, e.target.files?.[0] || null)}
            />
          </section>
        </div>

        {/* Diagnosis Section */}
        <div className="lg:col-span-1">
          <Card className="executive-card p-xl h-full flex flex-col border border-outline-variant/50">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-sm mb-md">
              <h3 className="font-headline-md text-headline-md text-on-surface">Import Diagnosis</h3>
              <span className={`px-3 py-1 rounded-full font-label-md text-label-md font-bold uppercase tracking-widest
                ${currentProcessing.status === 'done' ? 'bg-success/10 text-success' : 'bg-surface-container-highest text-on-surface-variant'}
              `}>
                {currentProcessing.status === 'done' ? 'Ready' : currentProcessing.status === 'processing' ? 'Active' : 'Pending'}
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-6">
              {currentFile ? (
                <div className="flex items-center gap-4 text-primary bg-primary/5 p-md rounded-xl border border-primary/10">
                  <span className="material-symbols-outlined text-3xl">description</span>
                  <div className="overflow-hidden">
                    <p className="font-label-lg text-label-lg text-on-surface truncate font-bold">{currentFile.name}</p>
                    <p className="font-body-sm text-[10px] text-on-surface-variant">{(currentFile.size / 1024 / 1024).toFixed(2)} MB • File selected</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-outline-variant/50 rounded-xl bg-surface/50">
                   <span className="material-symbols-outlined text-outline text-3xl mb-2">cloud_off</span>
                   <p className="text-[11px] text-on-surface-variant font-bold uppercase">No file selected for Cell {selectedCell}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-gutter">
                <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant/20 shadow-sm">
                  <p className="font-label-md text-[10px] text-on-surface-variant uppercase font-bold">Routes Found</p>
                  <p className="font-headline-md text-headline-md text-on-surface mt-1 leading-none">{formatNumber(currentProcessing.count)}</p>
                </div>
                <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant/20 shadow-sm">
                  <p className="font-label-md text-[10px] text-on-surface-variant uppercase font-bold">Plants Mapped</p>
                  <p className="font-headline-md text-headline-md text-on-surface mt-1 leading-none">{currentProcessing.plants}</p>
                </div>
                <div className={`p-md rounded-xl border shadow-sm col-span-2
                  ${currentProcessing.alerts > 0 ? 'bg-error-container/20 border-error/50' : 'bg-surface-container-low border-outline-variant/20'}
                `}>
                  <p className={`font-label-md text-[10px] uppercase font-bold ${currentProcessing.alerts > 0 ? 'text-error' : 'text-on-surface-variant'}`}>
                    Data Alerts
                  </p>
                  <p className={`font-headline-md text-headline-md mt-1 leading-none ${currentProcessing.alerts > 0 ? 'text-error' : 'text-on-surface'}`}>
                    {currentProcessing.alerts} {currentProcessing.alerts === 1 ? 'Inconsistency' : 'Inconsistencies'}
                  </p>
                  {currentProcessing.alerts > 0 && <p className="text-[9px] text-error mt-1 italic">* Missing or malformed route dates detected.</p>}
                </div>
              </div>

              <div className="mt-auto pt-6">
                <Button 
                  onClick={handleProcess}
                  disabled={!currentFile || processing.isProcessing}
                  className="w-full bg-primary text-on-primary h-12 rounded-xl font-bold uppercase tracking-widest shadow-md hover:bg-primary-container transition-all active:scale-95"
                >
                  {processing.isProcessing ? 'Processing...' : 'Confirm & Process Data'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Audit Info Card */}
      <section className="bg-secondary/10 border border-secondary/20 rounded-xl p-lg flex items-start gap-4 shadow-sm">
         <span className="material-symbols-outlined text-secondary text-2xl">info</span>
         <div className="space-y-1">
            <h4 className="font-bold text-on-surface text-sm uppercase tracking-wider">Protocolo de Consolidação Operacional</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
               Ao processar os arquivos, o sistema tagueará automaticamente cada rota com o período de auditoria selecionado. 
               Se você importar um novo arquivo para a mesma célula e mesmo período, os dados anteriores serão <strong className="text-primary">substituídos</strong> para evitar duplicidade. 
               A data de referência para Regresso Antigo é fundamental para o cálculo correto dos indicadores críticos.
            </p>
         </div>
      </section>
    </div>
  )
}
