import { LeftOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'

const BackButton = () => {
  let navigate = useNavigate()
  const url = useLocation().pathname
  if (url !== '/') {
    return (
      <button
        className="back-button"
        onClick={(e) => {
          e.preventDefault()
          navigate(-2)
        }}
      >
        {'<< Back'}
      </button>
    )
  }
  return <></>
}

export default BackButton
