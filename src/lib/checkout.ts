import { getAmountBucket } from './analytics'
import { formatPrice } from './format'
import {
  isKnownCityForIndianState,
  isKnownIndianState,
  isPincodeLikelyForIndianState,
  isValidIndianPincode,
  otherCityValue,
} from '../../shared/indian-address'

export type CheckoutForm = {
  email: string
  fullName: string
  phone: string
  whatsappUpdatesOptIn: boolean
  addressLine: string
  landmark: string
  city: string
  cityOther: string
  state: string
  pincode: string
}

export const initialCheckoutForm: CheckoutForm = {
  email: '',
  fullName: '',
  phone: '',
  whatsappUpdatesOptIn: false,
  addressLine: '',
  landmark: '',
  city: '',
  cityOther: '',
  state: '',
  pincode: '',
}

export type CheckoutFormErrors = Partial<Record<keyof CheckoutForm, string>>

export type CheckoutStatus =
  | 'idle'
  | 'preparing'
  | 'ready'
  | 'opening'
  | 'payment-open'
  | 'confirming'
  | 'success'
  | 'cancelled'
  | 'error'

export type CreateOrderResponse = {
  keyId: string
  orderUuid: string
  orderNumber: string
  invoiceNumber?: string
  orderId: string
  amount: number
  currency: string
  totals: {
    subtotal: number
    shipping: number
    total: number
  }
}

export type VerifyPaymentResponse = {
  verified: boolean
  orderUuid?: string
  orderNumber?: string
  invoiceNumber?: string
  paymentId?: string
  orderId?: string
  orderStatus?: string
  shipment?: {
    orderStatus?: string
    shipmentStatus?: string
    trackingNumber?: string | null
    providerOrderId?: string | null
  } | null
  error?: string
}

export type RazorpaySuccessResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export type PendingOrder = CreateOrderResponse & {
  fingerprint: string
}

export type CheckoutConfirmation = {
  orderNumber: string
  paymentId?: string
  orderStatus?: string
  shipmentStatus?: string
  trackingNumber?: string | null
  needsReview: boolean
}

export function isBusyCheckoutStatus(status: CheckoutStatus) {
  return (
    status === 'preparing' ||
    status === 'opening' ||
    status === 'payment-open' ||
    status === 'confirming'
  )
}

export function getPayButtonLabel(status: CheckoutStatus, total: number) {
  if (status === 'preparing') return 'Preparing order'
  if (status === 'opening') return 'Opening payment'
  if (status === 'payment-open') return 'Payment window open'
  if (status === 'confirming') return 'Confirming payment'
  if (status === 'ready') return `Pay ${formatPrice(total)}`
  if (status === 'cancelled') return 'Try payment again'
  if (status === 'error') return 'Try again'

  return `Pay ${formatPrice(total)}`
}

export function getMobilePayButtonLabel(status: CheckoutStatus) {
  if (status === 'preparing') return 'Preparing'
  if (status === 'opening') return 'Opening'
  if (status === 'payment-open') return 'Opened'
  if (status === 'confirming') return 'Confirming'
  if (status === 'cancelled') return 'Try again'
  if (status === 'error') return 'Try again'

  return 'Pay now'
}

export function getCheckoutAnalyticsPayload(itemCount: number, totalPaise: number) {
  return {
    amount_bucket: getAmountBucket(totalPaise),
    item_count: itemCount,
  }
}

export function validateCheckoutForm(form: CheckoutForm) {
  const errors = validateCheckoutFormFields(form)
  return Object.values(errors)[0] ?? ''
}

