import '@/styles/narrativeDisplay.css'
import { Alert, Form, message, Steps } from 'antd'
import { ApplyPayload } from 'api/apply/route'
import { is } from 'helpers'
import { useEffect, useMemo, useRef, useState } from 'react'
import QuestionnaireRenderer from './QuestionnaireRenderer'
import ApplyButton from './ApplyButton'
import PatientLoadModeSwitcher from 'components/apply-form/PatientLoadModeSwitcher'
import SelectedPatientPreviewCard from 'components/apply-form/SelectedPatientPreviewCard'
import EndpointsConfiguration, {
  EndpointsConfig,
  EndpointsConfigurationHandle,
} from 'components/apply-form/EndpointsConfiguration'
import {
  addPatient,
  makeBundlePatientSummary,
  PatientSummary,
} from 'utils/recentPatientsStore'
import { ResourceIdentifier } from 'utils/fhirContextDeriver'
import '@/styles/applyForm.css'
import '@/styles/uploadSection.css'
import { SidePanelView } from 'page'
import BrowserResolver from 'resolver/browser'

const EMPTY_RECOMMENDATION_CONTEXT: fhir4.Bundle = {
  resourceType: 'Bundle',
  type: 'collection',
  entry: [],
}

interface ApplyFormProps {
  resolver?: BrowserResolver | undefined
  planDefinition: fhir4.PlanDefinition
  contentEndpoint: string | undefined
  setRequestsBundle: React.Dispatch<
    React.SetStateAction<fhir4.Bundle | undefined>
  >
  setContextReference: React.Dispatch<React.SetStateAction<string | undefined>>
  setSidePanelView: React.Dispatch<React.SetStateAction<SidePanelView>>
}

