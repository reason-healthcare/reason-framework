import '@/styles/narrativeDisplay.css'
import { Form, Input, message, Progress, Radio, Select, Steps } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { ApplyPayload } from 'api/apply/route'
import { is } from 'helpers'
import { ChangeEvent, useEffect, useState } from 'react'
import QuestionnaireRenderer from './QuestionnaireRenderer'
import '@/styles/applyForm.css'

interface ApplyFormProps {
  planDefinition: fhir4.PlanDefinition
  contentEndpoint: string | undefined
  setRequestsBundle: React.Dispatch<
    React.SetStateAction<fhir4.Bundle | undefined>
  >
  setContextReference: React.Dispatch<React.SetStateAction<string | undefined>>
}

const ApplyForm = ({
  planDefinition,
  contentEndpoint,
  setRequestsBundle,
  setContextReference,
}: ApplyFormProps) => {
  const [dataPayload, setDataPayload] = useState<string | undefined>()
  const [subjectPayload, setSubjectPayload] = useState<string | undefined>()
  const [contentEndpointPayload, setContentEndpointPayload] = useState<
    string | undefined
  >()
  const [txEndpointPayload, setTxEndpointPayload] = useState<
    string | undefined
  >()
  const [questionnaireResponseServer, setQuestionnaireResponseServer] =
    useState<fhir4.QuestionnaireResponse>()
  const [userQuestionnaireResponse, setUserQuestionnaireResponse] =
    useState<fhir4.QuestionnaireResponse>()
  const [isApplied, setIsApplied] = useState(false)
  const resetForm = () => {
    setDataPayload(undefined)
    setSubjectPayload(undefined)
    setContentEndpointPayload(undefined)
    setTxEndpointPayload(undefined)
    setQuestionnaireResponseServer(undefined)
    setUserQuestionnaireResponse(undefined)
    form.resetFields()
    localStorage.removeItem('applyPayload')
  }

  const isValidEndpointFormat = (endpoint: string) => {
    return (
      endpoint.startsWith('http://') ||
      endpoint.startsWith('https://') ||
      endpoint.startsWith('file://')
    )
  }

  useEffect(() => {
    if (userQuestionnaireResponse != undefined && dataPayload != undefined) {
      const json = JSON.parse(dataPayload)
      console.log(userQuestionnaireResponse)
      const dataWithQr = {
        ...json,
        entry: [
          ...json.entry,
          {
            fullUrl:
              'http://example.org/QuestionnaireResponse/questionnaireResponseTemp',
            resource: userQuestionnaireResponse,
          },
        ],
      }
      const payloadWithQR = {
        dataPayload: JSON.stringify(dataWithQr),
        subjectPayload,
        contentEndpointPayload,
        txEndpointPayload,
        planDefinition,
      }
      handleApply(payloadWithQR)
    }
  }, [userQuestionnaireResponse])

  useEffect(() => {
    const storedPayload = localStorage.getItem('applyPayload')
    if (storedPayload != null) {
      const payload = JSON.parse(storedPayload)
      const {
        dataPayload,
        subjectPayload,
        contentEndpointPayload,
        txEndpointPayload,
      } = payload
      setDataPayload(dataPayload)
      setSubjectPayload(subjectPayload)
      setContentEndpointPayload(contentEndpointPayload)
      setTxEndpointPayload(txEndpointPayload)
    }
  }, [])

  useEffect(() => {
    localStorage.removeItem('applyPayload')
  }, [planDefinition])

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

  const handleApply = async (payload: any) => {
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
          console.log(json)
          if (is.Bundle(json)) {
            setRequestsBundle(json)
            const questionnaireResponseEntry = json.entry?.find(
              (e) => e.resource?.resourceType === 'QuestionnaireResponse'
            )?.resource
            if (is.QuestionnaireResponse(questionnaireResponseEntry)) {
              setQuestionnaireResponseServer(questionnaireResponseEntry)
            }
          } else {
            const error = 'Resource does not appear to be a FHIR bundle'
            message.error(error)
            console.error(error, json)
          }
        } else {
          const errorMsg = 'Server error: Unable to run $apply'
          console.error(json.message)
          message.error(errorMsg)
        }
        setIsApplied(true)
        setContextReference(subjectPayload)
      } catch (error) {
        const errorMsg = 'Server error: Unable to run $apply'
        message.error(errorMsg)
        console.error(errorMsg, error)
      }
    } else {
      console.log('Invalid form')
      message.error('Invalid form')
    }
  }

  const handleSubmit = async (e: Event) => {
    const payload = {
      dataPayload,
      subjectPayload,
      contentEndpointPayload,
      txEndpointPayload,
      planDefinition,
    }
    localStorage.setItem('applyPayload', JSON.stringify(payload))
    handleApply(payload)
  }

  const [form] = Form.useForm()
  return (
    <div className="apply-section">
      <Steps
        current={
          userQuestionnaireResponse != null
            ? 2
            : questionnaireResponseServer != null && isApplied
            ? 1
            : 0
        }
        items={[{ title: 'Context' }, { title: 'Questionnaire' }]}
        className="apply-steps"
      />
      {questionnaireResponseServer == null ? (
        <Form
          onFinish={handleSubmit}
          form={form}
          className="form apply-form"
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
              defaultValue="Patient/Patient1"
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
              defaultValue={contentEndpoint ?? 'http://localhost:8080/fhir'}
              value={contentEndpointPayload}
            />
          </Form.Item>
          <Form.Item name="content-endpoint" className="form-item">
            <h1 className="form-title">Terminology Endpoint</h1>
            <p className="form-description">
              Set terminology endpoint address.
            </p>
            <Input
              placeholder="http://tx.fhir.org"
              onChange={handleTxEndpointChange}
              value={txEndpointPayload ?? 'http://localhost:8080/fhir'}
            />
          </Form.Item>
          <Form.Item className="button-group">
            <button type="submit" className={'button'}>
              Apply
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={resetForm}
            >
              Reset
            </button>
          </Form.Item>
        </Form>
      ) : (
        <QuestionnaireRenderer
          questionnaireResponseServer={questionnaireResponseServer}
          setUserQuestionnaireResponse={setUserQuestionnaireResponse}
        />
      )}
    </div>
  )
}

export default ApplyForm
