'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { type Route, type CellNumber, type RouteStatus, type KmStatus, type UploadDiagnostic } from '@/lib/types'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatNumber } from '@/lib/data-utils'

// Mapeamento de colunas do Excel do KMM
const COLUMN_MAPPINGS: Record<string, string> = {
  // Roteiro
  'roteiro': 'roteiro',
  'rota': 'roteiro',
  // Status
  'status': 'status',
  // Eventos
  'eventos': 'eventos',
  'evento': 'eventos',
  // Placa
  'placa': 'placa',
  // KM Status
  'km status': 'kmStatus',
  'kmstatus': 'kmStatus',
  'km_status': 'kmStatus',
  // Data início
  'data início manual': 'dataInicioManual',
  'data inicio manual': 'dataInicioManual',
  'data inicio': 'dataInicioManual',
  'data início': 'dataInicioManual',
  'início': 'dataInicioManual',
  'inicio': 'dataInicioManual',
  // Data término
  'data término manual': 'dataTerminoManual',
  'data termino manual': 'dataTerminoManual',
  'data termino': 'dataTerminoManual',
  'data término': 'dataTerminoManual',
  'término': 'dataTerminoManual',
  'termino': 'dataTerminoManual',
  // Observação
  'observação 2': 'observacao',
  'observacao 2': 'observacao',
  'observação': 'observacao',
  'observacao': 'observacao',
  'obs': 'observacao',
  // Litros coletados
  'total litros coletados': 'litrosColetados',
  'litros col.': 'litrosColetados',
  'litros coletados': 'litrosColetados',
  'litros col': 'litrosColetados',
  // Litros descarregados
  'litros descarregados': 'litrosDescarregados',
  'litros des.': 'litrosDescarregados',
  'litros des': 'litrosDescarregados',
  'total litros descarregados': 'litrosDescarregados',
  // KM
  'km previsto': 'kmPrevisto',
  'km diferença': 'kmDiferenca',
  'km diferenca': 'kmDiferenca',
  'km previsto total': 'kmPrevistoTotal',
  'km rodado total': 'kmRodadoTotal',
  'km rodado': 'kmRodado',
  'km fechamento': 'kmFechamento',
  'km recebido': 'kmRecebido'
}

function normalizeColumnName(name: string): string {
  const normalized = name.toLowerCase().trim()
  return COLUMN_MAPPINGS[normalized] || normalized
}

interface ParseResult {
  routes: Route[]
  diagnostic: Omit<UploadDiagnostic, 'celula' | 'timestamp'>
}

