import "./globals.css"

export const metadata = {
  title: 'Next-Gen AI Platform',
  description: 'Built with ShaderBackground',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
