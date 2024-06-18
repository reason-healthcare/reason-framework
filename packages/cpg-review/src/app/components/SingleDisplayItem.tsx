import { formatMarkdown, isMarkdown } from '../helpers'

interface SingleDisplayProps {
  content: string | JSX.Element | undefined
  header?: string | undefined
}

const SingleDisplayItem = ({ content, header }: SingleDisplayProps) => {
  if (content) {
    return (
      <div className="single-item">
        {header != null && <span className="details-description">{header}:</span>}
        <span>
          {' '}
          {typeof content === 'string' && isMarkdown(content) ? (
            formatMarkdown(content)
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
