export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export const getMesRef = (vencimento: string, mesReferencia?: number): number =>
  mesReferencia ?? new Date(vencimento + 'T00:00:00').getMonth() + 1

export const getAnoRef = (vencimento: string, anoReferencia?: number): number =>
  anoReferencia ?? new Date(vencimento + 'T00:00:00').getFullYear()

export const calcTotalMeses = (start: Date, end: Date): number =>
  Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1)
