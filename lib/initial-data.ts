// Dados pré-carregados do período 01/05/2026 a 17/05/2026
import { type Route, type CellNumber, type RouteStatus, type KmStatus } from './types'

// Função auxiliar para gerar rotas sintéticas baseadas nos resumos reais
function generateRoutes(
  celula: CellNumber,
  planta: string,
  total: number,
  encerradas: number,
  pendencias: number,
  emExecucao: number,
  kmOk: number,
  kmMais: number,
  kmMenos: number,
  litrosColetados: number
): Route[] {
  const routes: Route[] = []
  const previsto = Math.max(0, total - encerradas - pendencias - emExecucao)
  const regresso = Math.max(0, total - encerradas - pendencias - emExecucao - previsto)
  
  let statusCounts = {
    encerradas,
    pendencias,
    emExecucao,
    previsto,
    regresso
  }
  
  let kmCounts = { ok: kmOk, mais: kmMais, menos: kmMenos }
  const avgLitros = Math.round(litrosColetados / total)
  
  for (let i = 0; i < total; i++) {
    let status: RouteStatus = 'Encerrado'
    if (statusCounts.pendencias > 0) {
      status = 'Com Pendências'
      statusCounts.pendencias--
    } else if (statusCounts.emExecucao > 0) {
      status = 'Em execução'
      statusCounts.emExecucao--
    } else if (statusCounts.previsto > 0) {
      status = 'Previsto'
      statusCounts.previsto--
    } else if (statusCounts.regresso > 0) {
      status = 'Regresso'
      statusCounts.regresso--
    } else {
      statusCounts.encerradas--
    }
    
    let kmStatus: KmStatus = 'OK'
    if (kmCounts.mais > 0) {
      kmStatus = 'Rodado a mais'
      kmCounts.mais--
    } else if (kmCounts.menos > 0) {
      kmStatus = 'Rodado a menos'
      kmCounts.menos--
    } else {
      kmCounts.ok--
    }
    
    const day = Math.floor(Math.random() * 17) + 1
    const dayStr = day.toString().padStart(2, '0')
    const baseDate = `${dayStr}/05/2026`
    
    // Calcular litros (algumas rotas sem contra leite)
    const hasContraLeite = Math.random() > 0.05 // 5% sem contra leite
    const litros = avgLitros + Math.floor(Math.random() * 1000) - 500
    
    routes.push({
      id: `${celula}-${planta.replace(/\s/g, '-')}-${i}`,
      celula,
      planta,
      roteiro: `${Math.floor(1000 + Math.random() * 9000)}${Math.random() > 0.5 ? 'R' : 'D'}`,
      status,
      eventos: '10/10',
      placa: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(1000 + Math.random() * 9000)}`,
      kmStatus,
      dataInicioManual: `${baseDate} 04:30`,
      dataTerminoManual: `${baseDate} 18:00`,
      inicio: `${baseDate} 05:20`,
      termino: status === 'Encerrado' ? `${baseDate} 17:30` : null,
      observacao: status !== 'Encerrado' ? ['SINAL', 'MANUTENÇÃO', 'N COLETA', 'GRUPO'][Math.floor(Math.random() * 4)] : '',
      litrosColetados: Math.max(0, litros),
      litrosDescarregados: hasContraLeite ? Math.max(0, litros - 100) : 0,
      kmPrevisto: 200 + Math.floor(Math.random() * 100),
      kmDiferenca: kmStatus === 'Rodado a mais' ? Math.floor(Math.random() * 30) : kmStatus === 'Rodado a menos' ? -Math.floor(Math.random() * 30) : 0,
      kmPrevistoTotal: 200,
      kmRodadoTotal: 195,
      kmRodado: 190,
      kmFechamento: 188,
      kmRecebido: 185
    })
  }
  
  return routes
}

// CÉLULA 1 - Dados do período 01/05 a 17/05/2026
const cell1Routes: Route[] = [
  ...generateRoutes(1, 'DPA - ARARAS', 101, 101, 0, 0, 85, 4, 12, 0),
  ...generateRoutes(1, 'ITALAC - PASSO FUNDO', 83, 83, 0, 0, 42, 28, 13, 1057175),
  ...generateRoutes(1, 'LACTALIS - BARRA MANSA', 34, 34, 0, 0, 11, 6, 17, 351697),
  ...generateRoutes(1, 'LACTALIS - BOM CONSELHO', 119, 119, 0, 0, 6, 107, 6, 1254465),
  ...generateRoutes(1, 'NESTLE - MONTES CLAROS', 119, 119, 0, 0, 50, 51, 18, 1904692),
  ...generateRoutes(1, 'PIRACANJUBA - CURVELO', 97, 94, 1, 1, 30, 35, 32, 613805),
  ...generateRoutes(1, 'PIRACANJUBA - PALMINOPOLIS', 103, 97, 2, 3, 66, 19, 18, 1046904),
  ...generateRoutes(1, 'PIRACANJUBA - TRES RIOS', 85, 85, 0, 0, 50, 19, 16, 683227),
  ...generateRoutes(1, 'VERDE CAMPO - LAVRAS MG', 119, 119, 0, 0, 10, 49, 6, 1990169),
]

// CÉLULA 2 - Dados do período 01/05 a 17/05/2026
const cell2Routes: Route[] = [
  ...generateRoutes(2, 'BRQ FOODS - TENENTE PORTELA', 102, 101, 1, 0, 88, 7, 7, 768776),
  ...generateRoutes(2, 'DANONE - BOA ESPERANÇA', 87, 87, 0, 0, 85, 1, 1, 1901262),
  ...generateRoutes(2, 'DANONE - POÇOS DE CALDAS', 300, 295, 5, 0, 98, 108, 94, 6474534),
  ...generateRoutes(2, 'DEALE - ALMIRANTE TAMANDARÉ', 210, 197, 11, 1, 18, 21, 70, 0),
  ...generateRoutes(2, 'DEALE - ARATIBA', 85, 85, 0, 0, 77, 8, 0, 0),
  ...generateRoutes(2, 'DEALE - CATUIPE', 102, 102, 0, 0, 93, 8, 1, 0),
  ...generateRoutes(2, 'ITALAC - JUVINOPOLIS', 179, 164, 15, 0, 40, 104, 35, 2972419),
  ...generateRoutes(2, 'LATICINIOS CATUPIRY - DOVERLANDIA', 152, 138, 10, 1, 22, 43, 87, 1717174),
  ...generateRoutes(2, 'LATICINIOS CATUPIRY - SANTA VITÓRIA', 139, 139, 0, 0, 100, 0, 39, 2129273),
  ...generateRoutes(2, 'LATPASSOS - TRES PASSOS', 76, 76, 0, 0, 32, 23, 21, 654189),
]

// CÉLULA 3 - Dados do período 01/05 a 17/05/2026
const cell3Routes: Route[] = [
  ...generateRoutes(3, 'CBL - ALVOAR', 76, 49, 17, 8, 27, 28, 21, 470711),
  ...generateRoutes(3, 'CCPR - CAMPINA VERDE', 85, 85, 0, 0, 76, 7, 2, 393640),
  ...generateRoutes(3, 'CCPR - GOIANIA', 144, 133, 6, 5, 84, 44, 16, 1976133),
  ...generateRoutes(3, 'CCPR - POMPEU', 223, 223, 0, 0, 38, 96, 89, 2392342),
  ...generateRoutes(3, 'CCPR - UBERLANDIA', 298, 298, 0, 0, 27, 71, 29, 6640664),
  ...generateRoutes(3, 'CCPR - UNAI', 192, 186, 3, 1, 81, 76, 35, 1193286),
  ...generateRoutes(3, 'ITALAC - CRISSIUMAL', 124, 124, 0, 0, 82, 30, 12, 1416134),
  ...generateRoutes(3, 'LACTALIS - ARAÇATUBA', 17, 17, 0, 0, 11, 6, 0, 0),
  ...generateRoutes(3, 'LATICINIOS - POLENGHI', 23, 22, 1, 0, 15, 1, 7, 0),
]

export const INITIAL_ROUTES: Route[] = [...cell1Routes, ...cell2Routes, ...cell3Routes]

export const INITIAL_STATE = {
  routes: INITIAL_ROUTES,
  lastUpload: '17/05/2026 08:00',
  uploadSummary: {
    cell1: cell1Routes.length,
    cell2: cell2Routes.length,
    cell3: cell3Routes.length
  }
}
