import "./globals.css"

export const metadata = {
  title: 'KORDEX AI — by Bharath Thommandru',
  description: 'World-class autonomous coding and reasoning agent built by Bharath Thommandru',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" defer></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
