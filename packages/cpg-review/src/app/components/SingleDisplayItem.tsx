interface SingleDisplayProps {
  header: string
  content: string | JSX.Element | undefined
}

const SingleDisplayItem = ({ header, content }: SingleDisplayProps) => {
  if (content) {
    return (
      <div className="single-item">
        <span className="details-description">{header}</span>
        <span>: {content}</span>
      </div>
    )
  }
  return <></>
}

export default SingleDisplayItem