export function validateCheckoutFormFields(form: CheckoutForm): CheckoutFormErrors {
  const errors: CheckoutFormErrors = {}
  const requiredFields = [
    ['email', form.email, 'Email is required.'],
    ['fullName', form.fullName, 'Full name is required.'],
    ['phone', form.phone, 'Phone number is required.'],
    ['addressLine', form.addressLine, 'Address is required.'],
    ['state', form.state, 'Select a state or union territory.'],
    ['city', form.city, 'Select a city.'],
    ['pincode', form.pincode, 'Pincode is required.'],
  ] as const

  for (const [field, value, message] of requiredFields) {
    if (!value.trim()) errors[field] = message
  }

  if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (form.fullName.trim() && form.fullName.trim().length < 2) {
    errors.fullName = 'Enter the full name for delivery.'
  }

  if (form.phone.trim() && !normalizePhoneForPayment(form.phone)) {
    errors.phone = 'Enter a valid 10 digit Indian phone number.'
  }

  if (form.addressLine.trim() && form.addressLine.trim().length < 8) {
    errors.addressLine = 'Enter a complete house, building, and street address.'
  }

  if (form.state.trim() && !isKnownIndianState(form.state.trim())) {
    errors.state = 'Select a valid state or union territory.'
  }

  if (form.city === otherCityValue) {
    if (!form.cityOther.trim()) {
      errors.cityOther = 'Enter your city or town.'
    } else if (form.cityOther.trim().length < 2) {
      errors.cityOther = 'City or town is too short.'
    } else if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(form.cityOther.trim())) {
      errors.cityOther = 'Use a valid city or town name.'
    }
  } else if (form.state.trim() && form.city.trim() && !isKnownCityForIndianState(form.state.trim(), form.city.trim())) {
    errors.city = 'Select a valid city for this state.'
  }

  if (form.pincode.trim() && !isValidIndianPincode(form.pincode)) {
    errors.pincode = 'Enter a valid 6 digit Indian pincode.'
  } else if (
    form.pincode.trim() &&
    form.state.trim() &&
    isKnownIndianState(form.state.trim()) &&
    !isPincodeLikelyForIndianState(form.pincode, form.state)
  ) {
    errors.pincode = 'Pincode does not look valid for the selected state.'
  }

  return errors
}

export function normalizeCheckoutForm(form: CheckoutForm): CheckoutForm {
  const city = form.city === otherCityValue ? form.cityOther : form.city

  return {
    email: form.email.trim().toLowerCase(),
    fullName: form.fullName.trim(),
    phone: normalizePhoneForPayment(form.phone) || form.phone.trim(),
    whatsappUpdatesOptIn: form.whatsappUpdatesOptIn,
    addressLine: form.addressLine.trim(),
    landmark: form.landmark.trim(),
    city: city.trim(),
    cityOther: '',
    state: form.state.trim(),
    pincode: form.pincode.replace(/\D/g, '').slice(0, 6),
  }
}

function normalizePhoneForPayment(phone: string) {
  const trimmedPhone = phone.trim()
  const digits = trimmedPhone.replace(/\D/g, '')

  if (/^\+\d{10,15}$/.test(trimmedPhone)) return trimmedPhone
  if (/^\d{10}$/.test(digits)) return `+91${digits}`
  if (/^91\d{10}$/.test(digits)) return `+${digits}`

  return ''
}

export function createSuccessMessage(verification: VerifyPaymentResponse) {
  if (verification.shipment?.trackingNumber) {
    return `Your order is confirmed. Tracking number: ${verification.shipment.trackingNumber}.`
  }

  if (verification.orderStatus === 'shipment_pending') {
    return 'Your order is confirmed. We will share tracking after dispatch.'
  }

  return 'Your order is confirmed. We will start preparing it shortly.'
}

export function formatCustomerOrderStatus(status: string) {
  const labels: Record<string, string> = {
    paid: 'Confirmed',
    shipment_pending: 'Preparing',
    payment_review_required: 'Being checked',
    payment_pending: 'Awaiting payment',
    payment_failed: 'Payment incomplete',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }

  return labels[status] ?? toTitleCase(status)
}

export function formatCustomerDeliveryStatus(status: string) {
  const labels: Record<string, string> = {
    pending: 'Preparing for dispatch',
    shipment_pending: 'Preparing for dispatch',
    created: 'Preparing for dispatch',
    in_transit: 'On the way',
    delivered: 'Delivered',
    failed: 'We will contact you',
  }

  return labels[status] ?? toTitleCase(status)
}

function toTitleCase(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
