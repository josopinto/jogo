'use client'

import { useMemo, useState } from 'react'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { formatNumber } from '@/lib/data-utils'
import { type CellNumber, type RouteStatus, type KmStatus } from '@/lib/types'
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
type FilterKm = KmStatus | 'all' | 'incorreto'

interface Filters {
  celula: FilterCell
  planta: string
  status: FilterStatus
  kmStatus: FilterKm
  roteiro: string
  observacao: string
  placa: string
  dataInicioMin: string
  dataInicioMax: string
  dataTerminoMin: string
  dataTerminoMax: string
  litrosColetadosMin: string
  litrosColetadosMax: string
  litrosDescarregadosMin: string
  litrosDescarregadosMax: string
}

const INITIAL_FILTERS: Filters = {
  celula: 'all',
  planta: 'all',
  status: 'all',
  kmStatus: 'all',
  roteiro: '',
  observacao: '',
  placa: 'all',
  dataInicioMin: '',
  dataInicioMax: '',
  dataTerminoMin: '',
  dataTerminoMax: '',
  litrosColetadosMin: '',
  litrosColetadosMax: '',
  litrosDescarregadosMin: '',
  litrosDescarregadosMax: ''
}

// Quick filters
type QuickFilter = 'pendentes' | 'semContraLeite' | 'kmErrado' | 'regressoAntigo' | 'criticas' | null

