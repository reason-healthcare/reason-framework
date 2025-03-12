import '@/styles/narrativeDisplay.css'
import { Form, Input, message, Radio, Select } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { ApplyPayload } from 'api/apply/route'
import { is } from 'helpers'
import { ChangeEvent, ChangeEventHandler, useState } from 'react'

interface ApplyFormProps {
  planDefinition: fhir4.PlanDefinition
  contentEndpoint: string | undefined
  setShowApplyForm: React.Dispatch<React.SetStateAction<boolean>>
  setApplyBundle: React.Dispatch<React.SetStateAction<fhir4.Bundle | undefined>>
}

const ApplyForm = ({
  planDefinition,
  contentEndpoint,
  setShowApplyForm,
  setApplyBundle,
}: ApplyFormProps) => {
  const [dataPayload, setDataPayload] = useState<string | undefined>()
  const [subjectPayload, setSubjectPayload] = useState<string | undefined>()
  const [contentEndpointPayload, setContentEndpointPayload] = useState<
    string | undefined
  >()
  const [txEndpointPayload, setTxEndpointPayload] = useState<
    string | undefined
  >()

  const resetForm = () => {
    setDataPayload(undefined)
    setSubjectPayload(undefined)
    setContentEndpointPayload(undefined)
    setTxEndpointPayload(undefined)
    form.resetFields()
  }

  const isValidEndpointFormat = (endpoint: string) => {
    return (
      endpoint.startsWith('http://') ||
      endpoint.startsWith('https://') ||
      endpoint.startsWith('file://')
    )
  }

  // const isValidForm = () => {
  //   let json
  //   if (dataPayload != undefined && contentEndpointPayload != undefined && txEndpointPayload != undefined && subjectPayload != undefined) {
  //     try {
  //       json = JSON.parse(dataPayload.trim())
  //       return json && isValidEndpointFormat(contentEndpointPayload) && isValidEndpointFormat(txEndpointPayload)
  //     } catch (error) {
  //       return false
  //     }
  //   }
  //   return false
  // }

  const isValidForm = (
    payload: Partial<ApplyPayload>
  ): payload is ApplyPayload => {
    try {
      return (
        payload.dataPayload !== undefined &&
        payload.subjectPayload !== undefined &&
        payload.contentEndpointPayload !== undefined &&
        payload.txEndpointPayload !== undefined &&
        JSON.parse(payload.dataPayload.trim()) &&
        isValidEndpointFormat(payload.contentEndpointPayload) &&
        isValidEndpointFormat(payload.txEndpointPayload)
      )
    } catch {
      return false
    }
  }

  const handleDataChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDataPayload(e.target.value)
  }
  const handleSubjectChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSubjectPayload(e.target.value)
  }
  const handleContentEndpointChange = (e: ChangeEvent<HTMLInputElement>) => {
    setContentEndpointPayload(e.target.value)
  }
  const handleTxEndpointChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTxEndpointPayload(e.target.value)
  }

  const handleSubmit = async (e: Event) => {
    const payload = {
      dataPayload,
      subjectPayload,
      contentEndpointPayload,
      txEndpointPayload,
      planDefinition,
    }
    if (isValidForm(payload)) {
      try {
        const response = await fetch(`/api/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        const json = await response.json()
        if (response.status === 200) {
          if (is.Bundle(json)) {
            setApplyBundle(json)
          } else {
            const error = 'Resource does not appear to be a FHIR bundle'
            message.error(error)
            console.error(error, json)
          }
        } else {
          const json = await response.json()
          message.error(json.message)
        }
      } catch (error) {
        const errorMsg = 'Server error: Unable to run $apply'
        message.error(errorMsg)
        console.error(errorMsg, error)
      }
    } else {
      console.log('Invalid form')
    }
  }

  const [form] = Form.useForm()

  return (
    <div className="side-panel-content">
      <Form
        onFinish={handleSubmit}
        form={form}
        className="form"
        autoComplete="off"
      >
        <Form.Item name="context-data" className="form-item">
          <h1 className="form-title">Add FHIR Data Bundle</h1>
          <p className="form-description">
            {/* Add context data as a FHIR JSON Bundle. */}
          </p>
          <TextArea onChange={handleDataChange} value={dataPayload} />
        </Form.Item>
        <Form.Item name="subject" className="form-item">
          <h1 className="form-title">Set Reference to Subject</h1>
          <p className="form-description">
            {/* Add context data as a FHIR JSON Bundle. */}
          </p>
          <Input
            placeholder="Patient/Patient-1"
            onChange={handleSubjectChange}
            value={subjectPayload}
          />
        </Form.Item>
        <Form.Item name="content-endpoint" className="form-item">
          <h1 className="form-title">Set FHIR Content Endpoint</h1>
          <p className="form-description">
            {/* Add context data as a FHIR JSON Bundle. */}
          </p>
          <Input
            placeholder="https://packages.simplifier.net/hl7.fhir.uv.cpg/2.0.0"
            onChange={handleContentEndpointChange}
            defaultValue={contentEndpoint}
            value={contentEndpointPayload}
          />
        </Form.Item>
        <Form.Item name="content-endpoint" className="form-item">
          <h1 className="form-title">Set Terminology Endpoint</h1>
          <p className="form-description">
            {/* Add context data as a FHIR JSON Bundle. */}
          </p>
          <Input
            placeholder="http://tx.fhir.org"
            onChange={handleTxEndpointChange}
            value={txEndpointPayload}
          />
        </Form.Item>
        <Form.Item className="button-group">
          <button
            type="submit"
            className={
              // isValidForm() ? 'button' :
              // 'button disabled'
              'button'
            }
          >
            Apply
          </button>
          <button
            type="submit"
            className="button button-secondary"
            onClick={resetForm}
          >
            Reset
          </button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default ApplyForm
