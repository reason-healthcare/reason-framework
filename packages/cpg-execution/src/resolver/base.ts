import { ValueSet } from 'cql-execution'
import Cache from '../cache'

export class BaseResolver {
  endpoint: fhir4.Endpoint

  constructor(endpoint: fhir4.Endpoint) {
    this.endpoint = endpoint
  }
  /**
   * Find valuesets by oid/url
   *
   * NOTE: This should call findValueSets and is here for backward compatiability
   * with cql-execution.
   *
   * @param oid Valueset URL or OID
   * @returns
   */
  public findValueSetsByOid(oid: string) {
    return this.findValueSets(oid)
  }

  public findValueSets(oid: string, version?: string | undefined) {
    const valuesetsByVersion = Cache.getKey(oid)
    if (version != null) {
      return [valuesetsByVersion[version] as ValueSet]
    }
    return Object.values(valuesetsByVersion) as ValueSet[]
  }

  /**
   * Return single valueset, if no version best guess of more recent
   *
   * @param oid ValueSet URL or OID
   * @param version Version of ValueSet
   * @returns ValueSet
   */
  public findValueSet(oid: string, version?: string) {
    const valueSets = this.findValueSets(oid, version)
    if (valueSets.length === 0) {
      return
    } else if (valueSets.length === 1) {
      return valueSets[0]
    } else {
      return valueSets.reduce((a, b) => {
        if (a.version != null && b.version != null) {
          if (a.version > b.version) {
            return a
          } else {
            return b
          }
        } else if (a.version != null) {
          return a
        } else if (b.version != null) {
          return b
        } else {
          return a // in this case, the first one?
        }
      })
    }
  }
}

export default BaseResolver
