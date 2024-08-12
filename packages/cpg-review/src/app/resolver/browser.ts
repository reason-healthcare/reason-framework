import JSZip from 'jszip'

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

  public async decompress(rawData: string) {
    const zip = new JSZip()
    try {
      const zipFile = await zip.loadAsync(rawData.split(',')[1], {
        base64: true,
      })
      const files = Object.keys(zipFile.files)
      for (const filename of files) {
        const fileContent = await zipFile.file(filename)?.async('string')
        if (fileContent && filename.endsWith('json')) {
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
        } else if (fileContent && filename.endsWith('cql')) {
          const reference = filename
            .split('/')
            .slice(1)
            .join('/')
            .replace('.cql', '')
          const id = reference.split('-').slice(1).join('-')
          this.cqlById[id] = fileContent
        }
      }
    } catch (error) {
      console.error('Error reading ZIP file:', error)
      return new Error(`${error}`)
    }
    return this
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
