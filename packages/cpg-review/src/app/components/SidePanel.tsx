import { Panel, PanelResizeHandle } from 'react-resizable-panels'
import BackButton from './BackButton'
import { CloseOutlined } from '@ant-design/icons'

interface SidePanelProps {
  children: React.ReactNode
  setShowSidePanel: React.Dispatch<React.SetStateAction<boolean>>
  navigation?: JSX.Element
}

const SidePanel = ({
  children,
  setShowSidePanel,
  navigation,
}: SidePanelProps) => {
  const handleClose = () => {
    setShowSidePanel(false)
  }
  return (
    <>
      <PanelResizeHandle className="panel-separator" />
      <Panel minSize={25}>
        <div className="side-panel-content">
          <div className="buttons-container">
            {navigation ? <BackButton /> : <div />}
            <CloseOutlined onClick={handleClose} />
          </div>
          <div className="narrative-container-outer">
            <div className="narrative-container-inner">{children}</div>
          </div>
        </div>
      </Panel>
    </>
  )
}

export default SidePanel
