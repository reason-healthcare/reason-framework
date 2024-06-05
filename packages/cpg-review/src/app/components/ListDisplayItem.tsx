interface ListDisplayProps {
  header: string
  content: JSX.Element[] | undefined
}

const ListDisplayItem = ({ header, content }: ListDisplayProps) => {
  if (content) {
    return (
      <div>
        <p className="details-description">{header}:</p>
        <ul>{content}</ul>
      </div>
    )
  }
  return <></>
}

export default ListDisplayItem