function parseExcelFile(file: File, celula: CellNumber, dataReferencia: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        // Procurar aba "Dados" ou usar a primeira
        const sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase() === 'dados'
        ) || workbook.SheetNames[0]
        
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]
        
        const routes: Route[] = []
        const alertas: string[] = []
        const plantasEncontradas = new Set<string>()
        const colunasReconhecidas = new Set<string>()
        let currentPlanta = ''
        let headerRow: string[] = []
        let headerIndex = -1
        let linhasLidas = 0
        
        // Procurar linha de cabeçalho
        for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
          const row = jsonData[i] as (string | number | boolean | null | undefined)[]
          if (!row || row.length === 0) continue
          
          const firstCell = String(row[0] || '').toLowerCase().trim()
          const secondCell = String(row[1] || '').toLowerCase().trim()
          
          // Verifica se é linha de cabeçalho (contém "roteiro" ou "status")
          if (secondCell.includes('roteiro') || row.some(cell => 
            String(cell || '').toLowerCase().includes('status') ||
            String(cell || '').toLowerCase().includes('roteiro')
          )) {
            headerRow = row.map(cell => String(cell || '').toLowerCase().trim())
            headerIndex = i
            
            // Mapeia colunas reconhecidas
            headerRow.forEach((col, idx) => {
              const normalized = normalizeColumnName(col)
              if (normalized && COLUMN_MAPPINGS[col]) {
                colunasReconhecidas.add(col)
              }
            })
            break
          }
        }
        
        // Verifica se encontrou litros descarregados
        const hasLitrosDescarregados = headerRow.some(col => {
          const normalized = normalizeColumnName(col)
          return normalized === 'litrosDescarregados'
        })
        
        if (!hasLitrosDescarregados) {
          alertas.push('Coluna Litros Descarregados não encontrada no arquivo.')
        }
        
        // Encontra índices das colunas
        const columnIndices: Record<string, number> = {}
        headerRow.forEach((col, idx) => {
          const normalized = normalizeColumnName(col)
          if (normalized) {
            columnIndices[normalized] = idx
          }
        })
        
        // Processa as linhas de dados
        const startRow = headerIndex >= 0 ? headerIndex + 1 : 0
        
        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i] as (string | number | boolean | null | undefined)[]
          if (!row || row.length === 0) continue
          
          linhasLidas++
          const firstCell = String(row[0] || '').trim()
          
          // Verifica se é uma linha de planta "Planta: NOME"
          const plantaMatch = firstCell.match(/^planta:\s*(.+)$/i)
          if (plantaMatch) {
            currentPlanta = plantaMatch[1].trim()
            plantasEncontradas.add(currentPlanta)
            continue
          }
          
          // Também verifica se qualquer célula contém "Planta:"
          for (const cell of row) {
            const cellStr = String(cell || '').trim()
            const match = cellStr.match(/^planta:\s*(.+)$/i)
            if (match) {
              currentPlanta = match[1].trim()
              plantasEncontradas.add(currentPlanta)
              break
            }
          }
          
          // Ignora linhas de total, vazias ou sem roteiro válido
          if (firstCell.toLowerCase().includes('total') || 
              firstCell.toLowerCase().includes('planta:')) {
            continue
          }
          
          // Extrai dados da linha usando índices das colunas
          const getValue = (key: string): string | number | null => {
            const idx = columnIndices[key]
            if (idx === undefined || idx >= row.length) return null
            return row[idx] as string | number | null
          }
          
          // Roteiro - pode estar na coluna B (índice 1) se A é marcador
          let roteiro = String(getValue('roteiro') || '').trim()
          if (!roteiro && row.length > 1) {
            // Tenta coluna B se A parece ser marcador
            const colA = String(row[0] || '').toLowerCase()
            if (colA === 'false' || colA === '' || colA === 'true') {
              roteiro = String(row[1] || '').trim()
            }
          }
          
          // Valida se é uma rota válida
          const status = String(getValue('status') || row[2] || '').trim()
          const placa = String(getValue('placa') || row[4] || '').trim()
          const kmStatus = String(getValue('kmStatus') || getValue('kmstatus') || row[5] || '').trim()
          
          const isValidRoute = (
            (roteiro && roteiro.length > 0 && /\d/.test(roteiro)) ||
            (status && ['Encerrado', 'Com Pendências', 'Em execução', 'Previsto', 'Regresso'].includes(status)) ||
            (placa && placa.length > 0) ||
            (kmStatus && ['OK', 'Rodado a mais', 'Rodado a menos'].includes(kmStatus))
          )
          
          if (!isValidRoute) continue
          
          // Extrai valores numéricos
          const parseNumber = (val: string | number | null): number => {
            if (val === null || val === undefined) return 0
            if (typeof val === 'number') return val
            const cleaned = String(val).replace(/[^\d.,\-]/g, '').replace(',', '.')
            return parseFloat(cleaned) || 0
          }
          
          const litrosColetados = parseNumber(getValue('litrosColetados') || row[11])
          const litrosDescarregados = hasLitrosDescarregados 
            ? parseNumber(getValue('litrosDescarregados') || row[12])
            : 0
          
          // Datas
          const dataInicioManual = getValue('dataInicioManual') || row[6]
          const dataTerminoManual = getValue('dataTerminoManual') || row[7]
          const inicio = row[8] || dataInicioManual
          const termino = row[9] || dataTerminoManual
          
          routes.push({
            id: `${celula}-${currentPlanta || 'SemPlanta'}-${i}-${Date.now()}`,
            celula,
            planta: currentPlanta || 'Planta não identificada',
            roteiro: roteiro || `Rota-${i}`,
            status: (['Encerrado', 'Com Pendências', 'Em execução', 'Previsto', 'Regresso'].includes(status) 
              ? status 
              : 'Previsto') as RouteStatus,
            eventos: String(getValue('eventos') || row[3] || '').trim(),
            placa,
            kmStatus: (['OK', 'Rodado a mais', 'Rodado a menos'].includes(kmStatus) 
              ? kmStatus 
              : 'OK') as KmStatus,
            dataInicioManual: dataInicioManual ? String(dataInicioManual) : null,
            dataTerminoManual: dataTerminoManual ? String(dataTerminoManual) : null,
            inicio: inicio ? String(inicio) : null,
            termino: termino ? String(termino) : null,
            observacao: String(getValue('observacao') || row[10] || '').trim(),
            litrosColetados,
            litrosDescarregados,
            kmPrevisto: parseNumber(getValue('kmPrevisto') || row[13]),
            kmDiferenca: parseNumber(getValue('kmDiferenca') || row[14]),
            kmPrevistoTotal: parseNumber(getValue('kmPrevistoTotal') || row[15]),
            kmRodadoTotal: parseNumber(getValue('kmRodadoTotal') || row[16]),
            kmRodado: parseNumber(getValue('kmRodado') || row[17]),
            kmFechamento: parseNumber(getValue('kmFechamento') || row[18]),
            kmRecebido: parseNumber(getValue('kmRecebido') || row[19])
          })
        }
        
        if (routes.length === 0) {
          alertas.push('Nenhuma rota válida encontrada no arquivo.')
        }
        
        if (plantasEncontradas.size === 0) {
          alertas.push('Nenhuma planta identificada. Verifique se o arquivo contém linhas "Planta: NOME".')
        }
        
        resolve({
          routes,
          diagnostic: {
            fileName: file.name,
            dataReferencia,
            linhasLidas,
            rotasValidas: routes.length,
            plantasEncontradas: Array.from(plantasEncontradas),
            colunasReconhecidas: Array.from(colunasReconhecidas),
            alertas
          }
        })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    reader.readAsBinaryString(file)
  })
}

