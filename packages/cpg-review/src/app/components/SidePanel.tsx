import { Panel, PanelResizeHandle } from 'react-resizable-panels'
import { CloseOutlined } from '@ant-design/icons'
import { SidePanelView } from 'page'

interface SidePanelProps {
  children: React.ReactNode
  setSidePanelView: React.Dispatch<React.SetStateAction<SidePanelView>>
  navigation?: JSX.Element
}

const SidePanel = ({
  children,
  setSidePanelView,
  navigation,
}: SidePanelProps) => {
  const handleClose = () => {
    setSidePanelView(undefined)
  }

  return (
    <>
      <PanelResizeHandle className="panel-separator" />
      <Panel style={{ minWidth: '35%' }}>
        <div className="side-panel-content">
          <div className="buttons-container">
            {navigation ?? <div />}
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
