import JSZip from 'jszip'

class BrowserResolver {
  resourcesByCanonical: Record<string, fhir4.FhirResource> = {}
  resourcesByReference: Record<string, fhir4.FhirResource> = {}
  cqlByReference: Record<string, string> = {}
  pathway: fhir4.PlanDefinition | undefined

  constructor(storedContent?: string | undefined) {
    let parsedContent
    if (storedContent) {
      parsedContent = JSON.parse(storedContent)
      const { resourcesByCanonical, resourcesByReference, pathway } =
        parsedContent
      this.resourcesByCanonical = resourcesByCanonical
      this.resourcesByReference = resourcesByReference
      this.pathway = pathway
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
            this.resourcesByReference[
              `${rawResource.resourceType}/${rawResource.id}`
            ] = rawResource
          }
          // if (
          //   rawResource.meta?.profile?.includes(
          //     'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-pathwaydefinition'
          //   )
          // ) {
          //   this.pathway = rawResource
          // }
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

  public async resolveCanonical(canonical: string | undefined) {
    canonical = canonical?.split('|').shift()
    return canonical != null ? this.resourcesByCanonical[canonical] : undefined
  }
}

export default BrowserResolver
