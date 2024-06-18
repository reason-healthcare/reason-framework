import { isMarkdown } from '../helpers'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface SingleDisplayProps {
  header: string
  content: string | JSX.Element | undefined
}

const SingleDisplayItem = ({ header, content }: SingleDisplayProps) => {
  const meta = [
    'id',
    'version',
    'url',
    'publisher',
    'version',
    'title',
    'name',
    'status',
    'date',
    'resourceType',
  ]
  if (content && !meta.includes(header)) {
    const headerDisplay = header.charAt(0).toUpperCase() + header.slice(1)
    return (
      <div className="single-item">
        <span className="details-description">{headerDisplay}</span>
        <span>
          :{' '}
          {typeof content === 'string' && isMarkdown(content) ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          ) : (
            content
          )}
        </span>
      </div>
    )
  }
  return <></>
}

export default SingleDisplayItem
