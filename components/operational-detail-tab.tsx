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
  applyStatusScope,
  formatDateBR,
  normalizeDateToISO 
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
  const { routes, referenceDate, auditPeriod, setAuditPeriod } = useCCO()
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchGlobal, setSearchGlobal] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // --- HOOKS ---

  const routesInAudit = useMemo(() => {
    return filterRoutesByAuditPeriod(routes, auditPeriod.start, auditPeriod.end)
  }, [routes, auditPeriod])

  const plantas = useMemo(() => {
    const set = new Set(routesInAudit.map(r => r.planta))
    return Array.from(set).sort()
  }, [routesInAudit])

  const placas = useMemo(() => {
    const set = new Set(routesInAudit.map(r => r.placa))
    return Array.from(set).sort()
  }, [routesInAudit])

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
      result = result.filter(r => (r.roteiro || '').toLowerCase().includes(filters.roteiro.toLowerCase()))
    }
    if (filters.observacao) {
      result = result.filter(r => (r.observacao || '').toLowerCase().includes(filters.observacao.toLowerCase()))
    }
    if (filters.placa !== 'all') {
      result = result.filter(r => r.placa === filters.placa)
    }

    if (searchGlobal) {
      const s = searchGlobal.toLowerCase()
      result = result.filter(r => 
        (r.planta || '').toLowerCase().includes(s) || 
        (r.roteiro || '').toLowerCase().includes(s) || 
        (r.placa || '').toLowerCase().includes(s) || 
        (r.observacao || '').toLowerCase().includes(s)
      )
    }

    return result
  }, [routesInAudit, filters, searchGlobal, referenceDate])

  const paginatedRoutes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredRoutes.slice(start, start + itemsPerPage)
  }, [filteredRoutes, currentPage])

  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage)

  // --- HANDLERS ---

  const handleExportCSV = () => {
    const headers = ['Celula', 'Planta', 'Roteiro', 'Data Rota', 'Status', 'KM Status', 'Litros Col.', 'Litros Des.', 'Observacao', 'Placa', 'Periodo Auditoria']
    const rows = filteredRoutes.map(r => [
      r.celula,
      `"${r.planta}"`,
      `"${r.roteiro}"`,
      formatDateBR(r.dataRota),
      r.status,
      r.kmStatus,
      r.litrosColetados,
      r.litrosDescarregados,
      `"${r.observacao}"`,
      r.placa,
      `${formatDateBR(r.dataAuditoriaInicio)} a ${formatDateBR(r.dataAuditoriaFim)}`
    ])
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `detalhamento_operacional_${auditPeriod.start}.csv`
    link.click()
  }

  const getRowClassName = (r: typeof routes[0]) => {
    const pendente = isPendente(r, referenceDate)
    const critico = pendente && (isSemContraLeite(r) || isKmStatusIncorreto(r) || isRegressoAntigo(r, referenceDate))
    
    if (critico) return 'bg-error-container/20 border-l-4 border-l-error'
    if (pendente) return 'bg-error-container/5'
    if (isSemContraLeite(r) && r.status === 'Encerrado') return 'bg-warning/10'
    return ''
  }

  const isEmpty = routes.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center shadow-surface">
          <span className="material-symbols-outlined text-outline text-3xl">list_alt</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-on-surface">Nenhum dado consolidado</h2>
          <p className="text-on-surface-variant">Importe os arquivos do KMM para navegar pelas rotas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface tracking-tight">Gestão de Operações</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Detalhamento e filtros avançados para auditoria.</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="border-outline-variant text-secondary hover:text-primary">
          <span className="material-symbols-outlined mr-2">download</span> Exportar CSV
        </Button>
      </div>

      {/* Filter Section Card */}
      <section className="bg-surface-container-lowest rounded-xl p-md shadow-surface flex flex-col gap-md border border-outline-variant/30">
        <div className="flex items-center justify-between pb-sm border-b border-outline-variant/20">
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">filter_list</span>
            Filtros de Operação
          </h2>
          <button 
            onClick={() => { setFilters(INITIAL_FILTERS); setSearchGlobal(''); setCurrentPage(1); }}
            className="text-secondary hover:text-primary font-label-lg text-label-lg flex items-center gap-xs transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">clear_all</span>
            Limpar Filtros
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-md">
          {/* Audit Period Start */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-tighter">Auditoria Início</label>
            <Input 
              type="date" 
              value={auditPeriod.start || ''} 
              onChange={e => setAuditPeriod(e.target.value, auditPeriod.end)}
              className="h-10 bg-surface border-outline-variant focus:border-primary text-xs"
            />
          </div>
          {/* Audit Period End */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-tighter">Auditoria Fim</label>
            <Input 
              type="date" 
              value={auditPeriod.end || ''} 
              onChange={e => setAuditPeriod(auditPeriod.start, e.target.value)}
              className="h-10 bg-surface border-outline-variant focus:border-primary text-xs"
            />
          </div>
          {/* Cell */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-tighter">Célula</label>
            <Select value={filters.celula.toString()} onValueChange={(v) => { setFilters(p => ({ ...p, celula: v === 'all' ? 'all' : Number(v) as CellNumber })); setCurrentPage(1) }}>
              <SelectTrigger className="h-10 bg-surface border-outline-variant text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Células</SelectItem>
                <SelectItem value="1">Célula 1</SelectItem>
                <SelectItem value="2">Célula 2</SelectItem>
                <SelectItem value="3">Célula 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Status */}
          <div className="flex flex-col gap-xs">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-tighter">Status</label>
            <Select value={filters.status} onValueChange={(v) => { setFilters(p => ({ ...p, status: v as FilterStatus })); setCurrentPage(1) }}>
              <SelectTrigger className="h-10 bg-surface border-outline-variant text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="pendente">Apenas Pendentes</SelectItem>
                <SelectItem value="Encerrado">Encerrado</SelectItem>
                <SelectItem value="Em execução">Em Execução</SelectItem>
                <SelectItem value="Com Pendências">Com Pendências</SelectItem>
                <SelectItem value="Regresso">Regresso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Quick Search */}
          <div className="flex flex-col gap-xs xl:col-span-3">
            <label className="font-label-md text-label-md text-on-surface-variant uppercase tracking-tighter">Busca Rápida</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <Input
                placeholder="Planta, roteiro, placa..."
                value={searchGlobal}
                onChange={(e) => { setSearchGlobal(e.target.value); setCurrentPage(1) }}
                className="h-10 pl-10 bg-surface border-outline-variant focus:border-primary text-xs"
              />
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="text-xs text-primary font-bold hover:underline text-left w-fit"
        >
          {showAdvancedFilters ? 'Ocultar Filtros Avançados' : 'Mostrar Filtros Avançados...'}
        </button>

        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-md pt-md border-t border-outline-variant/10">
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-[10px] text-on-surface-variant uppercase">Planta</label>
              <Select value={filters.planta} onValueChange={(v) => { setFilters(p => ({ ...p, planta: v })); setCurrentPage(1) }}>
                <SelectTrigger className="h-9 bg-surface text-[11px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Plantas</SelectItem>
                  {plantas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-[10px] text-on-surface-variant uppercase">KM Status</label>
              <Select value={filters.kmStatus} onValueChange={(v) => { setFilters(p => ({ ...p, kmStatus: v as any })); setCurrentPage(1) }}>
                <SelectTrigger className="h-9 bg-surface text-[11px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os KMs</SelectItem>
                  <SelectItem value="incorreto">Apenas Incorretos</SelectItem>
                  <SelectItem value="OK">Apenas OK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-[10px] text-on-surface-variant uppercase">Placa</label>
              <Select value={filters.placa} onValueChange={(v) => { setFilters(p => ({ ...p, placa: v })); setCurrentPage(1) }}>
                <SelectTrigger className="h-9 bg-surface text-[11px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Placas</SelectItem>
                  {placas.map(pl => <SelectItem key={pl} value={pl}>{pl}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-[10px] text-on-surface-variant uppercase">Roteiro</label>
              <Input 
                placeholder="Nº Roteiro..." 
                value={filters.roteiro} 
                onChange={e => { setFilters(p => ({ ...p, roteiro: e.target.value })); setCurrentPage(1) }}
                className="h-9 bg-surface text-[11px]"
              />
            </div>
          </div>
        )}
      </section>

      {/* Operations Table Card */}
      <section className="bg-surface-container-lowest rounded-xl shadow-surface flex flex-col flex-1 overflow-hidden border border-outline-variant/30">
        <div className="h-14 px-md flex items-center justify-between border-b border-outline-variant/20 bg-surface-bright/30 shrink-0">
          <div className="flex items-center gap-sm">
            <h3 className="font-headline-md text-headline-md text-on-surface">Detalhamento Operacional</h3>
            <span className="px-2 py-1 bg-surface-container-high rounded-full font-label-md text-[10px] font-bold text-on-surface-variant uppercase">
              {filteredRoutes.length} Registros
            </span>
          </div>
          <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">
            Audit Pull: {formatDateBR(auditPeriod.start)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="sticky top-0 bg-surface-container-lowest shadow-[0_1px_0_0_rgba(0,0,0,0.05)] z-10">
              <tr className="bg-surface-container-low/50">
                <th className="h-12 px-md font-label-lg text-label-lg text-on-surface-variant whitespace-nowrap font-bold">Cél.</th>
                <th className="h-12 px-md font-label-lg text-label-lg text-on-surface-variant whitespace-nowrap font-bold">Planta</th>
                <th className="h-12 px-md font-label-lg text-label-lg text-on-surface-variant whitespace-nowrap font-bold">Roteiro</th>
                <th className="h-12 px-md font-label-lg text-label-lg text-on-surface-variant whitespace-nowrap font-bold text-center">Data Rota</th>
                <th className="h-12 px-md font-label-lg text-label-lg text-on-surface-variant whitespace-nowrap font-bold text-center">Status</th>
                <th className="h-12 px-md font-label-lg text-label-lg text-on-surface-variant whitespace-nowrap font-bold text-center">KM Status</th>
                <th className="h-12 px-md font-label-lg text-label-lg text-on-surface-variant text-right whitespace-nowrap font-bold">L. Col.</th>
                <th className="h-12 px-md font-label-lg text-label-lg text-on-surface-variant text-right whitespace-nowrap font-bold">L. Des.</th>
                <th className="h-12 px-md font-label-lg text-label-lg text-on-surface-variant whitespace-nowrap font-bold">Placa</th>
                <th className="h-12 px-md font-label-lg text-label-lg text-on-surface-variant whitespace-nowrap font-bold">Observação</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant/10">
              {paginatedRoutes.map((r, idx) => (
                <tr key={r.id} className={`h-[52px] transition-colors hover:bg-primary/5 group ${idx % 2 !== 0 ? 'bg-surface-bright/10' : ''} ${getRowClassName(r)}`}>
                  <td className="px-md font-bold text-primary">C{r.celula}</td>
                  <td className="px-md font-bold text-on-surface truncate max-w-[180px]" title={r.planta}>{r.planta}</td>
                  <td className="px-md font-mono text-[11px]">{r.roteiro}</td>
                  <td className="px-md text-center whitespace-nowrap">{formatDateBR(r.dataRota)}</td>
                  <td className="px-md text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-tighter
                      ${r.status === 'Encerrado' ? 'bg-success/10 text-success' : 'bg-error-container/40 text-on-error-container'}
                    `}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-md text-center">
                    <span className={`font-bold ${r.kmStatus !== 'OK' ? 'text-orange' : 'text-success/80'}`}>
                      {r.kmStatus}
                    </span>
                  </td>
                  <td className="px-md text-right text-on-surface-variant">{formatNumber(r.litrosColetados)}</td>
                  <td className="px-md text-right font-black text-on-surface">{formatNumber(r.litrosDescarregados)}</td>
                  <td className="px-md font-mono">{r.placa}</td>
                  <td className="px-md max-w-[200px] truncate text-[10px] text-on-surface-variant italic" title={r.observacao}>{r.observacao || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="h-14 px-md flex items-center justify-between border-t border-outline-variant/20 bg-surface-container-low/30 shrink-0">
          <span className="font-body-sm text-[11px] text-on-surface-variant font-medium">Mostrando {paginatedRoutes.length} de {filteredRoutes.length} rotas filtradas</span>
          <div className="flex items-center gap-sm">
            <Button size="sm" variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 p-0">
              <span className="material-symbols-outlined">chevron_left</span>
            </Button>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="bg-primary text-on-primary px-2 py-0.5 rounded font-bold">{currentPage}</span>
              <span className="text-on-surface-variant">/</span>
              <span className="text-on-surface-variant">{totalPages || 1}</span>
            </div>
            <Button size="sm" variant="ghost" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 p-0">
              <span className="material-symbols-outlined">chevron_right</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Legend Block */}
      <div className="p-lg rounded-xl bg-surface-container-low/50 border border-outline-variant/20 space-y-md">
         <h4 className="font-label-lg text-label-lg font-bold uppercase text-on-surface-variant tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">legend_toggle</span>
            Legenda de Destaque Operacional
         </h4>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div className="flex items-start gap-3 p-md rounded-lg bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
               <div className="w-4 h-full bg-error-container/30 border-l-4 border-l-error shrink-0 rounded" />
               <div>
                  <p className="font-bold text-xs text-error uppercase">Rota Crítica</p>
                  <p className="text-[10px] text-on-surface-variant leading-tight mt-1">Status Pendente + Divergência de Leite (SCL), KM Incorreto ou Regresso Antigo.</p>
               </div>
            </div>
            <div className="flex items-start gap-3 p-md rounded-lg bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
               <div className="w-4 h-full bg-error-container/10 shrink-0 rounded" />
               <div>
                  <p className="font-bold text-xs text-on-surface-variant uppercase">Pendente / Em Execução</p>
                  <p className="text-[10px] text-on-surface-variant leading-tight mt-1">Rota em andamento no KMM sem outras inconsistências críticas identificadas.</p>
               </div>
            </div>
            <div className="flex items-start gap-3 p-md rounded-lg bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
               <div className="w-4 h-full bg-warning/10 shrink-0 rounded" />
               <div>
                  <p className="font-bold text-xs text-warning uppercase">S.C. Leite (Encerrada)</p>
                  <p className="text-[10px] text-on-surface-variant leading-tight mt-1">Rota encerrada no KMM porém sem registro de litros descarregados (Canhoto).</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
