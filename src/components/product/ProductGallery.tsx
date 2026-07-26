import { Dialog } from '@base-ui/react/dialog'
import { Expand, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type UIEvent } from 'react'

import type { Product } from '../../data/products'
import { joinClasses } from '../../lib/format'
import { getProductImage, getProductImageProps } from '../../lib/product-images'

type ProductGalleryProps = {
  product: Product
  imageFit?: 'cover' | 'contain'
  variant?: 'default' | 'quickLook'
}

const MAGNIFIER_SIZE = 192
const MAGNIFIER_ZOOM = 2.35

export function ProductGallery({
  product,
  imageFit = 'cover',
  variant = 'default',
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const mobileStripRef = useRef<HTMLDivElement | null>(null)
  const [magnifier, setMagnifier] = useState({
    active: false,
    backgroundHeight: 0,
    backgroundPositionX: 0,
    backgroundPositionY: 0,
    backgroundWidth: 0,
    height: 0,
    imageSrc: '',
    width: 0,
    x: 0,
    y: 0,
  })
  const isQuickLook = variant === 'quickLook'
  const canMagnify = !isQuickLook && imageFit === 'cover'
  const activeImage = getProductImage(product, activeIndex)

  useEffect(() => {
    setActiveIndex(0)
    setViewerOpen(false)
    setMagnifier((current) => ({ ...current, active: false }))
  }, [product.variantId, product.images])

  function handleMouseMove(event: MouseEvent<HTMLButtonElement>) {
    if (!canMagnify) return

    const image = event.currentTarget.querySelector<HTMLImageElement>('img')
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds || !image) return

    const x = event.clientX - bounds.left
    const y = event.clientY - bounds.top
    const clampedX = Math.min(bounds.width, Math.max(0, x))
    const clampedY = Math.min(bounds.height, Math.max(0, y))
    const imageWidth = image.naturalWidth || bounds.width
    const imageHeight = image.naturalHeight || bounds.height
    const coverBox = getObjectCoverTopBox({
      frameHeight: bounds.height,
      frameWidth: bounds.width,
      imageHeight,
      imageWidth,
    })
    const imageX = Math.min(coverBox.width, Math.max(0, clampedX - coverBox.offsetX))
    const imageY = Math.min(coverBox.height, Math.max(0, clampedY - coverBox.offsetY))

    setMagnifier({
      active: true,
      backgroundHeight: coverBox.height * MAGNIFIER_ZOOM,
      backgroundPositionX: MAGNIFIER_SIZE / 2 - imageX * MAGNIFIER_ZOOM,
      backgroundPositionY: MAGNIFIER_SIZE / 2 - imageY * MAGNIFIER_ZOOM,
      backgroundWidth: coverBox.width * MAGNIFIER_ZOOM,
      height: bounds.height,
      imageSrc: image.currentSrc || activeImage,
      width: bounds.width,
      x,
      y,
    })
  }

  function handleMobileScroll(event: UIEvent<HTMLDivElement>) {
    const nextIndex = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth)

    if (nextIndex !== activeIndex) {
      setActiveIndex(Math.min(product.images.length - 1, Math.max(0, nextIndex)))
    }
  }

  function showMobileImage(index: number) {
    setActiveIndex(index)
    mobileStripRef.current?.scrollTo({
      behavior: 'smooth',
      left: mobileStripRef.current.clientWidth * index,
    })
  }

  return (
    <>
      <div className="min-w-0 max-w-full lg:hidden">
        <div
          ref={mobileStripRef}
          className="flex max-w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[var(--radius-image)] bg-[var(--color-surface)]"
          onScroll={handleMobileScroll}
        >
          {product.images.map((image, index) => (
            <button
              key={image}
              type="button"
              aria-label={`Open image ${index + 1} of ${product.title}`}
              onClick={() => {
                setActiveIndex(index)
                setViewerOpen(true)
              }}
              className={joinClasses(
                'relative min-w-full max-w-full shrink-0 snap-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset',
                imageFit === 'contain' ? '' : 'aspect-[4/5]',
              )}
            >
              <GalleryImage
                product={product}
                index={index}
                sizes="100vw"
                alt={index === 0 ? product.imageAlt : ''}
                className={joinClasses(
                  'w-full text-transparent',
                  imageFit === 'contain' ? 'h-auto' : 'h-full object-cover object-top',
                )}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={index === 0 ? 'high' : undefined}
              />
              <span className="absolute right-3 top-3 grid size-10 place-items-center rounded-full border border-[var(--color-line)] bg-[var(--color-paper)]/92 text-[var(--color-ink)] shadow-sm backdrop-blur">
                <Expand className="size-4" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
        {product.images.length > 1 ? (
          <div
            className="mt-3 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1"
            aria-label="Product image previews"
          >
            {product.images.map((image, index) => (
              <button
                key={image}
                type="button"
                aria-label={`View image ${index + 1}`}
                aria-pressed={activeIndex === index}
                onClick={() => showMobileImage(index)}
                className={joinClasses(
                  'relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-[var(--radius-image)] border bg-[var(--color-surface)] transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
                  activeIndex === index
                    ? 'border-[var(--color-primary)]'
                    : 'border-transparent',
                )}
              >
                <GalleryImage
                  product={product}
                  index={index}
                  sizes="64px"
                  alt=""
                  className="h-full w-full object-cover text-transparent"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="hidden min-w-0 max-w-full lg:block">
        <div
          onMouseLeave={() => setMagnifier((current) => ({ ...current, active: false }))}
          className={joinClasses(
            'relative max-w-full overflow-visible',
            canMagnify ? 'lg:z-10' : '',
          )}
        >
          <button
            type="button"
            aria-label={`Open larger image of ${product.title}`}
            onClick={() => setViewerOpen(true)}
            onMouseMove={handleMouseMove}
            data-gallery-frame
            className={joinClasses(
              'quick-gallery-main relative block w-full overflow-hidden rounded-[var(--radius-image)] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
              isQuickLook
                ? 'h-[min(42svh,390px)] bg-[var(--color-surface)] sm:h-[min(54svh,520px)] lg:h-[min(62vh,620px)]'
                : 'cursor-zoom-in bg-[var(--color-line)]',
            )}
          >
            <GalleryImage
              product={product}
              index={activeIndex}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt={product.imageAlt}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className={joinClasses(
                'w-full text-transparent',
                imageFit === 'contain'
                  ? 'h-auto'
                  : joinClasses(
                      'h-full object-cover object-top',
                      isQuickLook
                        ? 'aspect-[4/5] lg:aspect-auto'
                        : 'aspect-[4/5] lg:h-[calc(100svh-var(--site-header-height)-2rem)] lg:min-h-[680px]',
                    ),
              )}
            />
            {!isQuickLook ? (
              <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-[var(--color-line)] bg-[var(--color-paper)]/92 text-[var(--color-ink)] shadow-sm backdrop-blur">
                <Expand className="size-4" aria-hidden="true" />
              </span>
            ) : null}
          </button>
          {canMagnify ? (
            <div
              aria-hidden="true"
              className={joinClasses(
                'pointer-events-none absolute z-10 hidden size-48 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-[var(--color-paper)] bg-[var(--color-surface)] ring-2 ring-[var(--color-primary)]/15 transition-opacity duration-150 lg:block',
                magnifier.active ? 'opacity-100' : 'opacity-0',
              )}
              style={{
                backgroundImage: magnifier.imageSrc ? `url("${magnifier.imageSrc}")` : undefined,
                backgroundPosition: `${magnifier.backgroundPositionX}px ${magnifier.backgroundPositionY}px`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${magnifier.backgroundWidth}px ${magnifier.backgroundHeight}px`,
                left: `${magnifier.x}px`,
                top: `${magnifier.y}px`,
              }}
            />
          ) : null}
        </div>
        {product.images.length > 1 ? (
          <div
            className="mt-3 flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1"
            aria-label="Product image previews"
          >
            {product.images.map((image, index) => (
              <button
                key={image}
                type="button"
                aria-label={`View image ${index + 1} of ${product.title}`}
                aria-pressed={activeIndex === index}
                onClick={() => setActiveIndex(index)}
                className={joinClasses(
                  'relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-[var(--radius-image)] border bg-[var(--color-surface)] transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 xl:w-20',
                  activeIndex === index
                    ? 'border-[var(--color-primary)]'
                    : 'border-transparent hover:border-[var(--color-line)]',
                )}
              >
                <GalleryImage
                  product={product}
                  index={index}
                  sizes="(min-width: 1280px) 80px, 64px"
                  alt=""
                  className="h-full w-full object-cover text-transparent"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog.Root open={viewerOpen} onOpenChange={setViewerOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-stone-950/86 backdrop-blur-sm transition duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Viewport className="fixed inset-0 z-50 flex min-h-svh items-center justify-center p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:p-6">
            <Dialog.Popup className="relative flex h-full w-full flex-col justify-center outline-none">
              <Dialog.Title className="sr-only">{product.title} images</Dialog.Title>
              <Dialog.Close
                aria-label="Close image viewer"
                className="absolute right-2 top-2 z-10 grid size-11 place-items-center rounded-full bg-[var(--color-paper)]/92 text-[var(--color-ink)] shadow-sm backdrop-blur transition duration-150 ease-out hover:bg-[var(--color-paper)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-95 sm:right-4 sm:top-4"
              >
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
              <div className="flex snap-x snap-mandatory overflow-x-auto">
                {product.images.map((image, index) => (
                  <div key={image} className="relative flex h-[82svh] w-full shrink-0 snap-center items-center overflow-hidden sm:h-[88svh]">
                    <GalleryImage
                      product={product}
                      index={index}
                      sizes="(min-width: 1024px) 80vw, 100vw"
                      alt={index === 0 ? product.imageAlt : ''}
                      className="max-h-full w-full object-contain text-transparent"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ))}
              </div>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

function getObjectCoverTopBox({
  frameHeight,
  frameWidth,
  imageHeight,
  imageWidth,
}: {
  frameHeight: number
  frameWidth: number
  imageHeight: number
  imageWidth: number
}) {
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale

  return {
    height,
    offsetX: (frameWidth - width) / 2,
    offsetY: 0,
    width,
  }
}

type GalleryImageProps = {
  alt: string
  className: string
  decoding?: 'async' | 'auto' | 'sync'
  draggable?: boolean
  fetchPriority?: 'auto' | 'high' | 'low'
  index: number
  loading?: 'eager' | 'lazy'
  product: Product
  sizes: string
  style?: CSSProperties
}

function GalleryImage({
  alt,
  className,
  decoding,
  draggable,
  fetchPriority,
  index,
  loading,
  product,
  sizes,
  style,
}: GalleryImageProps) {
  const [broken, setBroken] = useState(false)

  return (
    <>
      {broken ? (
        <div className="absolute inset-0 bg-[var(--color-surface)]">
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[var(--color-blush)]/60" />
          <div className="absolute inset-x-0 bottom-[38%] h-[7%] bg-[var(--color-line-strong)]" />
          <div className="absolute bottom-0 right-0 h-[22%] w-[38%] bg-[var(--color-primary)]/85" />
        </div>
      ) : null}
      <img
        {...getProductImageProps(product, index, sizes)}
        alt={alt}
        className={joinClasses(className, broken ? 'opacity-0' : 'opacity-100')}
        decoding={decoding}
        draggable={draggable}
        fetchPriority={fetchPriority}
        loading={loading}
        onError={() => setBroken(true)}
        style={style}
      />
    </>
  )
}
