import { FhirResource } from "fhir/r2"
import { resolveCanonical } from "helpers"
import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import BrowserResolver from "resolver/browser"
import FileResolver from "resolver/file"

interface InputDetailsProps {
  resolver: FileResolver | BrowserResolver | undefined
}

const InputDetails = ({resolver}: InputDetailsProps) => {
  const [resource, setResource] = useState<fhir4.FhirResource | undefined>()
  let canonical = useLocation().pathname

  // useEffect(() => {
  //   if (resolver) {
  //     // const result = resolveCanonical(canonical, resolver)
  //     // setResource(result)
  //     // console.log('here')
  //     // console.log(result)
  //     console.log(canonical)
  //   }
  // }, [])



  let navigate = useNavigate()
  const url = useLocation().pathname
  return(
    <>
      <h1>{resource?.id}</h1>
      {(url !== "/") && (
        <button onClick={(e) => {
          e.preventDefault()
          navigate(-1)
        }}>Back</button>
      )}
    </>
  )
}

export default InputDetails