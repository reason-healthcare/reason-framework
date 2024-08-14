import { RcFile } from 'antd/es/upload'
import tarStream, { type Headers } from 'tar-stream'
import pako from 'pako'

class BrowserResolver {
  resourcesByCanonical: Record<string, fhir4.FhirResource> = {}
  resourcesByReference: Record<string, fhir4.FhirResource> = {}
  cqlById: Record<string, string> = {}

  constructor(content?: string | undefined) {
    if (content) {
      const parsedContent = JSON.parse(content)
      const { resourcesByCanonical, resourcesByReference } = parsedContent
      this.resourcesByCanonical = resourcesByCanonical
      this.resourcesByReference = resourcesByReference
    }
  }

  public async decompress(rawData: RcFile) {
    try {
      const arrayBuffer = await rawData.arrayBuffer()
      const decompressedData = pako.ungzip(new Uint8Array(arrayBuffer))
      const extract = tarStream.extract()
      extract.on(
        'entry',
        (header: Headers, stream: NodeJS.ReadableStream, next: () => void) => {
          let fileContent = ''

          stream.on('data', (chunk) => {
            fileContent += new TextDecoder().decode(chunk)
          })

          stream.on('end', () => {
            if (fileContent && header.name.endsWith('json')) {
              const rawResource = JSON.parse(fileContent)
              if (rawResource.url != null) {
                this.resourcesByCanonical[rawResource.url] = rawResource
              }
              if (rawResource.id != null && rawResource.resourceType != null) {
                const reference = `${rawResource.resourceType}/${rawResource.id}`
                this.resourcesByReference[
                  `${rawResource.resourceType}/${rawResource.id}`
                ] = rawResource
              }
            } else if (fileContent && header.name.endsWith('cql')) {
              const reference = header.name
                .split('/')
                .slice(1)
                .join('/')
                .replace('.cql', '')
              const id = reference.split('-').slice(1).join('-')
              this.cqlById[id] = fileContent
            }
            next()
          })
          stream.resume()
        }
      )

      await new Promise<void>((resolve, reject) => {
        extract.on('finish', resolve)
        extract.on('error', reject)
        extract.end(decompressedData)
      })
      return this
    } catch (error) {
      console.error('Error processing the .tgz file:', error)
    }
  }

  public resolveCanonical(canonical: string | undefined) {
    canonical = canonical?.split('|').shift()
    return canonical != null ? this.resourcesByCanonical[canonical] : undefined
  }

  public resolveReference(reference: string | undefined) {
    return reference != null ? this.resourcesByReference[reference] : undefined
  }

  public resolveCql(id: string | undefined) {
    return id != null ? this.cqlById[id] : undefined
  }
}

export default BrowserResolver
