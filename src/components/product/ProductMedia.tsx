import { useState } from 'react'

import type { Product } from '../../data/products'
import { getProductImageProps } from '../../lib/product-images'

type ProductMediaProps = {
  product: Product
  priority?: boolean
  className?: string
  hoverZoom?: boolean
  sizes?: string
}

export function ProductMedia({
  product,
  priority,
  className = '',
  hoverZoom = false,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
}: ProductMediaProps) {
  const [imageBroken, setImageBroken] = useState(false)
  const image = getProductImageProps(product, 0, sizes)
  const hoverImage = !imageBroken && hoverZoom && product.images[1] ? getProductImageProps(product, 1, sizes) : undefined

  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-image)] bg-[var(--color-surface)] ${className}`}>
      {imageBroken ? (
        <div className="absolute inset-0 bg-[var(--color-surface)]">
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[var(--color-blush)]/60" />
          <div className="absolute inset-x-0 bottom-[38%] h-[7%] bg-[var(--color-line-strong)]" />
          <div className="absolute bottom-0 right-0 h-[22%] w-[38%] bg-[var(--color-primary)]/85" />
        </div>
      ) : null}
      <img
        {...image}
        alt={product.imageAlt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => {
          setImageBroken(true)
        }}
        className={`h-full w-full object-cover text-transparent transition duration-500 ease-out ${
          imageBroken ? 'opacity-0' : 'opacity-100'
        } ${hoverZoom ? 'motion-safe:group-hover:scale-[1.03] motion-safe:group-hover/card:scale-[1.03]' : ''}`}
      />
      {hoverImage ? (
        <img
          {...hoverImage}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
            setImageBroken(true)
          }}
          className={`absolute inset-0 h-full w-full object-cover text-transparent opacity-0 transition duration-500 ease-out motion-safe:group-hover:opacity-100 motion-safe:group-focus-visible:opacity-100 motion-safe:group-hover/card:opacity-100 ${
            hoverZoom
              ? 'motion-safe:group-hover:scale-[1.03] motion-safe:group-focus-visible:scale-[1.03] motion-safe:group-hover/card:scale-[1.03]'
              : ''
          }`}
        />
      ) : null}
    </div>
  )
}
