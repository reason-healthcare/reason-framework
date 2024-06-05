interface ListDisplayProps {
  header: string
  content: JSX.Element[] | undefined
}

const ListDisplayItem = ({ header, content }: ListDisplayProps) => {
  return (
    <div>
      <p className="details-description">{header}:</p>
      <ul>{content}</ul>
    </div>
  )
}

export default ListDisplayItem
