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
  manifest: '/favicon/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      {
        url: '/favicon/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/favicon/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/favicon/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
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
