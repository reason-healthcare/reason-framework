import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import localFont from 'next/font/local'
import 'reactflow/dist/style.css'
import './styles/globals.css'

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
})

const roobert = localFont({
  src: [
    {
      path: './fonts/roobert-regular.woff',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/roobert-medium.woff',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/roobert-semibold.woff',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-roobert',
})

export const metadata: Metadata = {
  title: 'CPG Review - Reason Healthcare',
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
      <body className={`${roobert.variable} ${roboto.variable}`}>
        {children}
      </body>
    </html>
  )
}
