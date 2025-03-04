interface SingleDisplayProps {
  content: string | JSX.Element | undefined
  heading?: string | undefined
}

const SingleDisplayItem = ({ content, heading }: SingleDisplayProps) => {
  if (content != null) {
    return (
      <div className="single-item">
        {heading != null && (
          <>
            <span className="narrative-description">{heading}</span>
            <span>: </span>
          </>
        )}
        <span>{content}</span>
      </div>
    )
  }
  return <></>
}

export default SingleDisplayItem