interface ProcessingStatus {
  isProcessing: boolean
  status: 'idle' | 'processing' | 'done' | 'error'
  count: number
  error?: string
}

export function UploadTab() {
  const { 
    addRoutes, 
    setLastUpload, 
    setDataReferencia,
    uploadSummary, 
    lastUpload, 
    dataReferencia,
    uploadDiagnostics,
    hasImportedData,
    clearAllRoutes
  } = useCCO()
  
  const [selectedCelula, setSelectedCelula] = useState<CellNumber | null>(null)
  const [selectedDataRef, setSelectedDataRef] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState<ProcessingStatus>({
    isProcessing: false,
    status: 'idle',
    count: 0
  })
  const [lastDiagnostic, setLastDiagnostic] = useState<UploadDiagnostic | null>(null)

  const handleFileChange = useCallback((file: File | null) => {
    setSelectedFile(file)
    setProcessing({ isProcessing: false, status: 'idle', count: 0 })
    setLastDiagnostic(null)
  }, [])

  const handleProcess = useCallback(async () => {
    if (!selectedFile || !selectedCelula || !selectedDataRef) return
    
    setProcessing({ isProcessing: true, status: 'processing', count: 0 })
    
    try {
      const result = await parseExcelFile(selectedFile, selectedCelula, selectedDataRef)
      
      const diagnostic: UploadDiagnostic = {
        ...result.diagnostic,
        celula: selectedCelula,
        timestamp: new Date().toLocaleString('pt-BR')
      }
      
      addRoutes(result.routes, selectedCelula, diagnostic)
      setLastUpload(new Date().toLocaleString('pt-BR'))
      setDataReferencia(selectedDataRef)
      setLastDiagnostic(diagnostic)
      
      setProcessing({
        isProcessing: false,
        status: 'done',
        count: result.routes.length
      })
      
      // Limpa seleção após sucesso
      setSelectedFile(null)
      setSelectedCelula(null)
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      setProcessing({
        isProcessing: false,
        status: 'error',
        count: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    }
  }, [selectedFile, selectedCelula, selectedDataRef, addRoutes, setLastUpload, setDataReferencia])

  const handleClearData = useCallback(() => {
    clearAllRoutes()
    setSelectedFile(null)
    setSelectedCelula(null)
    setSelectedDataRef('')
    setProcessing({ isProcessing: false, status: 'idle', count: 0 })
    setLastDiagnostic(null)
  }, [clearAllRoutes])

  const canProcess = selectedFile && selectedCelula && selectedDataRef && !processing.isProcessing

  return (
    <div className="space-y-6">
      <TabHeader 
        title="Upload de Dados" 
        description="Faca upload dos arquivos Excel exportados do KMM para cada celula operacional"
        showGlobalKpis={hasImportedData}
      />

      {/* Formulário de Upload */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Importar Arquivo do KMM</CardTitle>
          <CardDescription>
            Selecione a celula, a data de referencia e o arquivo Excel exportado do KMM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção de Célula */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Celula Operacional <span className="text-danger">*</span>
              </label>
              <Select 
                value={selectedCelula?.toString() || ''} 
                onValueChange={(v) => setSelectedCelula(Number(v) as CellNumber)}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione a celula" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Celula 1 - DPA, ITALAC, LACTALIS, NESTLE, PIRACANJUBA</SelectItem>
                  <SelectItem value="2">Celula 2 - BRQ, DANONE, DEALE, ITALAC, CATUPIRY</SelectItem>
                  <SelectItem value="3">Celula 3 - CBL, CCPR, ITALAC, LACTALIS, POLENGHI</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Todas as rotas do arquivo serao atribuidas a celula selecionada
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Data de Referencia <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={selectedDataRef}
                onChange={(e) => setSelectedDataRef(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Data para calcular regressos antigos (D+0)
              </p>
            </div>
          </div>

          {/* Upload de Arquivo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Arquivo Excel <span className="text-danger">*</span>
            </label>
            <label 
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-muted-foreground">
                  {selectedFile?.name || 'Clique para selecionar arquivo .xlsx'}
                </p>
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {/* Status do Processamento */}
          {processing.status !== 'idle' && (
            <div className="p-4 rounded-lg bg-secondary/50">
              {processing.status === 'processing' && (
                <div className="flex items-center gap-2 text-warning">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processando arquivo...
                </div>
              )}
              {processing.status === 'done' && (
                <div className="text-success flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {formatNumber(processing.count)} rotas processadas com sucesso!
                </div>
              )}
              {processing.status === 'error' && (
                <div className="text-danger flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Erro ao processar: {processing.error}
                </div>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button 
              onClick={handleProcess}
              disabled={!canProcess}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {processing.isProcessing ? 'Processando...' : 'Importar Dados'}
            </Button>
            
            {hasImportedData && (
              <Button 
                onClick={handleClearData}
                variant="destructive"
                className="flex-1 sm:flex-none"
              >
                Limpar Dados Importados
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diagnóstico do Último Upload */}
      {lastDiagnostic && (
        <Card className="bg-card border-border border-l-4 border-l-success">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Diagnostico do Upload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Arquivo</p>
                <p className="text-sm font-medium text-foreground">{lastDiagnostic.fileName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Celula Atribuida</p>
                <p className="text-sm font-medium text-foreground">Celula {lastDiagnostic.celula}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Data de Referencia</p>
                <p className="text-sm font-medium text-foreground">{lastDiagnostic.dataReferencia}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Linhas Lidas</p>
                <p className="text-sm font-medium text-foreground">{formatNumber(lastDiagnostic.linhasLidas)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Rotas Validas</p>
                <p className="text-sm font-medium text-success">{formatNumber(lastDiagnostic.rotasValidas)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Plantas Encontradas</p>
                <p className="text-sm font-medium text-foreground">{lastDiagnostic.plantasEncontradas.length}</p>
              </div>
            </div>
            
            {lastDiagnostic.plantasEncontradas.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">Plantas identificadas:</p>
                <div className="flex flex-wrap gap-2">
                  {lastDiagnostic.plantasEncontradas.map(planta => (
                    <span key={planta} className="px-2 py-1 rounded bg-secondary text-xs text-foreground">
                      {planta}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {lastDiagnostic.alertas.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-warning/20 border border-warning/50">
                <p className="text-sm font-medium text-warning mb-2">Alertas:</p>
                <ul className="space-y-1">
                  {lastDiagnostic.alertas.map((alerta, idx) => (
                    <li key={idx} className="text-sm text-warning flex items-start gap-2">
                      <span>-</span> {alerta}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumo dos Dados Carregados */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Resumo dos Dados Carregados</CardTitle>
          {lastUpload && (
            <CardDescription>Ultimo upload: {lastUpload}</CardDescription>
          )}
          {dataReferencia && (
            <CardDescription>Data de referencia: {dataReferencia}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!hasImportedData ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-muted-foreground">
                Nenhum arquivo importado. Faca upload dos dados do KMM para visualizar o painel.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Celula 1</p>
                <p className="text-2xl font-bold text-foreground">{formatNumber(uploadSummary.cell1)}</p>
                <p className="text-xs text-muted-foreground">rotas</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Celula 2</p>
                <p className="text-2xl font-bold text-foreground">{formatNumber(uploadSummary.cell2)}</p>
                <p className="text-xs text-muted-foreground">rotas</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="text-sm text-muted-foreground">Celula 3</p>
                <p className="text-2xl font-bold text-foreground">{formatNumber(uploadSummary.cell3)}</p>
                <p className="text-xs text-muted-foreground">rotas</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/20">
                <p className="text-sm text-muted-foreground">Total Geral</p>
                <p className="text-2xl font-bold text-primary">{formatNumber(uploadSummary.cell1 + uploadSummary.cell2 + uploadSummary.cell3)}</p>
                <p className="text-xs text-muted-foreground">rotas carregadas</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Uploads por Célula */}
      {uploadDiagnostics.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Historico de Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadDiagnostics.map((diag, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {diag.celula}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{diag.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {diag.rotasValidas} rotas - {diag.plantasEncontradas.length} plantas - {diag.timestamp}
                      </p>
                    </div>
                  </div>
                  {diag.alertas.length > 0 && (
                    <span className="px-2 py-1 rounded bg-warning/20 text-warning text-xs">
                      {diag.alertas.length} alerta(s)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estrutura Esperada do Excel */}
      <Card className="bg-secondary/30 border-border">
        <CardHeader>
          <CardTitle className="text-base">Estrutura Esperada do Excel do KMM</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>O arquivo Excel do KMM deve conter:</p>
          
          <div className="space-y-2">
            <p className="font-medium text-foreground">Linhas de Planta:</p>
            <p className="pl-4 font-mono text-xs bg-background/50 p-2 rounded">Planta: NOME DA PLANTA</p>
            <p className="text-xs">As rotas abaixo de cada linha de planta serao associadas a ela.</p>
          </div>
          
          <div className="space-y-2">
            <p className="font-medium text-foreground">Colunas reconhecidas (nomes flexiveis):</p>
            <div className="grid gap-1 text-xs font-mono bg-background/50 p-3 rounded-lg overflow-x-auto">
              <p>Roteiro | Status | Eventos | Placa | KM Status</p>
              <p>Data Inicio / Data Inicio Manual | Data Termino / Data Termino Manual</p>
              <p>Observacao / Observacao 2</p>
              <p>Total Litros Coletados / Litros Col. / Litros Coletados</p>
              <p>Litros Descarregados / Litros Des. / Total Litros Descarregados</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="font-medium text-foreground">Rotas validas:</p>
            <p className="text-xs">Uma linha e considerada rota valida quando possui Roteiro preenchido, Status valido, ou Placa/KM Status preenchidos.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
