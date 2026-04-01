import '@/styles/narrativeDisplay.css'
import { Alert, Form, Input, message, Spin, Steps } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import { ApplyPayload } from 'api/apply/route'
import { is } from 'helpers'
import { ChangeEvent, useEffect, useState } from 'react'
import QuestionnaireRenderer from './QuestionnaireRenderer'
import '@/styles/applyForm.css'
import { LoadingOutlined } from '@ant-design/icons'
import { SidePanelView } from 'page'

interface ApplyFormProps {
  planDefinition: fhir4.PlanDefinition
  contentEndpoint: string | undefined
  setRequestsBundle: React.Dispatch<
    React.SetStateAction<fhir4.Bundle | undefined>
  >
  setContextReference: React.Dispatch<React.SetStateAction<string | undefined>>
  setSidePanelView: React.Dispatch<React.SetStateAction<SidePanelView>>
}

const ApplyForm = ({
  planDefinition,
  contentEndpoint,
  setRequestsBundle,
  setContextReference,
  setSidePanelView,
}: ApplyFormProps) => {
  const [dataPayload, setDataPayload] = useState<fhir4.Bundle | undefined>()
  const [subjectPayload, setSubjectPayload] = useState<string | undefined>(
    'Patient/Patient1'
  )
  const [cpgEngineEndpointPayload, setCpgEngineEndpointPayload] = useState<
    string | undefined
  >('http://localhost:8080/fhir/PlanDefinition/$r5.apply')
  const [contentEndpointPayload, setContentEndpointPayload] = useState<
    string | undefined
  >('http://localhost:8080/fhir')
  const [txEndpointPayload, setTxEndpointPayload] = useState<
    string | undefined
  >('http://localhost:8080/fhir')
  const [questionnaireResponseServer, setQuestionnaireResponseServer] =
    useState<fhir4.QuestionnaireResponse>()
  const [userQuestionnaireResponse, setUserQuestionnaireResponse] =
    useState<fhir4.QuestionnaireResponse>()
  const [questionnaire, setQuestionnaire] = useState<
    fhir4.Questionnaire | undefined
  >()
  const [isApplied, setIsApplied] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const clearApplyOutputs = () => {
    setQuestionnaireResponseServer(undefined)
    setUserQuestionnaireResponse(undefined)
    setQuestionnaire(undefined)
    setRequestsBundle(undefined)
  }

  const resetApplyUiState = () => {
    setIsApplying(false)
    setIsApplied(false)
    setCurrentStep(0)
  }

  const resetForm = () => {
    clearApplyOutputs()
    resetApplyUiState()
    setDataPayload(undefined)
    setSubjectPayload(undefined)
    setCpgEngineEndpointPayload(undefined)
    setContentEndpointPayload(undefined)
    setTxEndpointPayload(undefined)
    form.resetFields()
    localStorage.removeItem('applyPayload')
  }

  const isValidEndpointFormat = (endpoint: string) => {
    if (
      !endpoint.startsWith('http://') &&
      !endpoint.startsWith('https://') &&
      !endpoint.startsWith('file://')
    ) {
      message.error(`${endpoint} does not appear to be a valid endpoint`)
      return false
    }
    return true
  }

  useEffect(() => {
    if (userQuestionnaireResponse != undefined && dataPayload != undefined) {
      const dataWithQr = {
        ...dataPayload,
        entry: [
          ...dataPayload.entry ?? [],
          {
            fullUrl:
              'http://example.org/QuestionnaireResponse/questionnaireResponseTemp',
            resource: userQuestionnaireResponse,
          },
        ],
      }
      const payloadWithQR = {
        dataPayload: dataWithQr,
        subjectPayload,
        cpgEngineEndpointPayload,
        contentEndpointPayload,
        txEndpointPayload,
        planDefinition,
        questionnaire,
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
        cpgEngineEndpointPayload,
        contentEndpointPayload,
        txEndpointPayload,
      } = payload
      setDataPayload(dataPayload)
      setSubjectPayload(subjectPayload)
      setCpgEngineEndpointPayload(cpgEngineEndpointPayload)
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
      cpgEngineEndpointPayload,
      contentEndpointPayload,
      txEndpointPayload,
    } = payload
    if (dataPayload == undefined) {
      message.error(
        'Context data is required in the form of a FHIR JSON Bundle'
      )
      return false
    }
    if (!is.Bundle(dataPayload)) {
      message.error('Context data is not a valid FHIR Bundle')
      return false
    }
    if (subjectPayload == undefined) {
      message.error('Subject reference is required')
      return false
    }
    if (cpgEngineEndpointPayload == undefined) {
      message.error('CPG Engine endpoint is required')
      return false
    }
    if (contentEndpointPayload == undefined) {
      message.error('Content endpoint is required')
      return false
    }
    if (txEndpointPayload == undefined) {
      message.error('Terminology endpoint is required')
      return false
    }
    return (
      isValidEndpointFormat(cpgEngineEndpointPayload) &&
      isValidEndpointFormat(contentEndpointPayload) &&
      isValidEndpointFormat(txEndpointPayload)
    )
  }

  const handleDataChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsed = JSON.parse(e.target.value)
      if (is.Bundle(parsed)) {
        setDataPayload(parsed)
      } else {
        setDataPayload(undefined)
      }
    } catch (error) {
      setDataPayload(undefined)
    }
  }
  const handleSubjectChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSubjectPayload(e.target.value)
  }
  const handleEngineEndpointChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCpgEngineEndpointPayload(e.target.value)
  }
  const handleContentEndpointChange = (e: ChangeEvent<HTMLInputElement>) => {
    setContentEndpointPayload(e.target.value)
  }
  const handleTxEndpointChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTxEndpointPayload(e.target.value)
  }

  const handleApply = async (payload: any) => {
    if (isValidForm(payload)) {
      setIsApplying(true)
      try {
        const response = await fetch(`/api/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        const json = await response.json()
        // Return will be a FHIR parameters resource with a Bundle or a Bundle
        let bundle = json
        if (is.Parameters(json)) {
          bundle =
            json.parameter?.find((p) => is.Bundle(p.resource))?.resource ?? json
        }
        if (!is.Bundle(bundle)) {
          throw new Error('Resource does not appear to be a FHIR bundle')
        }
                
        setRequestsBundle(bundle)
        // Find QuestionnaireResponse
        const questionnaireResponseEntry = bundle.entry?.find(
          (e: any) => e.resource?.resourceType === 'QuestionnaireResponse'
        )?.resource
        let skipQuestionnaire = true
        if (is.QuestionnaireResponse(questionnaireResponseEntry)) {
          setQuestionnaireResponseServer(questionnaireResponseEntry)
          // Find Questionnaire
          const questionnaire =
            questionnaireResponseEntry?.contained?.find((resource) =>
              is.Questionnaire(resource)
            ) ??
            bundle.entry?.find((e: any) => is.Questionnaire(e.resource))
              ?.resource
          if (is.Questionnaire(questionnaire)) {
            setQuestionnaire(questionnaire)
            skipQuestionnaire = false
          }
        }
        setIsApplied(true)
        setContextReference(subjectPayload)
        setCurrentStep(currentStep === 0 && !skipQuestionnaire ? 1 : 2)
      } catch (error) {
        clearApplyOutputs()
        const errorMsg = 'Server error: Unable to run $apply'
        message.error(errorMsg)
        console.error(errorMsg, error)
        setIsApplied(false)
      } finally {
        setIsApplying(false)
      }
    }
  }

  const handleSubmit = async () => {
    clearApplyOutputs()
    setIsApplied(false)
    const payload = {
      dataPayload,
      subjectPayload: subjectPayload?.trim(),
      cpgEngineEndpointPayload: cpgEngineEndpointPayload?.trim(),
      contentEndpointPayload: contentEndpointPayload?.trim(),
      txEndpointPayload: txEndpointPayload?.trim(),
      planDefinition,
    }
    localStorage.setItem('applyPayload', JSON.stringify(payload))
    const result = await handleApply(payload)
  }

  const [form] = Form.useForm()
  return (
    <div className="apply-section">
      <Steps
        onChange={(step) => {
          if (step === 2) {
            return
          }
          setCurrentStep(step)
        }}
        current={currentStep}
        items={[
          { title: 'Context' },
          { title: 'Questionnaire', disabled: !isApplied },
          {
            title: 'Applied',
            disabled: true,
          },
        ]}
        className="apply-steps"
      />
      {currentStep === 0 ? (
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
            <TextArea onChange={handleDataChange} value={JSON.stringify(dataPayload, null, 2)} />
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
          <Form.Item name="cpg-engine-endpoint" className="form-item">
            <h1 className="form-title">CPG Engine Endpoint</h1>
            <p className="form-description">Set CPG engine endpoint address</p>
            <Input
              placeholder="http://0.0.0.0:9001/PlanDefinition/$apply"
              onChange={handleEngineEndpointChange}
              defaultValue={'http://0.0.0.0:9001/PlanDefinition/$apply'}
              value={cpgEngineEndpointPayload}
            />
          </Form.Item>
          <Form.Item name="content-endpoint" className="form-item">
            <h1 className="form-title">Content Endpoint</h1>
            <p className="form-description">Set content endpoint address</p>
            <Input
              placeholder="http://localhost:8080/fhir"
              onChange={handleContentEndpointChange}
              defaultValue={contentEndpoint ?? 'http://localhost:8080/fhir'}
              value={contentEndpointPayload}
            />
          </Form.Item>
          <Form.Item name="terminology-endpoint" className="form-item">
            <h1 className="form-title">Terminology Endpoint</h1>
            <p className="form-description">
              Set terminology endpoint address.
            </p>
            <Input
              placeholder="http://tx.fhir.org"
              onChange={handleTxEndpointChange}
              defaultValue={contentEndpoint ?? 'http://localhost:8080/fhir'}
              value={txEndpointPayload}
            />
          </Form.Item>
          {isApplying ? (
            <Form.Item className="button-group">
              <button
                type="button"
                className="button button-secondary"
                onClick={resetForm}
              >
                Cancel
              </button>
              <button type="submit" className={'button'} disabled>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  Applying
                  <Spin
                    style={{ color: '#fff' }}
                    indicator={<LoadingOutlined spin />}
                    size="small"
                  />
                </div>
              </button>
            </Form.Item>
          ) : (
            <Form.Item className="button-group">
              <button
                type="button"
                className="button button-secondary"
                onClick={resetForm}
              >
                Reset
              </button>
              <button type="submit" className={'button'}>
                Apply
              </button>
            </Form.Item>
          )}
        </Form>
      ) : currentStep === 1 ? (
        <QuestionnaireRenderer
          questionnaireResponseServer={questionnaireResponseServer}
          setUserQuestionnaireResponse={setUserQuestionnaireResponse}
          questionnaire={questionnaire}
          setCurrentStep={setCurrentStep}
          isApplying={isApplying}
        />
      ) : (
        <Alert
          className="success-alert"
          message="Applied!"
          description="Return to steps 1 or 2 or clear current patient context to return to plan definition"
          type="success"
          showIcon
          action={
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexDirection: 'column',
              }}
            >
              <button
                className="button"
                type="button"
                onClick={() => {
                  setContextReference(undefined)
                  setSidePanelView(undefined)
                }}
              >
                Return to Plan Definition
              </button>
              <button
                className="button-secondary button"
                type="button"
                onClick={() => setCurrentStep(0)}
              >
                Edit Context
              </button>
              <button
                className="button-secondary button"
                type="button"
                onClick={() => setCurrentStep(1)}
              >
                Edit Questionnaire Response
              </button>
            </div>
          }
        />
      )}
    </div>
  )
}

export default ApplyForm
