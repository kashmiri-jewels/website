import { Button } from '@base-ui/react/button'
import { useEffect, useState } from 'react'

import type { HomePageContent } from '../../lib/storefront-content'
import { StyleFinder } from '../product/StyleFinder'

type HomeHeroProps = {
  content: HomePageContent['hero']
}

export function HomeHero({ content }: HomeHeroProps) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const slides = content.slides

  useEffect(() => {
    if (slides.length <= 1) return

    const interval = window.setInterval(() => {
      setActiveSlideIndex((current) => (current + 1) % slides.length)
    }, 5000)

    return () => window.clearInterval(interval)
  }, [slides.length])

  useEffect(() => {
    setActiveSlideIndex(0)
  }, [slides])

  return (
    <section>
      <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <h1 className="sr-only">{content.screenReaderTitle}</h1>
        <div className="relative aspect-[2/1] overflow-hidden bg-[#f5eadc] sm:aspect-[16/7] lg:aspect-[5/2] xl:max-h-[590px]">
          {slides.map((slide, index) => (
            <img
              key={slide.url}
              src={slide.url}
              alt={slide.alt}
              className={`absolute inset-0 block h-full w-full object-cover object-center transition-opacity duration-700 ease-out motion-reduce:transition-none ${
                index === activeSlideIndex ? 'opacity-100' : 'opacity-0'
              } ${
                index === 0 ? 'motion-reduce:opacity-100' : 'motion-reduce:opacity-0'
              }`}
              loading="eager"
              decoding="async"
            />
          ))}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
            <div className="mx-auto flex max-w-[90rem] justify-end px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
                <Button
                  nativeButton={false}
                  render={
                    <a
                      href={content.primaryCta.url}
                      className="inline-flex h-9 items-center justify-center bg-[var(--color-primary)] px-3 text-xs font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99] sm:h-10 sm:px-5 sm:text-sm"
                    />
                  }
                >
                  {content.primaryCta.label}
                </Button>
                <StyleFinder
                  triggerLabel={content.styleFinderLabel}
                  triggerClassName="inline-flex h-9 items-center justify-center gap-2 border border-[var(--color-line)] bg-[var(--color-paper)] px-3 text-xs font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99] sm:h-10 sm:px-5 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
