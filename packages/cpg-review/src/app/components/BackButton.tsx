import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftOutlined } from '@ant-design/icons'

const BackButton = () => {
  let navigate = useNavigate()
  const url = useLocation().pathname
  if (url !== '/') {
    return (
      <ArrowLeftOutlined
        onClick={(e) => {
          e.preventDefault()
          navigate(-2)
        }}
      />
    )
  }
  return <div></div>
}

export default BackButton
