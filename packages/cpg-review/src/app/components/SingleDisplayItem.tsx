interface SingleDisplayProps {
  content: string | JSX.Element | undefined
  heading?: string | undefined
}

const SingleDisplayItem = ({ content, heading }: SingleDisplayProps) => {
  if (content) {
    return (
      <div className="single-item">
        {heading != null && (
          <>
            <span className="details-description">{heading}</span>
            <span>: </span>
          </>
        )}
        {/* <br></br> */}
        <span>{content}</span>
      </div>
    )
  }
  return <></>
}

export default SingleDisplayItem
