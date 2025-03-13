import '@/styles/narrativeDisplay.css'
import { Form, Input, message, Radio, Select } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { ApplyPayload } from 'api/apply/route'
import { is } from 'helpers'
import { ChangeEvent, ChangeEventHandler, useState } from 'react'
import SidePanel from './SidePanel'
import { SidePanelView } from 'page'

interface ApplyFormProps {
  planDefinition: fhir4.PlanDefinition
  contentEndpoint: string | undefined
  setSidePanelView: React.Dispatch<React.SetStateAction<SidePanelView>>
  setRequestsBundle: React.Dispatch<
    React.SetStateAction<fhir4.Bundle | undefined>
  >
}

const ApplyForm = ({
  planDefinition,
  contentEndpoint,
  setSidePanelView,
  setRequestsBundle,
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

  // TODO: error handling
  const isValidForm = (
    payload: Partial<ApplyPayload>
  ): payload is ApplyPayload => {
    const {
      dataPayload,
      subjectPayload,
      contentEndpointPayload,
      txEndpointPayload,
    } = payload
    try {
      let json
      if (dataPayload != undefined) {
        json = JSON.parse(dataPayload.trim())
      }
      return (
        subjectPayload !== undefined &&
        contentEndpointPayload !== undefined &&
        txEndpointPayload !== undefined &&
        is.Bundle(json) &&
        isValidEndpointFormat(contentEndpointPayload) &&
        isValidEndpointFormat(txEndpointPayload)
      )
    } catch {
      message.error('Context does not appear to be valid JSON')
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
            setRequestsBundle(json)
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
    <SidePanel setSidePanelView={setSidePanelView}>
      <Form
        onFinish={handleSubmit}
        form={form}
        className="form"
        autoComplete="off"
      >
        <Form.Item name="context-data" className="form-item">
          <h1 className="form-title">Context</h1>
          <p className="form-description">
            Add context data as a FHIR JSON Bundle.
          </p>
          <TextArea onChange={handleDataChange} value={dataPayload} />
        </Form.Item>
        <Form.Item name="subject" className="form-item">
          <h1 className="form-title">Subject</h1>
          <p className="form-description">Set reference to subject.</p>
          <Input
            placeholder="Patient/Patient-1"
            onChange={handleSubjectChange}
            value={subjectPayload}
          />
        </Form.Item>
        <Form.Item name="content-endpoint" className="form-item">
          <h1 className="form-title">Content Endpoint</h1>
          <p className="form-description">Set content endpoint address</p>
          <Input
            placeholder="https://packages.simplifier.net/hl7.fhir.uv.cpg/2.0.0"
            onChange={handleContentEndpointChange}
            defaultValue={contentEndpoint}
            value={contentEndpointPayload}
          />
        </Form.Item>
        <Form.Item name="content-endpoint" className="form-item">
          <h1 className="form-title">Terminology Endpoint</h1>
          <p className="form-description">Set terminology endpoint address.</p>
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
    </SidePanel>
  )
}

export default ApplyForm
