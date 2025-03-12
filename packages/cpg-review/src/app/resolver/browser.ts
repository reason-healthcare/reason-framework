import { RcFile } from 'antd/es/upload'
import tarStream, { type Headers } from 'tar-stream'
import pako from 'pako'

class BrowserResolver {
  resourcesByCanonical: Record<string, fhir4.FhirResource> = {}
  resourcesByReference: Record<string, fhir4.FhirResource> = {}

  constructor(content?: string | undefined) {
    if (content) {
      const parsedContent = JSON.parse(content)
      const { resourcesByCanonical, resourcesByReference } = parsedContent
      this.resourcesByCanonical = resourcesByCanonical
      this.resourcesByReference = resourcesByReference
    }
  }

  public async decompress(rawData: RcFile | Blob) {
    try {
      const arrayBuffer = await rawData.arrayBuffer()
      const decompressedData = pako.ungzip(arrayBuffer)
      const extract = tarStream.extract()
      extract.on(
        'entry',
        (header: Headers, stream: NodeJS.ReadableStream, next: () => void) => {
          let fileContent: string

          stream.on('data', (chunk) => {
            fileContent = new TextDecoder().decode(chunk)
          })

          stream.on('end', () => {
            if (fileContent && header.name.endsWith('json')) {
              const rawResource = JSON.parse(fileContent)
              if (rawResource.url != null) {
                this.resourcesByCanonical[rawResource.url] = rawResource
              }
              if (rawResource.id != null && rawResource.resourceType != null) {
                this.resourcesByReference[
                  `${rawResource.resourceType}/${rawResource.id}`
                ] = rawResource
              }
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

  public addResourcesFromBundle(bundle: fhir4.Bundle) {
    bundle.entry?.forEach((entry) => {
      if (entry.resource != null) {
        const resource = entry.resource
        if ('url' in resource && resource.url != null) {
          this.resourcesByCanonical[resource.url] = resource
        }
        if (resource.id != null && resource.resourceType != null) {
          this.resourcesByReference[`${resource.resourceType}/${resource.id}`] =
            resource
        }
      }
    })
    return this
  }

  public resolveCanonical(canonical: string | undefined) {
    canonical = canonical?.split('|').shift()
    return canonical != null ? this.resourcesByCanonical[canonical] : undefined
  }

  public resolveReference(reference: string | undefined) {
    return reference != null ? this.resourcesByReference[reference] : undefined
  }
}

export default BrowserResolver
