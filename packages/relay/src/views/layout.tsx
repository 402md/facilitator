import { sharedStyles } from './shared-styles'

interface LayoutProps {
  title: string
  description?: string
  themeColor?: string
  extraStyles?: string
  children?: string | string[]
}

export const Layout = ({
  title,
  description,
  themeColor = '#2a5cdb',
  extraStyles,
  children,
}: LayoutProps) => (
  <>
    {'<!doctype html>'}
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content={themeColor} />
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
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
