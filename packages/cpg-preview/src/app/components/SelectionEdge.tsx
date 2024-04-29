import {
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  EdgeProps,
} from 'reactflow'

const CustomEdge = ({ data }: EdgeProps) => {
  const { id, sourceX, sourceY, targetX, targetY, label } = data
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} labelX={sourceX} labelY={sourceY} />
      <EdgeLabelRenderer>{label}</EdgeLabelRenderer>
    </>
  )
}

export default CustomEdge
