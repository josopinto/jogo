'use client'

import { useMemo, useState } from 'react'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { 
  formatNumber, 
  isPendente, 
  isRegressoAntigo, 
  isSemContraLeite, 
  isKmStatusIncorreto,
  filterRoutesByAuditPeriod,
  applyStatusScope 
} from '@/lib/data-utils'
import { type CellNumber, type RouteStatus, type KmStatus, type FilterScope } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FilterCell = CellNumber | 'all'
type FilterStatus = RouteStatus | 'all' | 'pendente'

interface Filters {
  celula: FilterCell
  planta: string
  status: FilterStatus
  kmStatus: KmStatus | 'all' | 'incorreto'
  roteiro: string
  observacao: string
  placa: string
}

const INITIAL_FILTERS: Filters = {
  celula: 'all',
  planta: 'all',
  status: 'all',
  kmStatus: 'all',
  roteiro: '',
  observacao: '',
  placa: 'all'
}

export function OperationalDetailTab() {
  const { routes, referenceDate, auditPeriod, indicatorScope } = useCCO()
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchGlobal, setSearchGlobal] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // 1. Filtrar rotas pelo período de auditoria (Base de Trabalho)
  const routesInAudit = useMemo(() => {
    return filterRoutesByAuditPeriod(routes, auditPeriod.start, auditPeriod.end)
  }, [routes, auditPeriod])

  // Lista de plantas e placas disponíveis na auditoria atual
  const plantas = useMemo(() => {
    const set = new Set(routesInAudit.map(r => r.planta))
    return Array.from(set).sort()
  }, [routesInAudit])

  const placas = useMemo(() => {
    const set = new Set(routesInAudit.map(r => r.placa))
    return Array.from(set).sort()
  }, [routesInAudit])

  // 2. Aplicar filtros de busca e seleção
  const filteredRoutes = useMemo(() => {
    let result = routesInAudit

    if (filters.celula !== 'all') {
      result = result.filter(r => r.celula === filters.celula)
    }
    if (filters.planta !== 'all') {
      result = result.filter(r => r.planta === filters.planta)
    }
    if (filters.status !== 'all') {
      if (filters.status === 'pendente') {
        result = result.filter(r => isPendente(r, referenceDate))
      } else {
        result = result.filter(r => r.status === filters.status)
      }
    }
    if (filters.kmStatus !== 'all') {
      if (filters.kmStatus === 'incorreto') {
        result = result.filter(r => isKmStatusIncorreto(r))
      } else {
        result = result.filter(r => r.kmStatus === filters.kmStatus)
      }
    }
    if (filters.roteiro) {
      result = result.filter(r => r.roteiro.toLowerCase().includes(filters.roteiro.toLowerCase()))
    }
    if (filters.observacao) {
      result = result.filter(r => r.observacao.toLowerCase().includes(filters.observacao.toLowerCase()))
    }
    if (filters.placa !== 'all') {
      result = result.filter(r => r.placa === filters.placa)
    }

    if (searchGlobal) {
      const s = searchGlobal.toLowerCase()
      result = result.filter(r => 
        r.planta.toLowerCase().includes(s) || 
        r.roteiro.toLowerCase().includes(s) || 
        r.placa.toLowerCase().includes(s) || 
        r.observacao.toLowerCase().includes(s)
      )
    }

    return result
  }, [routesInAudit, filters, searchGlobal, referenceDate])

  // Paginacao
  const paginatedRoutes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredRoutes.slice(start, start + itemsPerPage)
  }, [filteredRoutes, currentPage])

  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage)

  const handleExportCSV = () => {
    const headers = ['Celula', 'Planta', 'Roteiro', 'Data Rota', 'Status', 'KM Status', 'Litros Col.', 'Litros Des.', 'Observacao', 'Placa', 'Periodo Auditoria']
    const rows = filteredRoutes.map(r => [
      r.celula,
      `"${r.planta}"`,
      `"${r.roteiro}"`,
      r.dataRota || '',
      r.status,
      r.kmStatus,
      r.litrosColetados,
      r.litrosDescarregados,
      `"${r.observacao}"`,
      r.placa,
      `${r.dataAuditoriaInicio} a ${r.dataAuditoriaFim}`
    ])
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `auditoria_detalhada_${auditPeriod.start}.csv`
    link.click()
  }

  const getRowClassName = (r: typeof routes[0]) => {
    const pendente = isPendente(r, referenceDate)
    const critico = pendente && (isSemContraLeite(r) || isKmStatusIncorreto(r) || isRegressoAntigo(r, referenceDate))
    
    if (critico) return 'bg-danger/20 border-l-4 border-l-danger'
    if (pendente) return 'bg-danger/5'
    if (isSemContraLeite(r) && r.status === 'Encerrado') return 'bg-warning/10'
    return ''
  }

  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Nenhum dado para detalhamento</h2>
          <p className="text-muted-foreground">Importe os arquivos do KMM para navegar pelas rotas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <TabHeader 
          title="Detalhamento Operacional" 
          description="Visualizacao linha a linha da auditoria selecionada"
        />
        <Button onClick={handleExportCSV} variant="outline" className="border-border">
          Exportar CSV
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-6 space-y-4">
           <div className="grid gap-4 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <Input
                  placeholder="Busca rapida (planta, roteiro, placa...)"
                  value={searchGlobal}
                  onChange={(e) => { setSearchGlobal(e.target.value); setCurrentPage(1) }}
                  className="bg-secondary border-border pl-10"
                />
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <Select value={filters.celula.toString()} onValueChange={(v) => { setFilters(p => ({ ...p, celula: v === 'all' ? 'all' : Number(v) as CellNumber })); setCurrentPage(1) }}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Celula" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Celulas</SelectItem>
                  <SelectItem value="1">Celula 1</SelectItem>
                  <SelectItem value="2">Celula 2</SelectItem>
                  <SelectItem value="3">Celula 3</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(v) => { setFilters(p => ({ ...p, status: v as FilterStatus })); setCurrentPage(1) }}>
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pendente">Apenas Pendentes</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                  <SelectItem value="Em execução">Em Execucao</SelectItem>
                  <SelectItem value="Com Pendências">Com Pendencias</SelectItem>
                  <SelectItem value="Regresso">Regresso</SelectItem>
                </SelectContent>
              </Select>
           </div>

           <Button 
             variant="ghost" 
             size="sm" 
             onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
             className="text-xs text-muted-foreground"
           >
             {showAdvancedFilters ? 'Ocultar Filtros Avancados' : 'Mostrar Filtros Avancados...'}
           </Button>

           {showAdvancedFilters && (
             <div className="grid gap-4 md:grid-cols-4 pt-2 border-t border-border">
                <Select value={filters.planta} onValueChange={(v) => setFilters(p => ({ ...p, planta: v }))}>
                  <SelectTrigger className="bg-secondary text-xs h-8">
                    <SelectValue placeholder="Planta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Plantas</SelectItem>
                    {plantas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filters.kmStatus} onValueChange={(v) => setFilters(p => ({ ...p, kmStatus: v as any }))}>
                  <SelectTrigger className="bg-secondary text-xs h-8">
                    <SelectValue placeholder="KM Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos KM</SelectItem>
                    <SelectItem value="incorreto">KM Incorreto</SelectItem>
                    <SelectItem value="OK">OK</SelectItem>
                  </SelectContent>
                </Select>

                <Input 
                  placeholder="Roteiro..." 
                  value={filters.roteiro} 
                  onChange={e => setFilters(p => ({ ...p, roteiro: e.target.value }))}
                  className="bg-secondary h-8 text-xs"
                />

                <Select value={filters.placa} onValueChange={(v) => setFilters(p => ({ ...p, placa: v }))}>
                  <SelectTrigger className="bg-secondary text-xs h-8">
                    <SelectValue placeholder="Placa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Placas</SelectItem>
                    {placas.map(pl => <SelectItem key={pl} value={pl}>{pl}</SelectItem>)}
                  </SelectContent>
                </Select>
             </div>
           )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Mostrando <strong>{filteredRoutes.length}</strong> rotas na auditoria <strong>{auditPeriod.start}</strong></span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
            <span className="flex items-center px-2">Pagina {currentPage} de {totalPages}</span>
            <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Proxima</Button>
          </div>
        )}
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="p-3 text-left">Cél.</th>
                  <th className="p-3 text-left">Planta</th>
                  <th className="p-3 text-left">Roteiro</th>
                  <th className="p-3 text-left">Data Rota</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">KM Status</th>
                  <th className="p-3 text-right">L.Col.</th>
                  <th className="p-3 text-right">L.Des.</th>
                  <th className="p-3 text-left">Placa</th>
                  <th className="p-3 text-left">Obs</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRoutes.map((r) => (
                  <tr key={r.id} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${getRowClassName(r)}`}>
                    <td className="p-3">{r.celula}</td>
                    <td className="p-3 font-bold">{r.planta}</td>
                    <td className="p-3 font-mono">{r.roteiro}</td>
                    <td className="p-3 whitespace-nowrap">{r.dataRota || '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'Encerrado' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={r.kmStatus !== 'OK' ? 'text-orange font-bold' : ''}>{r.kmStatus}</span>
                    </td>
                    <td className="p-3 text-right">{formatNumber(r.litrosColetados)}</td>
                    <td className="p-3 text-right font-bold">{formatNumber(r.litrosDescarregados)}</td>
                    <td className="p-3 font-mono">{r.placa}</td>
                    <td className="p-3 max-w-[150px] truncate" title={r.observacao}>{r.observacao || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 rounded-lg bg-secondary/20 border border-border space-y-2">
         <h4 className="text-xs font-bold uppercase text-muted-foreground">Legenda de Destaque:</h4>
         <div className="flex flex-wrap gap-4 text-[10px]">
            <div className="flex items-center gap-1.5">
               <div className="w-3 h-3 bg-danger/20 border-l-2 border-l-danger" />
               <span>Rota Crítica (Pendente + Divergência de Leite/KM ou Regresso Antigo)</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="w-3 h-3 bg-danger/5" />
               <span>Rota Pendente / Em Execução</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="w-3 h-3 bg-warning/10" />
               <span>Encerrada sem Contra Leite (Litros Descarregados = 0)</span>
            </div>
         </div>
      </div>
    </div>
  )
}
