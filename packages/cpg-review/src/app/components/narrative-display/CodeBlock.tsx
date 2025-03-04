import hljs from 'highlight.js'
import { FC, useEffect, useRef } from 'react'
import '@/styles/narrativeDisplay.css'

interface CodeBlock {
  code: string
}

const CodeBlock: FC<CodeBlock> = ({ code }) => {
  const codeRef = useRef(null)

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current)
    }
  }, [code])

  return (
    <div className="code-container">
      <pre style={{ whiteSpace: 'break-spaces', wordBreak: 'break-word' }}>
        <code ref={codeRef}>{code}</code>
      </pre>
    </div>
  )
}

export default CodeBlock
