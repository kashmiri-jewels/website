import { Field } from '@base-ui/react/field'
import type { HTMLAttributes, SelectHTMLAttributes } from 'react'

type CheckoutFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
  error?: string
  type?: string
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
  placeholder?: string
  autoComplete?: string
  enterKeyHint?: HTMLAttributes<HTMLInputElement>['enterKeyHint']
  maxLength?: number
  required?: boolean
}

export function CheckoutField({
  label,
  value,
  onChange,
  className,
  error,
  type = 'text',
  inputMode,
  placeholder,
  autoComplete,
  enterKeyHint,
  maxLength,
  required = true,
}: CheckoutFieldProps) {
  return (
    <Field.Root className={className}>
      <Field.Label className="text-sm font-medium text-[var(--color-ink)]">{label}</Field.Label>
      <Field.Control
        required={required}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete={autoComplete}
        enterKeyHint={enterKeyHint}
        maxLength={maxLength}
        aria-invalid={Boolean(error) || undefined}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={`mt-2 h-11 w-full border bg-[var(--color-paper)] px-4 text-sm text-[var(--color-ink)] outline-none transition duration-150 ease-out placeholder:text-[var(--color-muted)]/70 focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-soft)] ${
          error ? 'border-red-400' : 'border-[var(--color-line)]'
        }`}
      />
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </Field.Root>
  )
}

type CheckoutSelectOption = {
  label: string
  value: string
}

type CheckoutSelectProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: CheckoutSelectOption[]
  className?: string
  error?: string
  placeholder?: string
  autoComplete?: SelectHTMLAttributes<HTMLSelectElement>['autoComplete']
  disabled?: boolean
  required?: boolean
}

export function CheckoutSelect({
  label,
  value,
  onChange,
  options,
  className,
  error,
  placeholder = 'Select',
  autoComplete,
  disabled = false,
  required = true,
}: CheckoutSelectProps) {
  return (
    <Field.Root className={className}>
      <Field.Label className="text-sm font-medium text-[var(--color-ink)]">{label}</Field.Label>
      <select
        required={required}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error) || undefined}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={`mt-2 h-11 w-full appearance-none border bg-[var(--color-paper)] px-4 text-sm text-[var(--color-ink)] outline-none transition duration-150 ease-out focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-soft)] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 ${
          error ? 'border-red-400' : 'border-[var(--color-line)]'
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </Field.Root>
  )
}
