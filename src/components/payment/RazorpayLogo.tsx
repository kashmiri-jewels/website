type RazorpayLogoProps = {
  className?: string
}

export function RazorpayLogo({ className = 'h-4 w-auto' }: RazorpayLogoProps) {
  return (
    <img
      src="/assets/payments/razorpay-logo.svg"
      alt="Razorpay"
      className={className}
      loading="lazy"
    />
  )
}
