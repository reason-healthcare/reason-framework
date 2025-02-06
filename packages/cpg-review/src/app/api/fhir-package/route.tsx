'use server'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const response = await fetch(req.nextUrl.searchParams.get('url') || '')
    if (!response.ok) {
      throw new Error('Problem fetching resource')
    }
    const buffer = await response.arrayBuffer()
    // Validate as gzip file
    const view = new DataView(buffer)
    if (view.getUint16(0, false) !== 0x1f8b) {
      throw new Error('Endpoint is not a valid package')
    }
    return new NextResponse(buffer)
  } catch (error) {
    const message = `Problem fetching FHIR package: ${error}`
    console.error(message)
    return NextResponse.json({ message }, { status: 500 })
  }
}