export function OperationalDetailTab() {
  const { routes, referenceDate } = useCCO()
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'inicio',
    direction: 'desc'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [searchGlobal, setSearchGlobal] = useState('')
  const itemsPerPage = 50

  // Lista de plantas e placas disponíveis
  const plantas = useMemo(() => {
    const plantaSet = new Set(routes.map(r => r.planta))
    return Array.from(plantaSet).sort()
  }, [routes])

  const placas = useMemo(() => {
    const placaSet = new Set(routes.map(r => r.placa))
    return Array.from(placaSet).sort()
  }, [routes])

  // Verifica se a data de regresso e antiga (nao e a data de referencia)
  const isRegressoAntigo = (route: typeof routes[0]) => {
    if (route.status !== 'Regresso') return false
    if (!referenceDate || !route.inicio) return false
    const routeDate = route.inicio.split(' ')[0]
    return routeDate !== referenceDate
  }

  // Rotas filtradas
  const filteredRoutes = useMemo(() => {
    let result = routes

    // Quick filters
    if (quickFilter === 'pendentes') {
      result = result.filter(r => 
        ['Em execução', 'Com Pendências', 'Previsto'].includes(r.status) || 
        isRegressoAntigo(r)
      )
    } else if (quickFilter === 'semContraLeite') {
      result = result.filter(r => r.litrosDescarregados === 0)
    } else if (quickFilter === 'kmErrado') {
      result = result.filter(r => r.kmStatus !== 'OK')
    } else if (quickFilter === 'regressoAntigo') {
      result = result.filter(r => isRegressoAntigo(r))
    } else if (quickFilter === 'criticas') {
      result = result.filter(r => 
        (['Em execução', 'Com Pendências', 'Previsto'].includes(r.status) || isRegressoAntigo(r)) && 
        (r.litrosDescarregados === 0 || r.kmStatus !== 'OK' || isRegressoAntigo(r))
      )
    }

    // Regular filters
    if (filters.celula !== 'all') {
      result = result.filter(r => r.celula === filters.celula)
    }
    if (filters.planta !== 'all') {
      result = result.filter(r => r.planta === filters.planta)
    }
    if (filters.status !== 'all') {
      if (filters.status === 'pendente') {
        result = result.filter(r => 
          ['Em execução', 'Com Pendências', 'Previsto'].includes(r.status) || 
          isRegressoAntigo(r)
        )
      } else {
        result = result.filter(r => r.status === filters.status)
      }
    }
    if (filters.kmStatus !== 'all') {
      if (filters.kmStatus === 'incorreto') {
        result = result.filter(r => r.kmStatus !== 'OK')
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

    // Date filters
    if (filters.dataInicioMin) {
      result = result.filter(r => r.inicio && r.inicio >= filters.dataInicioMin)
    }
    if (filters.dataInicioMax) {
      result = result.filter(r => r.inicio && r.inicio <= filters.dataInicioMax)
    }
    if (filters.dataTerminoMin) {
      result = result.filter(r => r.termino && r.termino >= filters.dataTerminoMin)
    }
    if (filters.dataTerminoMax) {
      result = result.filter(r => r.termino && r.termino <= filters.dataTerminoMax)
    }

    // Numeric filters
    if (filters.litrosColetadosMin) {
      result = result.filter(r => r.litrosColetados >= Number(filters.litrosColetadosMin))
    }
    if (filters.litrosColetadosMax) {
      result = result.filter(r => r.litrosColetados <= Number(filters.litrosColetadosMax))
    }
    if (filters.litrosDescarregadosMin) {
      result = result.filter(r => r.litrosDescarregados >= Number(filters.litrosDescarregadosMin))
    }
    if (filters.litrosDescarregadosMax) {
      result = result.filter(r => r.litrosDescarregados <= Number(filters.litrosDescarregadosMax))
    }

    // Global search
    if (searchGlobal) {
      const search = searchGlobal.toLowerCase()
      result = result.filter(r => 
        r.planta.toLowerCase().includes(search) ||
        r.roteiro.toLowerCase().includes(search) ||
        r.placa.toLowerCase().includes(search) ||
        r.observacao.toLowerCase().includes(search) ||
        r.status.toLowerCase().includes(search)
      )
    }

    return result
  }, [routes, filters, quickFilter, searchGlobal, referenceDate])

  // Rotas ordenadas
  const sortedRoutes = useMemo(() => {
    return [...filteredRoutes].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof typeof a]
      const bValue = b[sortConfig.key as keyof typeof b]
      
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }, [filteredRoutes, sortConfig])

  // Paginacao
  const paginatedRoutes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sortedRoutes.slice(start, start + itemsPerPage)
  }, [sortedRoutes, currentPage])

  const totalPages = Math.ceil(sortedRoutes.length / itemsPerPage)

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleClearFilters = () => {
    setFilters(INITIAL_FILTERS)
    setQuickFilter(null)
    setSearchGlobal('')
    setCurrentPage(1)
  }

  const handleQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(prev => prev === filter ? null : filter)
    setCurrentPage(1)
  }

  // Contadores para quick filters
  const counts = useMemo(() => {
    return {
      pendentes: routes.filter(r => ['Em execução', 'Com Pendências', 'Previsto'].includes(r.status) || isRegressoAntigo(r)).length,
      semContraLeite: routes.filter(r => r.litrosDescarregados === 0).length,
      kmErrado: routes.filter(r => r.kmStatus !== 'OK').length,
      regressoAntigo: routes.filter(r => isRegressoAntigo(r)).length,
      criticas: routes.filter(r => 
        (['Em execução', 'Com Pendências', 'Previsto'].includes(r.status) || isRegressoAntigo(r)) && 
        (r.litrosDescarregados === 0 || r.kmStatus !== 'OK' || isRegressoAntigo(r))
      ).length
    }
  }, [routes, referenceDate])

  // Verifica se ha filtros ativos
  const hasActiveFilters = useMemo(() => {
    return filters.celula !== 'all' || 
           filters.planta !== 'all' || 
           filters.status !== 'all' || 
           filters.kmStatus !== 'all' ||
           filters.roteiro !== '' ||
           filters.observacao !== '' ||
           filters.placa !== 'all' ||
           filters.dataInicioMin !== '' ||
           filters.dataInicioMax !== '' ||
           filters.dataTerminoMin !== '' ||
           filters.dataTerminoMax !== '' ||
           filters.litrosColetadosMin !== '' ||
           filters.litrosColetadosMax !== '' ||
           filters.litrosDescarregadosMin !== '' ||
           filters.litrosDescarregadosMax !== '' ||
           quickFilter !== null ||
           searchGlobal !== ''
  }, [filters, quickFilter, searchGlobal])

  // Active filter chips
  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = []
    
    if (filters.celula !== 'all') {
      chips.push({ label: `Celula ${filters.celula}`, onRemove: () => setFilters(prev => ({ ...prev, celula: 'all' })) })
    }
    if (filters.planta !== 'all') {
      chips.push({ label: filters.planta, onRemove: () => setFilters(prev => ({ ...prev, planta: 'all' })) })
    }
    if (filters.status !== 'all') {
      chips.push({ label: `Status: ${filters.status}`, onRemove: () => setFilters(prev => ({ ...prev, status: 'all' })) })
    }
    if (filters.kmStatus !== 'all') {
      chips.push({ label: `KM: ${filters.kmStatus}`, onRemove: () => setFilters(prev => ({ ...prev, kmStatus: 'all' })) })
    }
    if (filters.placa !== 'all') {
      chips.push({ label: `Placa: ${filters.placa}`, onRemove: () => setFilters(prev => ({ ...prev, placa: 'all' })) })
    }
    if (filters.roteiro) {
      chips.push({ label: `Roteiro: ${filters.roteiro}`, onRemove: () => setFilters(prev => ({ ...prev, roteiro: '' })) })
    }
    if (filters.observacao) {
      chips.push({ label: `Obs: ${filters.observacao}`, onRemove: () => setFilters(prev => ({ ...prev, observacao: '' })) })
    }
    if (quickFilter) {
      const labels: Record<NonNullable<QuickFilter>, string> = {
        pendentes: 'Rotas Pendentes',
        semContraLeite: 'Sem Contra Leite',
        kmErrado: 'KM Errado',
        regressoAntigo: 'Regresso Antigo',
        criticas: 'Rotas Criticas'
      }
      chips.push({ label: labels[quickFilter], onRemove: () => setQuickFilter(null) })
    }
    
    return chips
  }, [filters, quickFilter])

  const handleExportCSV = () => {
    const headers = ['Celula', 'Planta', 'Roteiro', 'Data Inicio', 'Data Termino', 'Status', 'KM Status', 'Litros Col.', 'Litros Des.', 'Observacao', 'Placa']
    const rows = sortedRoutes.map(r => [
      r.celula,
      r.planta,
      r.roteiro,
      r.inicio || '',
      r.termino || '',
      r.status,
      r.kmStatus,
      r.litrosColetados,
      r.litrosDescarregados,
      r.observacao,
      r.placa
    ])
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `rotas_cco_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getRowClassName = (route: typeof routes[0]) => {
    const isPendente = ['Em execução', 'Com Pendências', 'Previsto'].includes(route.status) || isRegressoAntigo(route)
    
    if (isPendente && (route.litrosDescarregados === 0 || route.kmStatus !== 'OK' || isRegressoAntigo(route))) {
      return 'bg-danger/15 border-l-4 border-l-danger'
    }
    if (isPendente) {
      return 'bg-danger/10'
    }
    if (route.litrosDescarregados === 0) {
      return 'bg-warning/10'
    }
    if (route.kmStatus !== 'OK') {
      return 'bg-orange/10'
    }
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
          <h2 className="text-xl font-semibold">Nenhum arquivo importado</h2>
          <p className="text-muted-foreground">Faça upload dos dados do KMM para visualizar o detalhamento operacional.</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: RouteStatus) => {
    const colors: Record<RouteStatus, string> = {
      'Encerrado': 'bg-success/20 text-success',
      'Com Pendências': 'bg-danger/20 text-danger',
      'Em execução': 'bg-warning/20 text-warning',
      'Previsto': 'bg-muted text-muted-foreground',
      'Regresso': 'bg-danger/20 text-danger'
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
        {status}
      </span>
    )
  }

  const getKmStatusBadge = (kmStatus: KmStatus) => {
    const colors: Record<KmStatus, string> = {
      'OK': 'bg-success/20 text-success',
      'Rodado a mais': 'bg-orange/20 text-orange',
      'Rodado a menos': 'bg-info/20 text-info'
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[kmStatus]}`}>
        {kmStatus}
      </span>
    )
  }

  const SortHeader = ({ label, sortKey, className = '' }: { label: string; sortKey: string; className?: string }) => (
    <th 
      className={`text-left py-3 px-2 text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors ${className}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig.key === sortKey && (
          <span className="text-primary">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <TabHeader 
          title="Detalhamento Operacional" 
          description="Visualizacao completa de todas as rotas linha a linha"
        />
        
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleExportCSV} variant="outline" className="border-border">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={quickFilter === 'pendentes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('pendentes')}
          className={quickFilter === 'pendentes' ? 'bg-danger hover:bg-danger/90' : 'border-danger/50 text-danger hover:bg-danger/10'}
        >
          Pendentes ({formatNumber(counts.pendentes)})
        </Button>
        <Button
          variant={quickFilter === 'semContraLeite' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('semContraLeite')}
          className={quickFilter === 'semContraLeite' ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : 'border-warning/50 text-warning hover:bg-warning/10'}
        >
          Sem Contra Leite ({formatNumber(counts.semContraLeite)})
        </Button>
        <Button
          variant={quickFilter === 'kmErrado' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('kmErrado')}
          className={quickFilter === 'kmErrado' ? 'bg-orange hover:bg-orange/90 text-white' : 'border-orange/50 text-orange hover:bg-orange/10'}
        >
          KM Errado ({formatNumber(counts.kmErrado)})
        </Button>
        <Button
          variant={quickFilter === 'regressoAntigo' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('regressoAntigo')}
          className={quickFilter === 'regressoAntigo' ? 'bg-danger hover:bg-danger/90' : 'border-danger/50 text-danger hover:bg-danger/10'}
        >
          Regresso Antigo ({formatNumber(counts.regressoAntigo)})
        </Button>
        <Button
          variant={quickFilter === 'criticas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickFilter('criticas')}
          className={quickFilter === 'criticas' ? 'bg-danger hover:bg-danger/90' : 'border-danger/50 text-danger hover:bg-danger/10 animate-pulse'}
        >
          Criticas ({formatNumber(counts.criticas)})
        </Button>
      </div>

      {/* Search and Basic Filters */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filtros</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? 'Ocultar Avancados' : 'Mostrar Avancados'}
              <svg className={`w-4 h-4 ml-1 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="Buscar em planta, roteiro, placa, observacao..."
              value={searchGlobal}
              onChange={(e) => { setSearchGlobal(e.target.value); setCurrentPage(1) }}
              className="pl-10 bg-secondary border-border"
            />
          </div>

          {/* Basic Filters */}
          <div className="grid gap-4 md:grid-cols-4">
            <Select value={filters.celula.toString()} onValueChange={(v) => { setFilters(prev => ({ ...prev, celula: v === 'all' ? 'all' : Number(v) as CellNumber })); setCurrentPage(1) }}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Celula" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Celulas</SelectItem>
                <SelectItem value="1">Celula 1</SelectItem>
                <SelectItem value="2">Celula 2</SelectItem>
                <SelectItem value="3">Celula 3</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.planta} onValueChange={(v) => { setFilters(prev => ({ ...prev, planta: v })); setCurrentPage(1) }}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Planta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Plantas</SelectItem>
                {plantas.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(v) => { setFilters(prev => ({ ...prev, status: v as FilterStatus })); setCurrentPage(1) }}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="pendente">Apenas Pendentes</SelectItem>
                <SelectItem value="Encerrado">Encerrado</SelectItem>
                <SelectItem value="Com Pendências">Com Pendencias</SelectItem>
                <SelectItem value="Em execução">Em Execucao</SelectItem>
                <SelectItem value="Previsto">Previsto</SelectItem>
                <SelectItem value="Regresso">Regresso</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.kmStatus} onValueChange={(v) => { setFilters(prev => ({ ...prev, kmStatus: v as FilterKm })); setCurrentPage(1) }}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="KM Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos KM Status</SelectItem>
                <SelectItem value="incorreto">Apenas Incorretos</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
                <SelectItem value="Rodado a mais">Rodado a mais</SelectItem>
                <SelectItem value="Rodado a menos">Rodado a menos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Roteiro (busca)</label>
                  <Input
                    placeholder="Buscar roteiro..."
                    value={filters.roteiro}
                    onChange={(e) => { setFilters(prev => ({ ...prev, roteiro: e.target.value })); setCurrentPage(1) }}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Observacao (busca)</label>
                  <Input
                    placeholder="Buscar observacao..."
                    value={filters.observacao}
                    onChange={(e) => { setFilters(prev => ({ ...prev, observacao: e.target.value })); setCurrentPage(1) }}
                    className="bg-secondary border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Placa</label>
                  <Select value={filters.placa} onValueChange={(v) => { setFilters(prev => ({ ...prev, placa: v })); setCurrentPage(1) }}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Placa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Placas</SelectItem>
                      {placas.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block">Data Inicio</label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="De"
                      value={filters.dataInicioMin}
                      onChange={(e) => { setFilters(prev => ({ ...prev, dataInicioMin: e.target.value })); setCurrentPage(1) }}
                      className="bg-secondary border-border flex-1"
                    />
                    <Input
                      type="date"
                      placeholder="Ate"
                      value={filters.dataInicioMax}
                      onChange={(e) => { setFilters(prev => ({ ...prev, dataInicioMax: e.target.value })); setCurrentPage(1) }}
                      className="bg-secondary border-border flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block">Data Termino</label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="De"
                      value={filters.dataTerminoMin}
                      onChange={(e) => { setFilters(prev => ({ ...prev, dataTerminoMin: e.target.value })); setCurrentPage(1) }}
                      className="bg-secondary border-border flex-1"
                    />
                    <Input
                      type="date"
                      placeholder="Ate"
                      value={filters.dataTerminoMax}
                      onChange={(e) => { setFilters(prev => ({ ...prev, dataTerminoMax: e.target.value })); setCurrentPage(1) }}
                      className="bg-secondary border-border flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block">Litros Coletados</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.litrosColetadosMin}
                      onChange={(e) => { setFilters(prev => ({ ...prev, litrosColetadosMin: e.target.value })); setCurrentPage(1) }}
                      className="bg-secondary border-border flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.litrosColetadosMax}
                      onChange={(e) => { setFilters(prev => ({ ...prev, litrosColetadosMax: e.target.value })); setCurrentPage(1) }}
                      className="bg-secondary border-border flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground block">Litros Descarregados</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.litrosDescarregadosMin}
                      onChange={(e) => { setFilters(prev => ({ ...prev, litrosDescarregadosMin: e.target.value })); setCurrentPage(1) }}
                      className="bg-secondary border-border flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.litrosDescarregadosMax}
                      onChange={(e) => { setFilters(prev => ({ ...prev, litrosDescarregadosMax: e.target.value })); setCurrentPage(1) }}
                      className="bg-secondary border-border flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Filters Chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtros aplicados:</span>
          {activeFilterChips.map((chip, index) => (
            <span 
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs"
            >
              {chip.label}
              <button onClick={chip.onRemove} className="hover:text-primary-foreground">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <button 
            onClick={handleClearFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* Resumo */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          Mostrando <strong className="text-foreground">{formatNumber(Math.min(paginatedRoutes.length, itemsPerPage))}</strong> de{' '}
          <strong className="text-foreground">{formatNumber(sortedRoutes.length)}</strong> rotas
          {sortedRoutes.length !== routes.length && (
            <span className="text-muted-foreground ml-1">(filtrado de {formatNumber(routes.length)} total)</span>
          )}
        </span>
        {hasActiveFilters && (
          <button 
            onClick={handleClearFilters}
            className="text-primary hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 sticky top-0">
                <tr className="border-b border-border">
                  <SortHeader label="Cel" sortKey="celula" className="w-12" />
                  <SortHeader label="Planta" sortKey="planta" />
                  <SortHeader label="Roteiro" sortKey="roteiro" />
                  <SortHeader label="Inicio" sortKey="inicio" />
                  <SortHeader label="Termino" sortKey="termino" />
                  <SortHeader label="Status" sortKey="status" />
                  <SortHeader label="KM Status" sortKey="kmStatus" />
                  <SortHeader label="Lit.Col." sortKey="litrosColetados" className="text-right" />
                  <SortHeader label="Lit.Des." sortKey="litrosDescarregados" className="text-right" />
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Obs</th>
                  <SortHeader label="Placa" sortKey="placa" />
                </tr>
              </thead>
              <tbody>
                {paginatedRoutes.map((route) => (
                  <tr key={route.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${getRowClassName(route)}`}>
                    <td className="py-3 px-2 text-foreground font-medium">{route.celula}</td>
                    <td className="py-3 px-2 text-foreground max-w-[180px] truncate" title={route.planta}>{route.planta}</td>
                    <td className="py-3 px-2 text-foreground font-mono text-xs">{route.roteiro}</td>
                    <td className="py-3 px-2 text-muted-foreground text-xs whitespace-nowrap">{route.inicio || '-'}</td>
                    <td className="py-3 px-2 text-muted-foreground text-xs whitespace-nowrap">{route.termino || '-'}</td>
                    <td className="py-3 px-2">{getStatusBadge(route.status)}</td>
                    <td className="py-3 px-2">{getKmStatusBadge(route.kmStatus)}</td>
                    <td className="py-3 px-2 text-foreground text-right tabular-nums">{formatNumber(route.litrosColetados)}</td>
                    <td className="py-3 px-2 text-foreground text-right tabular-nums">{formatNumber(route.litrosDescarregados)}</td>
                    <td className="py-3 px-2 text-muted-foreground max-w-[180px] truncate" title={route.observacao}>{route.observacao || '-'}</td>
                    <td className="py-3 px-2 text-foreground font-mono text-xs">{route.placa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {sortedRoutes.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma rota encontrada com os filtros selecionados.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paginacao */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Pagina {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              Primeira
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Proxima
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Ultima
            </Button>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground p-4 rounded-lg bg-secondary/30">
        <span className="font-medium text-foreground">Legenda:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-danger/15 border-l-4 border-l-danger" />
          <span>Rota critica (pendente + sem contra leite ou regresso antigo)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-danger/10" />
          <span>Status pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-warning/10" />
          <span>Sem contra leite</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange/10" />
          <span>KM incorreto</span>
        </div>
      </div>
    </div>
  )
}
