export const inrCurrency = 'INR'

export function rupeesToPaise(rupees: number) {
  return Math.round(rupees * 100)
}

export function paiseToRupees(paise: number) {
  return paise / 100
}

export function formatInrFromPaise(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: inrCurrency,
    maximumFractionDigits: 0,
  }).format(paiseToRupees(paise))
}
