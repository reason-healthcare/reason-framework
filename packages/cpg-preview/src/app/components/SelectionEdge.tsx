import {
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  EdgeProps,
  EdgeText
} from 'reactflow'

interface SelectionEdgeProps {
  data: {
    x: number,
    y: number,
    text: string,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
  }
}

const SelectionEdge = ({ data }: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, text, x, y } = data
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath}/>
      {/* <EdgeText
      x={x}
      y={y}
      label={text}
      labelStyle={{ fill: 'white' }}
      labelShowBg
      labelBgStyle={{ fill: 'red' }}
      labelBgPadding={[2, 4]}
      labelBgBorderRadius={2}
    /> */}
      <EdgeLabelRenderer>{text}</EdgeLabelRenderer>
    </>
  )
}

export default SelectionEdge
