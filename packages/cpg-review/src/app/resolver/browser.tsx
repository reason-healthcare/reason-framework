import JSZip from 'jszip'

class BrowserResolver {
  resourcesByCanonical: Record<string, fhir4.FhirResource> = {}
  resourcesByReference: Record<string, fhir4.FhirResource> = {}
  cqlByReference: Record<string, string> = {}
  pathway: fhir4.PlanDefinition | undefined
  baseUrl: string | undefined

  constructor(storedContent?: string | undefined) {
    let parsedContent
    if (storedContent) {
      parsedContent = JSON.parse(storedContent)
      const { resourcesByCanonical, resourcesByReference } =
        parsedContent
      this.resourcesByCanonical = resourcesByCanonical
      this.resourcesByReference = resourcesByReference
    }
  }

  public async handleProcessZip(rawData: string) {
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
          if (rawResource.url != null && rawResource.resourceType != null) {
            this.resourcesByCanonical[rawResource.url] = rawResource
          }
          if (rawResource.id && rawResource.resourceType) {
            const reference = `${rawResource.resourceType}/${rawResource.id}`
            this.resourcesByReference[
              `${rawResource.resourceType}/${rawResource.id}`
            ] = rawResource
            if (rawResource.resourceType === 'ImplementationGuide' && rawResource.url) {
              this.baseUrl = rawResource.url.replace(`/${reference}`, '')
            }
          }
        } else if (fileContent && filename.endsWith('cql')) {
          const id = filename.split('.')[0].split('-')
          const type = id.shift()
          const reference = `${type}/${id}`.replace('output/', '')
          this.cqlByReference[reference] = fileContent
        }
        // else if (fileContent && filename.endsWith('html') && filename.split('.').length == 2) {
        //   const resourceType = filename.split("/").pop()?.split("-")[0]
        //   const id = filename.split("/").pop()?.split("-")[1]?.split('.')[0]
        //   if (this.resourcesByReference[`${resourceType}/${id}`]) {
        //     this.resourcesByReference[`${resourceType}/${id}`] = {
        //       ...this.resourcesByReference[`${resourceType}/${id}`], html: fileContent
        //     }
        //   }
        // }
      }
    } catch (error) {
      console.error('Error reading ZIP file:', error)
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

  public resolveCql(reference: string | undefined) {
    return reference != null ? this.cqlByReference[reference] : undefined
  }
}

export default BrowserResolver
