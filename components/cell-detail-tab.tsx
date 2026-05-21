'use client'

import { useMemo, useState } from 'react'
import { useCCO } from './cco-context'
import { TabHeader } from './tab-header'
import { calculateCellSummary, formatNumber, formatPercentage, getPercentageColor } from '@/lib/data-utils'
import { type CellNumber } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell as RechartsCell
} from 'recharts'

const CELL_DESCRIPTIONS: Record<CellNumber, string> = {
  1: 'DPA, ITALAC, LACTALIS, NESTLE, PIRACANJUBA, VERDE CAMPO',
  2: 'BRQ, DANONE, DEALE, ITALAC, CATUPIRY, LATPASSOS',
  3: 'CBL, CCPR, ITALAC, LACTALIS, POLENGHI'
}

export function CellDetailTab() {
  const { routes } = useCCO()
  const [selectedCell, setSelectedCell] = useState<CellNumber>(1)

  const cellSummary = useMemo(() => {
    return calculateCellSummary(routes, selectedCell)
  }, [routes, selectedCell])

  // Dados para gráfico de barras horizontais do ranking
  const rankingData = useMemo(() => {
    return [...cellSummary.plantas]
      .sort((a, b) => a.percentualEncerramento - b.percentualEncerramento)
      .map(p => ({
        name: p.planta.length > 25 ? p.planta.substring(0, 23) + '...' : p.planta,
        fullName: p.planta,
        percentual: p.percentualEncerramento,
        fill: p.percentualEncerramento >= 95 ? '#00c9a7' : p.percentualEncerramento >= 90 ? '#ffd166' : '#ff6b6b'
      }))
  }, [cellSummary])

  return (
    <div className="space-y-6">
      <TabHeader 
        title="Detalhe por Celula" 
        description="Analise detalhada das operacoes de cada celula"
      />
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="p-3 rounded-lg bg-secondary/50 border border-border flex-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Operacoes da Celula {selectedCell}:</span> {CELL_DESCRIPTIONS[selectedCell]}
          </p>
        </div>
        
        <Select value={selectedCell.toString()} onValueChange={(v) => setSelectedCell(Number(v) as CellNumber)}>
          <SelectTrigger className="w-48 bg-secondary border-border">
            <SelectValue placeholder="Selecionar celula" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Celula 1 - 9 operacoes</SelectItem>
            <SelectItem value="2">Celula 2 - 10 operacoes</SelectItem>
            <SelectItem value="3">Celula 3 - 9 operacoes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs da Célula */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">% Encerramento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${cellSummary.percentualEncerramento >= 95 ? 'text-success' : cellSummary.percentualEncerramento >= 90 ? 'text-warning' : 'text-danger'}`}>
              {formatPercentage(cellSummary.percentualEncerramento)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Meta: 100%</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Total Rotas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{formatNumber(cellSummary.totalRotas)}</div>
            <p className="text-xs text-muted-foreground mt-1">{cellSummary.plantas.length} plantas</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Encerradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{formatNumber(cellSummary.encerradas)}</div>
            <p className="text-xs text-muted-foreground mt-1">no prazo D+0</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-danger">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Pendentes Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-danger">{formatNumber(cellSummary.pendencias + cellSummary.emExecucao + cellSummary.previsto + cellSummary.regresso)}</div>
            <p className="text-xs text-muted-foreground mt-1">{cellSummary.pendencias} pend + {cellSummary.emExecucao} exec</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">KM OK / Incorreto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span className="text-success">{formatNumber(cellSummary.kmOk)}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-orange">{formatNumber(cellSummary.kmMais + cellSummary.kmMenos)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">+{cellSummary.kmMais} / -{cellSummary.kmMenos}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">Litros Coletados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatNumber(cellSummary.litrosColetados)}</div>
            <p className="text-xs text-muted-foreground mt-1">no periodo</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking das plantas da célula */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Ranking de Plantas - Celula {selectedCell}</CardTitle>
          <p className="text-sm text-muted-foreground">% de encerramento do menor para o maior</p>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingData} layout="vertical" margin={{ left: 30, right: 30 }}>
                <XAxis type="number" domain={[0, 100]} stroke="#6b7280" fontSize={12} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} width={150} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Encerramento']}
                  labelFormatter={(label) => rankingData.find(d => d.name === label)?.fullName || label}
                />
                <Bar dataKey="percentual" radius={[0, 4, 4, 0]}>
                  {rankingData.map((entry, index) => (
                    <RechartsCell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela detalhada por planta */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Tabela Detalhada por Planta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Planta</th>
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium">Total</th>
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium">Enc.</th>
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium">Pend.</th>
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium">Em Exec.</th>
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium">% Enc.</th>
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium">KM OK</th>
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium">KM+</th>
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium">KM-</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Litros Col.</th>
                </tr>
              </thead>
              <tbody>
                {cellSummary.plantas.sort((a, b) => a.percentualEncerramento - b.percentualEncerramento).map((planta) => (
                  <tr key={planta.planta} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-3 px-2 text-foreground">{planta.planta}</td>
                    <td className="text-center py-3 px-2 text-foreground">{planta.totalRotas}</td>
                    <td className="text-center py-3 px-2 text-success">{planta.encerradas}</td>
                    <td className="text-center py-3 px-2 text-danger">{planta.pendencias}</td>
                    <td className="text-center py-3 px-2 text-warning">{planta.emExecucao}</td>
                    <td className="text-center py-3 px-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-secondary rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getPercentageColor(planta.percentualEncerramento)}`}
                            style={{ width: `${Math.min(planta.percentualEncerramento, 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${planta.percentualEncerramento >= 95 ? 'text-success' : planta.percentualEncerramento >= 90 ? 'text-warning' : 'text-danger'}`}>
                          {formatPercentage(planta.percentualEncerramento)}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2 text-success">{planta.kmOk}</td>
                    <td className="text-center py-3 px-2 text-orange">{planta.kmMais}</td>
                    <td className="text-center py-3 px-2 text-info">{planta.kmMenos}</td>
                    <td className="text-right py-3 px-2 text-foreground">{formatNumber(planta.litrosColetados)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-secondary/30 font-medium">
                  <td className="py-3 px-2 text-foreground">Total Celula {selectedCell}</td>
                  <td className="text-center py-3 px-2 text-foreground">{cellSummary.totalRotas}</td>
                  <td className="text-center py-3 px-2 text-success">{cellSummary.encerradas}</td>
                  <td className="text-center py-3 px-2 text-danger">{cellSummary.pendencias}</td>
                  <td className="text-center py-3 px-2 text-warning">{cellSummary.emExecucao}</td>
                  <td className="text-center py-3 px-2">
                    <span className={`font-bold ${cellSummary.percentualEncerramento >= 95 ? 'text-success' : cellSummary.percentualEncerramento >= 90 ? 'text-warning' : 'text-danger'}`}>
                      {formatPercentage(cellSummary.percentualEncerramento)}
                    </span>
                  </td>
                  <td className="text-center py-3 px-2 text-success">{cellSummary.kmOk}</td>
                  <td className="text-center py-3 px-2 text-orange">{cellSummary.kmMais}</td>
                  <td className="text-center py-3 px-2 text-info">{cellSummary.kmMenos}</td>
                  <td className="text-right py-3 px-2 text-foreground">{formatNumber(cellSummary.litrosColetados)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
