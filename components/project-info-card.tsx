'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ProjectInfoCard() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Objetivo do Projeto
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? 'Ocultar' : 'Ver mais'}
            <svg className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-foreground">
          Melhorar o percentual de rotas encerradas no prazo, reduzindo pendencias operacionais no KMM, 
          aumentando a confiabilidade das informacoes e apoiando o CCO na cobranca diaria das operacoes.
        </p>

        {isExpanded && (
          <div className="mt-6 space-y-6">
            {/* Regras de Negócio */}
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Regras de Negocio
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20">
                  <h5 className="font-medium text-danger text-sm mb-1">Rotas Pendentes</h5>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>- Rotas abertas (status diferente de Encerrado)</li>
                    <li>- Rotas em execucao</li>
                    <li>- Rotas com pendencia</li>
                    <li>- Regresso antigo (nao e do dia atual)</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <h5 className="font-medium text-warning text-sm mb-1">Sem Contra Leite</h5>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>- Litros descarregados igual a zero</li>
                    <li>- Pode ocorrer em rotas encerradas</li>
                    <li>- Indica problema de registro</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-orange/10 border border-orange/20">
                  <h5 className="font-medium text-orange text-sm mb-1">KM Status Errado</h5>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>- Rodado a mais: KM acima do previsto</li>
                    <li>- Rodado a menos: KM abaixo do previsto</li>
                    <li>- Nao impede encerramento</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                  <h5 className="font-medium text-success text-sm mb-1">Encerramento no Prazo</h5>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>- Meta: 100% D+0 (mesmo dia)</li>
                    <li>- Critico: abaixo de 90%</li>
                    <li>- Atencao: entre 90% e 95%</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Indicadores */}
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Indicadores Monitorados
              </h4>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm text-foreground">% Encerramento no Prazo</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                  <div className="w-3 h-3 rounded-full bg-danger" />
                  <span className="text-sm text-foreground">Total de Rotas Pendentes</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm text-foreground">Rotas sem Contra Leite</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                  <div className="w-3 h-3 rounded-full bg-orange" />
                  <span className="text-sm text-foreground">KM Rodado Incorreto</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                  <div className="w-3 h-3 rounded-full bg-info" />
                  <span className="text-sm text-foreground">Volume de Litros Coletados</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                  <span className="text-sm text-foreground">Ranking por Operacao</span>
                </div>
              </div>
            </div>

            {/* Estrutura Operacional */}
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Estrutura Operacional - 3 Celulas / 28 Operacoes
              </h4>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="p-3 rounded-lg bg-background/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">1</span>
                    <span className="font-medium text-foreground">Celula 1</span>
                    <span className="text-xs text-muted-foreground">(9 ops)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">DPA, ITALAC, LACTALIS, NESTLE, PIRACANJUBA, VERDE CAMPO</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">2</span>
                    <span className="font-medium text-foreground">Celula 2</span>
                    <span className="text-xs text-muted-foreground">(10 ops)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">BRQ, DANONE, DEALE, ITALAC, CATUPIRY, LATPASSOS</p>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">3</span>
                    <span className="font-medium text-foreground">Celula 3</span>
                    <span className="text-xs text-muted-foreground">(9 ops)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">CBL, CCPR, ITALAC, LACTALIS, POLENGHI</p>
                </div>
              </div>
            </div>

            {/* Responsavel */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-foreground">Responsavel: Josue</p>
                  <p className="text-sm text-muted-foreground">CCO - Centro de Controle Operacional</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Suporte Tecnico</p>
                <p className="text-xs text-muted-foreground">Area de Tecnologia</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
