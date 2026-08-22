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
      <div className="border-b border-[var(--color-line)] bg-[var(--color-primary)]">
        <h1 className="sr-only">{content.screenReaderTitle}</h1>
        <div className="relative min-h-[520px] overflow-hidden bg-[var(--color-primary)] sm:min-h-[560px] lg:min-h-[640px] xl:max-h-[680px]">
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

          <div className="absolute inset-0 bg-gradient-to-r from-[#053f31]/92 via-[#053f31]/58 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent" />

          <div className="relative z-10 flex min-h-[520px] items-end sm:min-h-[560px] lg:min-h-[640px]">
            <div className="mx-auto w-full max-w-[90rem] px-4 pb-8 pt-14 sm:px-6 sm:pb-12 lg:px-8 lg:pb-16">
              <div className="max-w-2xl text-[#fffaf0]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f7df9a] sm:text-sm">
                  {content.eyebrow}
                </p>
                <p className="mt-4 max-w-xl font-serif text-5xl font-normal leading-[0.95] text-[#fffaf0] sm:text-6xl lg:text-7xl">
                  {content.headline}
                </p>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-[#f7df9a] sm:text-base">
                  {content.tagline}
                </p>
                <p className="mt-4 max-w-lg text-base leading-7 text-[#fff6de] sm:text-lg">
                  {content.copy}
                </p>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  nativeButton={false}
                  render={
                    <a
                      href={content.primaryCta.url}
                      className="inline-flex h-11 items-center justify-center border border-[#f7df9a] bg-[#c29a3d] px-5 text-sm font-semibold text-[#053f31] transition duration-150 ease-out hover:bg-[#f7df9a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7df9a] focus-visible:ring-offset-2 active:scale-[0.99]"
                    />
                  }
                >
                  {content.primaryCta.label}
                </Button>
                <StyleFinder
                  triggerLabel={content.styleFinderLabel}
                  triggerClassName="inline-flex h-11 items-center justify-center gap-2 border border-[#f7df9a] bg-[#fffaf0] px-5 text-sm font-semibold text-[#053f31] transition duration-150 ease-out hover:bg-[#f7df9a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f7df9a] focus-visible:ring-offset-2 active:scale-[0.99]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
