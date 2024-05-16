import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import 'reactflow/dist/style.css'
import './styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CPG Preview - Reason Healthcare',
  description: 'Preview of FHIR Clinical Practice Guidelines',
  icons: {
    icon: 'favicon/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
