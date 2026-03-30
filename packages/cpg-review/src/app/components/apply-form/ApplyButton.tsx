import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

interface ApplyButtonProps {
  isApplying: boolean
  label: string
  type?: 'submit' | 'button'
  onClick?: () => void
  style?: React.CSSProperties
}

/**
 * Primary action button shared across apply-form steps.
 * Renders a spinner with "Applying" while `isApplying` is true,
 * and the provided `label` otherwise.
 */
const ApplyButton = ({
  isApplying,
  label,
  type = 'button',
  onClick,
  style,
}: ApplyButtonProps) => (
  <button
    type={type}
    className="button"
    onClick={onClick}
    disabled={isApplying}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.6rem',
      ...style,
    }}
  >
    {isApplying ? (
      <>
        Applying
        <Spin
          style={{ color: '#fff' }}
          indicator={<LoadingOutlined spin />}
          size="small"
        />
      </>
    ) : (
      label
    )}
  </button>
)

export default ApplyButton
