import hljs from 'highlight.js'
import { FC, useEffect, useRef } from 'react'
import '@/styles/NarrativeDisplay.css'

interface CodeDisplay {
  cql: string
}

const CodeDisplay: FC<CodeDisplay> = ({ cql }) => {
  const codeRef = useRef(null)

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current)
    }
  }, [cql])

  return (
    <div className="cql-container">
      <pre style={{ whiteSpace: 'break-spaces', wordBreak: 'break-word' }}>
        <code ref={codeRef}>{cql}</code>
      </pre>
    </div>
  )
}

export default CodeDisplay
