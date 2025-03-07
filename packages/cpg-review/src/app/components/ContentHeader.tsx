import { formatTitle } from 'helpers'
import { UserOutlined, CloseOutlined } from '@ant-design/icons'
import { SidePanelView } from 'page'

interface ContentHeaderProps {
  planDefinition: fhir4.PlanDefinition | undefined
  requestsBundle: fhir4.Bundle | undefined
  contextReference: string | undefined
  setSidePanelView: React.Dispatch<React.SetStateAction<SidePanelView>>
  setRequestsBundle: React.Dispatch<
    React.SetStateAction<fhir4.Bundle | undefined>
  >
}

const ContentHeader = ({
  planDefinition,
  requestsBundle,
  contextReference,
  setSidePanelView,
  setRequestsBundle,
}: ContentHeaderProps) => {
  const handleApply = () => {
    setSidePanelView('apply')
  }
  const handleContextReset = () => {
    setRequestsBundle(undefined)
  }
  return (
    <div className="plan-header">
      <div className="plan-title">
        {planDefinition != null && (
          <h1>
            {formatTitle(planDefinition)}
            {requestsBundle != null && (
              <span className="applied-guidance">{' - Applied Guidance'}</span>
            )}
          </h1>
        )}
      </div>
      {requestsBundle != null && contextReference != null ? (
        <div className="context">
          <div className="context-tag">
            <UserOutlined style={{ fontSize: '14px' }} />
            {contextReference}
            <button
              type="button"
              className="close-button"
              onClick={handleContextReset}
            >
              <CloseOutlined style={{ fontSize: '12px', marginTop: '1px' }} />
            </button>
          </div>
          <button type="button" className="button-simple" onClick={handleApply}>
            Edit
          </button>
        </div>
      ) : (
        <button type="button" className="button-simple" onClick={handleApply}>
          Add Context
        </button>
      )}
    </div>
  )
}

export default ContentHeader
