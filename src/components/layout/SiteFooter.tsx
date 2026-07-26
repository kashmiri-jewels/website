import { Link } from '@tanstack/react-router'
import { RefreshCcw, ShieldCheck, ShoppingBag, Truck, type LucideIcon } from 'lucide-react'

import { getSiteSettingsContent, type SiteSettingsContent } from '../../lib/storefront-content'
import { RazorpayLogo } from '../payment/RazorpayLogo'

const socialIconPaths: Record<string, string> = {
  x:
    'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  twitter:
    'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  instagram:
    'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  facebook:
    'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  pinterest:
    'M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z',
  youtube:
    'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.016 3.016 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814M9.545 15.568V8.432L15.818 12z',
}

const benefitIcons: Record<SiteSettingsContent['benefits'][number]['icon'], LucideIcon> = {
  bag: ShoppingBag,
  returns: RefreshCcw,
  shield: ShieldCheck,
  truck: Truck,
}

export function SiteFooter() {
  const settings = getSiteSettingsContent()

  return (
    <footer className="border-t border-[var(--color-line)] bg-[var(--color-paper)] px-4 pb-28 pt-10 sm:px-6 sm:pb-10 lg:px-8">
      <div className="mx-auto grid max-w-[90rem] gap-10">
        <div className="py-5 md:py-8">
          <div>
            <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
              {settings.footerEyebrow}
            </p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-normal leading-none text-[var(--color-ink)] sm:text-5xl">
              {settings.footerHeadline}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--color-muted)] sm:text-base">
              {settings.footerDescription}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-8 border-t border-[var(--color-line)] pt-8 text-sm text-[var(--color-muted)] md:flex-row">
          <div>
            <Link
              to="/"
              aria-label="Kashmiri Jewels home"
              className="inline-flex transition duration-150 ease-out hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            >
            <img
                src="/assets/brand/kashmiri-jewels-logo.webp"
                alt="Kashmiri Jewels"
                className="h-14 w-auto"
              />
            </Link>
            <p className="mt-3 max-w-sm leading-6">
              {settings.footerShortCopy}
            </p>
            <RazorpayBadge />
            <SocialLinks links={settings.socialLinks} />
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {settings.footerSections.map((section) => (
              <div key={section.title}>
                <h2 className="mb-3 text-sm font-medium text-[var(--color-ink)]">{section.title}</h2>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={`${section.title}-${link.label}`}>
                      <a
                        href={link.url}
                        className="transition duration-150 ease-out hover:text-[var(--color-primary)]"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 border-t border-[var(--color-line)] py-7 sm:grid-cols-2 lg:grid-cols-4">
          {settings.benefits.map(({ icon, title, copy }) => {
            const Icon = benefitIcons[icon]

            return (
            <div key={title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-primary)]">
                <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-medium text-[var(--color-ink)]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{copy}</p>
              </div>
            </div>
            )
          })}
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-[var(--color-line)] pt-6 text-xs text-[var(--color-muted)] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} {settings.copyrightLine}</p>
          <p>{settings.bottomNote}</p>
        </div>
      </div>
    </footer>
  )
}

function RazorpayBadge() {
  return (
    <div className="mt-5 inline-flex items-center gap-2 border border-[var(--color-line)] bg-[var(--color-surface-soft)] px-3 py-2 text-xs font-medium text-[var(--color-ink)]">
      <span>Secure checkout powered by</span>
      <span className="h-4 w-px bg-[var(--color-line)]" aria-hidden="true" />
      <RazorpayLogo className="h-4 w-auto" />
    </div>
  )
}

function SocialLinks({ links }: { links: SiteSettingsContent['socialLinks'] }) {
  return (
    <div className="mt-5">
      <h2 className="text-sm font-medium text-[var(--color-ink)]">Follow</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => {
          const iconPath = socialIconPaths[link.label.toLowerCase()]

          return (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Kashmiri Jewels on ${link.label}`}
            className="inline-flex size-10 items-center justify-center border border-[var(--color-line)] bg-[var(--color-paper)] text-xs font-semibold text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4 fill-current"
              aria-hidden="true"
              focusable="false"
            >
              {iconPath ? (
                <path d={iconPath} />
              ) : (
                <text x="12" y="16" textAnchor="middle" className="fill-current text-[10px]">
                  {link.label.charAt(0).toUpperCase()}
                </text>
              )}
            </svg>
          </a>
          )
        })}
      </div>
    </div>
  )
}
