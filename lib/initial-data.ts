import { type Route, type AppState } from './types'

export const INITIAL_ROUTES: Route[] = []

export const INITIAL_STATE: AppState = {
  routes: INITIAL_ROUTES,
  lastUpload: null,
  referenceDate: null,
  uploadSummary: {
    cell1: 0,
    cell2: 0,
    cell3: 0
  }
}