const ApplyForm = ({
  resolver,
  planDefinition,
  setRequestsBundle,
  setContextReference,
  setSidePanelView,
}: ApplyFormProps) => {
  const [dataPayload, setDataPayload] = useState<string | undefined>()
  const [patientSubject, setPatientSubject] = useState<
    ResourceIdentifier | undefined
  >()
  const [dataEndpointPayload, setDataEndpointPayload] = useState<
    string | undefined
  >()
  const [questionnaireResponseServer, setQuestionnaireResponseServer] =
    useState<fhir4.QuestionnaireResponse>()
  const [questionnaire, setQuestionnaire] = useState<
    fhir4.Questionnaire | undefined
  >()
  const [isApplied, setIsApplied] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPatientSummary, setSelectedPatientSummary] = useState<
    PatientSummary | undefined
  >()
  const endpointsRef = useRef<EndpointsConfigurationHandle>(null)
  const [capturedEndpointsConfig, setCapturedEndpointsConfig] = useState<
    EndpointsConfig | undefined
  >()

  const clearApplyOutputs = () => {
    setQuestionnaireResponseServer(undefined)
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
    setPatientSubject(undefined)
    setSelectedPatientSummary(undefined)
    setCapturedEndpointsConfig(undefined)
    form.resetFields()
    localStorage.removeItem('applyPayload')
    endpointsRef.current?.reset()
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
    const storedPayload = localStorage.getItem('applyPayload')
    if (storedPayload != null) {
      const payload = JSON.parse(storedPayload)
      const { dataPayload, subjectPayload } = payload
      setDataPayload(
        typeof dataPayload === 'string'
          ? dataPayload
          : dataPayload != null
          ? JSON.stringify(dataPayload)
          : undefined
      )
      const parts =
        typeof subjectPayload === 'string' ? subjectPayload.split('/') : []
      if (parts.length === 2 && parts[0] && parts[1]) {
        setPatientSubject({ resourceType: parts[0], id: parts[1] })
      }
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
    if (dataPayload == undefined && !payload.dataEndpointPayload) {
      message.error(
        'Either context data (FHIR JSON Bundle) or a data endpoint is required'
      )
      return false
    }
    if (dataPayload != null && !is.Bundle(dataPayload)) {
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

  const handlePatientSelect = (
    subject: ResourceIdentifier,
    summary: PatientSummary,
    nextDataPayload?: string
  ) => {
    setDataPayload(nextDataPayload)
    setPatientSubject(subject)
    setSelectedPatientSummary(summary)
  }
  const handleClearSelectedPatient = () => {
    setDataPayload(undefined)
    setPatientSubject(undefined)
    setSelectedPatientSummary(undefined)
  }
  const parseDataPayload = (payload: string | undefined) => {
    try {
      return payload ? JSON.parse(payload) : undefined
    } catch (error) {
      return undefined
    }
  }

  const handleApply = async (
    payload: Partial<ApplyPayload>,
    options?: { fromQuestionnaire?: boolean }
  ) => {
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
        setContextReference(payload.subjectPayload)
        setCurrentStep(
          options?.fromQuestionnaire ? 2 : !skipQuestionnaire ? 1 : 2
        )
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
    setIsApplied(false)
    const dataPayloadParsed = parseDataPayload(dataPayload)
    const endpointsConfig = endpointsRef.current?.getConfig()
    setCapturedEndpointsConfig(endpointsConfig)
    const subjectPayload = patientSubject
      ? `${patientSubject.resourceType}/${patientSubject.id}`
      : undefined
    const payload = {
      dataPayload: dataPayloadParsed,
      subjectPayload,
      cpgEngineEndpointPayload: endpointsConfig?.cpgEngineEndpoint.trim(),
      contentEndpointPayload: endpointsConfig?.contentEndpoint.trim(),
      txEndpointPayload: endpointsConfig?.txEndpoint.trim(),
      dataEndpointPayload: endpointsConfig?.dataEndpoint.trim(),
      planDefinition,
    }
    localStorage.setItem(
      'applyPayload',
      JSON.stringify({ dataPayload, subjectPayload })
    )

    // Track bundle-mode submission in recent patients
    if (payload.dataPayload && patientSubject) {
      try {
        const bundle = payload.dataPayload as fhir4.Bundle
        const patientId = patientSubject.id
        const patientResource = bundle.entry
          ?.map((e) => e.resource)
          .find(
            (r): r is fhir4.Patient =>
              r?.resourceType === 'Patient' && r.id === patientId
          )
        const summary = makeBundlePatientSummary(
          bundle,
          patientResource,
          dataPayload,
          { patientId }
        )
        addPatient(summary)
        setSelectedPatientSummary(summary)
      } catch {
        // Non-fatal — store write is best-effort
      }
    }

    await handleApply(payload)
  }

  const handleQuestionnaireSubmit = async (
    response: fhir4.QuestionnaireResponse
  ) => {
    setIsApplied(false)
    const dataPayloadParsed = parseDataPayload(dataPayload)
    // Use the existing bundle when available; fall back to a minimal collection
    // bundle when only a data endpoint was configured (endpoint-only mode).
    const baseBundle: fhir4.Bundle = is.Bundle(dataPayloadParsed)
      ? dataPayloadParsed
      : { resourceType: 'Bundle', type: 'collection', entry: [] }

    const entriesWithoutQuestionnaireResponse = (baseBundle.entry ?? []).filter(
      (entry) => entry.resource?.resourceType !== 'QuestionnaireResponse'
    )

    // Ensure QuestionnaireResponse.questionnaire references match the Questionnaire URL
    const questionnaireUrl = questionnaire
      ? `http://example.org/Questionnaire/${questionnaire.id}/${questionnaire.version}`
      : response.questionnaire

    const updatedResponse: fhir4.QuestionnaireResponse = {
      ...response,
      questionnaire: questionnaireUrl,
    }

    const dataWithQr = {
      ...baseBundle,
      entry: [
        ...entriesWithoutQuestionnaireResponse,
        {
          fullUrl:
            'http://example.org/QuestionnaireResponse/questionnaireResponseTemp',
          resource: updatedResponse,
        },
      ],
    }

    // Update dataPayload state so subsequent edits build on this QuestionnaireResponse
    setDataPayload(JSON.stringify(dataWithQr))

    const payload: Partial<ApplyPayload> = {
      dataPayload: dataWithQr,
      subjectPayload: patientSubject
        ? `${patientSubject.resourceType}/${patientSubject.id}`
        : undefined,
      cpgEngineEndpointPayload:
        capturedEndpointsConfig?.cpgEngineEndpoint.trim(),
      contentEndpointPayload: capturedEndpointsConfig?.contentEndpoint.trim(),
      txEndpointPayload: capturedEndpointsConfig?.txEndpoint.trim(),
      dataEndpointPayload: capturedEndpointsConfig?.dataEndpoint.trim(),
      planDefinition,
      questionnaire,
    }
    await handleApply(payload, { fromQuestionnaire: true })
  }

  const [form] = Form.useForm()
  const recommendationContext = useMemo<fhir4.Bundle>(() => {
    if (!dataPayload?.trim()) {
      return EMPTY_RECOMMENDATION_CONTEXT
    }

    try {
      const parsed = JSON.parse(dataPayload) as unknown
      return is.Bundle(parsed)
        ? (parsed as fhir4.Bundle)
        : EMPTY_RECOMMENDATION_CONTEXT
    } catch {
      return EMPTY_RECOMMENDATION_CONTEXT
    }
  }, [dataPayload])


  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <Form
          onFinish={handleSubmit}
          form={form}
          className="form apply-form"
          autoComplete="off"
        >
          <Form.Item className="form-item">
            <EndpointsConfiguration
              ref={endpointsRef}
              onDataEndpointChange={setDataEndpointPayload}
            />
          </Form.Item>
          <Form.Item className="form-item">
            <div>
              <h2 className="form-title">Patient Context</h2>
              <p className="form-description">
                Upload a patient context file or search for a patient
              </p>
            </div>
            <PatientLoadModeSwitcher
              resolver={resolver}
              dataEndpointUrl={dataEndpointPayload}
              onPatientSelect={handlePatientSelect}
            />

            <SelectedPatientPreviewCard
              subject={patientSubject}
              dataPayload={dataPayload}
              selectedPatient={selectedPatientSummary}
              onClear={handleClearSelectedPatient}
            />
          </Form.Item>

          <Form.Item className="button-group">
            <button
              type="button"
              className="button button-secondary"
              onClick={resetForm}
            >
              {isApplying ? 'Cancel' : 'Reset'}
            </button>
            <ApplyButton isApplying={isApplying} label="Apply" type="submit" />
          </Form.Item>
        </Form>
      )
    }

    if (currentStep === 1) {
      return (
        <QuestionnaireRenderer
          questionnaireResponseServer={questionnaireResponseServer}
          recommendationContext={recommendationContext}
          onSubmitQuestionnaire={handleQuestionnaireSubmit}
          questionnaire={questionnaire}
          setCurrentStep={setCurrentStep}
          isApplying={isApplying}
        />
      )
    }

    return (
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
    )
  }

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
      {renderStepContent()}
    </div>
  )
}

export default ApplyForm
