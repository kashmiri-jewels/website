export type SanityImage = {
  alt?: string
  url?: string
}

export function getSanityImageUrl(
  image: SanityImage | null | undefined,
  _options: { height?: number; width: number },
) {
  return image?.url
}
