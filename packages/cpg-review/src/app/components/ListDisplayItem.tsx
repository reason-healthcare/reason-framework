interface ListDisplayProps {
  content: JSX.Element[] | undefined
  heading?: string | undefined
}

const ListDisplayItem = ({ content, heading }: ListDisplayProps) => {
  if (content) {
    return (
      <div>
        {heading != null && (
          <>
            <span className="details-description">{heading}</span>
            <span>:</span>
          </>
        )}
        <ul>{content}</ul>
      </div>
    )
  }
  return <></>
}

export default ListDisplayItem
