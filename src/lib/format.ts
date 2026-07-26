export function formatPrice(valuePaise: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(valuePaise / 100)
}

export function rupeesToPaise(rupees: number) {
  return Math.round(rupees * 100)
}

export function paiseToRupees(paise: number) {
  return Math.round(paise / 100)
}

export function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
