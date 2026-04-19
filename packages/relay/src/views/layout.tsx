import { PUBLIC_BASE_URL } from '@/agent-meta/routes'
import { sharedStyles } from './shared-styles'

interface LayoutProps {
  title: string
  description?: string
  themeColor?: string
  extraStyles?: string
  path?: string
  children?: string | string[]
}

const OG_IMAGE_URL = `${PUBLIC_BASE_URL}/og-image.png`

export const Layout = ({
  title,
  description,
  themeColor = '#1d35cf',
  extraStyles,
  path = '/',
  children,
}: LayoutProps) => {
  const canonicalUrl = `${PUBLIC_BASE_URL}${path}`
  return (
    <>
      {'<!doctype html>'}
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="theme-color" content={themeColor} />
          <title>{title}</title>
          {description && <meta name="description" content={description} />}
          <link rel="canonical" href={canonicalUrl} />

          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="402md Facilitator" />
          <meta property="og:title" content={title} />
          {description && <meta property="og:description" content={description} />}
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:image" content={OG_IMAGE_URL} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta
            property="og:image:alt"
            content="402md Facilitator — Any chain in, your chain out."
          />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          {description && <meta name="twitter:description" content={description} />}
          <meta name="twitter:image" content={OG_IMAGE_URL} />

          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Red+Hat+Text:wght@300..700&family=JetBrains+Mono:wght@400;500&display=swap"
          />
          <style>{sharedStyles}</style>
          {extraStyles && <style>{extraStyles}</style>}
        </head>
        <body>{children}</body>
      </html>
    </>
  )
}
