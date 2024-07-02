interface ListDisplayProps {
  content: JSX.Element[] | undefined
  header?: string | undefined
}

const ListDisplayItem = ({ content, header }: ListDisplayProps) => {
  if (content) {
    return (
      <div>
        {header != null && <p className="details-description">{header}:</p>}
        <ul>{content}</ul>
      </div>
    )
  }
  return <></>
}

export default ListDisplayItem
