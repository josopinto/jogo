'use client'

import React from 'react'
import Link from 'next/link'
import { 
  BarChart3, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  LayoutDashboard, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  FileSpreadsheet,
  Search,
  ClipboardCheck,
  TrendingUp,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { INITIAL_ROUTES } from '@/lib/initial-data'
import { calculateGlobalSummary, formatPercentage, formatNumber } from '@/lib/data-utils'

export function LandingPage() {
  const summary = calculateGlobalSummary(INITIAL_ROUTES)
  const pendentesTotal = summary.pendencias + summary.emExecucao + summary.previsto + summary.regresso

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">VIA Group <span className="text-blue-600">CCO</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Funcionalidades</Link>
            <Link href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Como Funciona</Link>
            <Link href="#indicators" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Indicadores</Link>
          </nav>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200">
            <Link href="/dashboard">
              Acessar Dashboard
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32 bg-white">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-30" />
          
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                Sistema de Auditoria Operacional v2.0
              </Badge>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
                Painel de Encerramento <span className="text-blue-600 underline decoration-blue-200 underline-offset-8">KMM</span>
              </h1>
              <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                Controle operacional avançado para acompanhar o encerramento de rotas, pendências, contra leite e KM Status por célula em tempo real.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-white px-8 text-lg h-14 shadow-lg shadow-blue-200">
                  <Link href="/dashboard">
                    Iniciar Monitoramento
                    <LayoutDashboard className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="px-8 text-lg h-14 border-slate-200 hover:bg-slate-50">
                  Saiba mais
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Indicators Section */}
        <section id="indicators" className="py-16 bg-slate-50 border-y border-slate-200">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Indicadores em Tempo Real</h2>
              <p className="text-slate-600">Dados consolidados de todas as células operacionais</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Encerradas no Prazo</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-900">{formatPercentage(summary.percentualEncerramento)}</span>
                    <Badge variant="outline" className="mb-1 bg-green-50 text-green-700 border-green-200">Meta: 95%</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Rotas Pendentes</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-900">{formatNumber(pendentesTotal)}</span>
                    <span className="text-sm text-slate-500 mb-1">de {formatNumber(summary.totalRotas)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Sem Contra Leite</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-900">{formatNumber(summary.semContraLeite)}</span>
                    <Badge variant="outline" className="mb-1 bg-amber-50 text-amber-700 border-amber-200">Atenção</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Zap className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">KM Status Incorreto</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-900">{formatNumber(summary.kmIncorreto)}</span>
                    <span className="text-sm text-slate-500 mb-1">divergências</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="features" className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Recursos Corporativos</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Uma ferramenta completa desenhada para a excelência operacional do CCO VIA Group.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Visão por Célula",
                  description: "Acompanhe o desempenho individual de cada célula operacional com filtros dinâmicos.",
                  icon: Layers,
                  color: "bg-blue-50 text-blue-600"
                },
                {
                  title: "Controle de Pendências",
                  description: "Identifique rapidamente rotas que não foram encerradas no sistema KMM.",
                  icon: ShieldCheck,
                  color: "bg-emerald-50 text-emerald-600"
                },
                {
                  title: "Auditoria de Contra Leite",
                  description: "Valide as divergências entre litros coletados e descarregados em cada roteiro.",
                  icon: Search,
                  color: "bg-purple-50 text-purple-600"
                },
                {
                  title: "Análise de KM Status",
                  description: "Detecte automaticamente discrepâncias entre KM previsto e rodado.",
                  icon: TrendingUp,
                  color: "bg-amber-50 text-amber-600"
                },
                {
                  title: "Ranking Crítico",
                  description: "Visualize as operações que mais impactam os indicadores globais.",
                  icon: MapPin,
                  color: "bg-rose-50 text-rose-600"
                },
                {
                  title: "Dashboard Executivo",
                  description: "Relatórios prontos para apresentações de resultados e tomada de decisão.",
                  icon: LayoutDashboard,
                  color: "bg-indigo-50 text-indigo-600"
                }
              ].map((benefit, i) => (
                <div key={i} className="group p-8 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all border border-transparent hover:border-slate-100">
                  <div className={`w-12 h-12 rounded-xl ${benefit.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <benefit.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{benefit.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section id="how-it-works" className="py-20 bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 skew-x-12 transform translate-x-32" />
          
          <div className="container mx-auto px-4 relative">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Eficiência em 4 passos</h2>
                <p className="text-slate-400 mb-10 text-lg">
                  Simplificamos o fluxo de auditoria para que você foque no que realmente importa: a operação.
                </p>
                
                <div className="space-y-8">
                  {[
                    { step: "01", title: "Importar Dados", desc: "Faça o upload do Excel extraído diretamente do KMM.", icon: FileSpreadsheet },
                    { step: "02", title: "Selecionar Célula", desc: "Filtre os dados pela sua área de responsabilidade.", icon: Layers },
                    { step: "03", title: "Validar Indicadores", desc: "Analise rotas pendentes e divergências de KM.", icon: ClipboardCheck },
                    { step: "04", title: "Plano de Ação", desc: "Gere ações imediatas para corrigir desvios detectados.", icon: Zap }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="text-blue-500 font-mono text-xl font-bold pt-1">{item.step}</div>
                      <div>
                        <h4 className="text-xl font-bold mb-1">{item.title}</h4>
                        <p className="text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="lg:w-1/2 relative">
                <div className="bg-slate-800 rounded-2xl p-4 shadow-2xl border border-slate-700">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="mx-auto text-xs text-slate-500 font-mono">cco-dashboard-v2.exe</div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-32 bg-slate-700/50 rounded-lg animate-pulse" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-24 bg-slate-700/50 rounded-lg animate-pulse" />
                      <div className="h-24 bg-slate-700/50 rounded-lg animate-pulse" />
                    </div>
                    <div className="h-40 bg-slate-700/50 rounded-lg animate-pulse" />
                  </div>
                </div>
                {/* Decorative element */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-blue-600 rounded-full blur-3xl opacity-40 animate-pulse" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="bg-blue-600 rounded-3xl p-10 md:p-16 text-center text-white shadow-2xl shadow-blue-200">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Pronto para otimizar sua operação?</h2>
              <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
                Acesse agora o painel completo e tenha o controle total sobre os encerramentos de rota.
              </p>
              <Button size="lg" asChild className="bg-white text-blue-600 hover:bg-blue-50 px-10 text-lg h-16 shadow-lg">
                <Link href="/dashboard">
                  Ir para o Dashboard
                  <LayoutDashboard className="ml-2 w-6 h-6" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800">VIA Group <span className="text-blue-600">CCO</span></span>
            </div>
            <p className="text-slate-500 text-sm">
              &copy; 2026 VIA Group - Transporte de Leite e Agronegócios. Todos os direitos reservados.
            </p>
            <div className="flex gap-6">
              <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Confidencial</span>
              <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Uso Interno</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
