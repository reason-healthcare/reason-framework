import glob from 'fast-glob'
import JSZip from 'jszip'

class BrowserResolver {
  resourcesByCanonical: Record<string, fhir4.FhirResource> = {}
  localFile: string
  pathway: fhir4.PlanDefinition | undefined

  constructor(localFile: string, pathway?: fhir4.PlanDefinition) {
    this.localFile = localFile
  }

  public async handleProcessZip() {
    const zip = new JSZip()
    try {
      const zipFile = await zip.loadAsync(this.localFile.split(',')[1], {
        base64: true,
      })
      const files = Object.keys(zipFile.files)
      for (const filename of files) {
        const fileContent = await zipFile.file(filename)?.async('string')
        if (fileContent) {
          try {
            const rawResource = JSON.parse(fileContent)
            if (rawResource.url != null && rawResource.resourceType != null) {
              this.resourcesByCanonical[rawResource.url] = rawResource
            }
            if (rawResource.meta.profile.includes('http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-pathwaydefinition')) {
              this.pathway = rawResource
            }
          } catch (error) {
            console.warn(`problem with ${filename}`)
          }
        }
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
