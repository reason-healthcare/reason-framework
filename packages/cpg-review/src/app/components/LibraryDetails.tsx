import { FhirResource } from 'fhir/r2'
import {
  formatRelatedArtifact,
  is,
  notEmpty,
  resolveCanonical,
  resolveCql,
  resolveReference,
} from 'helpers'
import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import BrowserResolver from 'resolver/browser'
import FileResolver from 'resolver/file'
import SingleDisplayItem from './SingleDisplayItem'
import hljs from 'highlight.js'
import { ArrowLeftOutlined } from '@ant-design/icons'
import BackButton from './BackButton'
import { format } from 'path'
import ListDisplayItem from './ListDisplayItem'

interface LibraryDetailsProps {
  resolver: FileResolver | BrowserResolver | undefined
}

const LibraryDetails = ({ resolver }: LibraryDetailsProps) => {
  const [resource, setResource] = useState<fhir4.Library | undefined>()
  const [cql, setCql] = useState<string | undefined>()
  const codeRef = useRef(null)

  // Get pathname and format as resource reference
  const path = useLocation().pathname.split('')
  path.shift()
  const reference = path.join('')

  useEffect(() => {
    if (resolver instanceof BrowserResolver) {
      const result = resolveReference(reference, resolver)
      if (is.Library(result)) {
        setResource(result)
        setCql(resolveCql(reference, resolver))
        if (codeRef.current) {
          hljs.highlightBlock(codeRef.current)
        }
      }
    }
  }, [])

  let navigate = useNavigate()

  if (resource) {
    const { description, relatedArtifact } = resource

    return (
      <>
        <h2>{resource.title ?? resource.name ?? resource.id}</h2>
        <SingleDisplayItem content={description} header="Description" />
        {/* {relatedArtifact && <ListDisplayItem content={formatRelatedArtifact(relatedArtifact, resolver, navigate)} header="Related Artifacts" />} */}
        {cql && (
          <div className="cql-container">
            <pre
              style={{ whiteSpace: 'break-spaces', wordBreak: 'break-word' }}
            >
              <code>{cql}</code>
            </pre>
          </div>
        )}
        <BackButton />
      </>
    )
  }

  return (
    <>
      <p>Unable to load details</p>
      <BackButton />
    </>
  )
}

export default LibraryDetails
