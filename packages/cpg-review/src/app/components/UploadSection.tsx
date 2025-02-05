import { useState, useRef } from 'react'
import { Form, message, Upload, Select, Radio, Input, Spin } from 'antd'
import { InboxOutlined, LoadingOutlined } from '@ant-design/icons'
import type { RadioChangeEvent, UploadProps } from 'antd'
import type { RcFile, UploadFile } from 'antd/es/upload'
import Link from 'next/link'
import { debounce } from 'lodash'
import { is, notEmpty, resolveCanonical } from 'helpers'
import BrowserResolver from 'resolver/browser'
import '@/styles/uploadSection.css'

const CPG_PATHWAY_DEF =
  'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-pathwaydefinition'
const CPG_STRATEGY_DEF =
  'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-strategydefinition'
const CPG_RECOMMENDATION_DEF =
  'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-recommendationdefinition'
const SORTED_CPG_PLAN_TYPES = [
  'CPG Pathway',
  'CPG Strategy',
  'CPG Recommendation',
  'Plan Definition',
]

export interface UploadSectionProps {
  setResolver: React.Dispatch<React.SetStateAction<BrowserResolver | undefined>>
  setPlanDefinition: React.Dispatch<
    React.SetStateAction<fhir4.PlanDefinition | undefined>
  >
  resolver: BrowserResolver | undefined
  packageTypePayload: string
  setPackageTypePayload: React.Dispatch<React.SetStateAction<string>>
  endpointPayload: string | undefined
  setEndpointPayload: React.Dispatch<React.SetStateAction<string | undefined>>
  fileList: UploadFile<any>[]
  setFileList: React.Dispatch<React.SetStateAction<UploadFile<any>[]>>
  planDefinitionSelectionOptions: PlanDefinitionSelectionOption[] | undefined
  setPlanDefinitionSelectionOptions: React.Dispatch<
    React.SetStateAction<PlanDefinitionSelectionOption[] | undefined>
  >
  planDefinitionPayload: string | undefined
  setPlanDefinitionPayload: React.Dispatch<
    React.SetStateAction<string | undefined>
  >
  setShowUploadPage: React.Dispatch<React.SetStateAction<boolean>>
}

type PlanType = typeof SORTED_CPG_PLAN_TYPES[number]

export interface PlanDefinitionSelectionOption {
  planDefinition: fhir4.PlanDefinition
  label: string | undefined
  type: PlanType
}

const UploadSection = (uploadSectionProps: UploadSectionProps) => {
  const {
    setResolver,
    setPlanDefinition,
    resolver,
    packageTypePayload,
    setPackageTypePayload,
    endpointPayload,
    setEndpointPayload,
    fileList,
    setFileList,
    planDefinitionSelectionOptions,
    setPlanDefinitionSelectionOptions,
    planDefinitionPayload,
    setPlanDefinitionPayload,
    setShowUploadPage,
  } = uploadSectionProps

  const [loadingEndpoint, setLoadingEndpoint] = useState(false)
  const [uploaded, setUploaded] = useState<RcFile | Blob | undefined>()
  const [form] = Form.useForm()

  const getPlanOptionType = (
    planDefinition: fhir4.PlanDefinition
  ): PlanType => {
    let type
    const { meta } = planDefinition
    if (meta?.profile?.find((profile) => profile === CPG_PATHWAY_DEF)) {
      type = 'CPG Pathway'
    } else if (meta?.profile?.find((profile) => profile === CPG_STRATEGY_DEF)) {
      type = 'CPG Strategy'
    } else if (
      meta?.profile?.find((profile) => profile === CPG_RECOMMENDATION_DEF)
    ) {
      type = 'CPG Recommendation'
    } else {
      type = 'Plan Definition'
    }
    return type
  }
  /** Sort plan definition options alphabetically with preference for plan type 1. pathway 2. strategy 3. recommendation 4. plan definition */
  const formatPlanOptions = (planDefinitionOptions: fhir4.PlanDefinition[]) => {
    return planDefinitionOptions
      .map((plan) => {
        const type = getPlanOptionType(plan)
        const label = plan.title ?? plan.name ?? plan.url ?? plan.id
        return {
          planDefinition: plan,
          type,
          label,
        }
      })
      .sort((a, b) => {
        return (
          SORTED_CPG_PLAN_TYPES.indexOf(a.type) -
            SORTED_CPG_PLAN_TYPES.indexOf(b.type) ||
          a.label?.localeCompare(b.label ?? '') ||
          0
        )
      })
  }

  /**
   * Reference to debounced function with delayed execution:
   * The function validates endpoint protocol (http/https) and fetches if valid; returns error if not
   * Called on endpoint input change (handleInputChange()) such that endpoint is used to fetch or return error message 2000ms after user stops typing.
   */
  const handleEndpointInput = useRef(
    debounce(async (value) => {
      if (value.startsWith('https://') || value.startsWith('http://')) {
        try {
          const response = await fetch(value)
          if (!response.ok) {
            throw response
          }
          const blob = await response.blob()
          setUploaded(blob)
          await handleUploadFile(blob)
        } catch (e) {
          message.error('Unable to resolve endpoint')
          console.error(`Problem fetching resource: ${e}`)
        }
      } else if (value !== '') {
        message.error('Not a valid URL')
      }
      setLoadingEndpoint(false)
    }, 2000)
  ).current

  const handleEndpointChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLoadingEndpoint(true)
    setEndpointPayload(e.target.value)
    handleEndpointInput(e.target.value)
  }

  const resetForm = () => {
    setFileList([])
    setUploaded(undefined)
    setPlanDefinitionSelectionOptions(undefined)
    setPlanDefinitionPayload(undefined)
    setEndpointPayload(undefined)
    form.resetFields()
    localStorage.clear()
  }

  const handlePackageTypeChange = (e: RadioChangeEvent) => {
    setPackageTypePayload(e.target.value)
    resetForm()
  }

  const handlePlanSelectionChange = (value: string) => {
    setPlanDefinitionPayload(value)
  }

  const handleSubmit = (e: Event) => {
    if (resolver != null) {
      const plan = resolveCanonical(planDefinitionPayload, resolver)
      if (is.PlanDefinition(plan)) {
        setPlanDefinition(plan)
        setShowUploadPage(false)
      }
    }
  }

  const handleUploadFile = async (rawData: RcFile | Blob) => {
    if (rawData != null) {
      let resolver = new BrowserResolver()
      resolver.decompress(rawData).then((decompressed) => {
        if (decompressed instanceof Error) {
          message.error(
            'Unable to process compressed data. Ensure that the data is a FHIR Implementation Guide Package ending in .tgz'
          )
        } else {
          const { resourcesByCanonical } = resolver
          const plans = Object.keys(resourcesByCanonical)
            .map((k: string) => {
              const resource = resourcesByCanonical[k]
              if (is.PlanDefinition(resource)) {
                return resource
              }
            })
            .filter(notEmpty)
          if (plans?.length > 0) {
            setPlanDefinitionSelectionOptions(formatPlanOptions(plans))
            localStorage.clear()
            setPlanDefinition(undefined)
            setResolver(decompressed)
            try {
              localStorage.setItem('resolver', JSON.stringify(decompressed))
              message.success('Saved content to local storage')
            } catch (e) {
              console.error(e)
              message.info(
                'Unable to save content to local storage. Content can be reviewed but will not be saved between sessions.'
              )
            }
          } else {
            message.error(
              'Unable to find plan definitions. Please load content with at least one plan definition'
            )
          }
        }
      })
    } else {
      message.error(
        'Please upload a compressed FHIR Implementation Guide Package ending in .tgz'
      )
    }
  }

  const beforeFileUpload = (file: RcFile) => {
    const isTar = file.type === 'application/gzip'
    if (isTar && uploaded == null) {
      setUploaded(file)
      setFileList([file])
    } else {
      if (uploaded != null) {
        message.error('May only upload one compressed package')
      } else if (!isTar) {
        message.error('File must be a tarball ending in .tgz')
      }
      return Upload.LIST_IGNORE
    }
  }

  const handleFileUploadChange = (info: any) => {
    const { status, originFileObj } = info.file
    const { fileList } = info
    if (status === 'removed') {
      localStorage.clear()
    } else if (fileList.length > 1) {
      message.error('May only upload one compressed file')
    } else if (status === 'done') {
      handleUploadFile(originFileObj)
    }
  }

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: 'tgz',
    beforeUpload: beforeFileUpload,
    onChange: handleFileUploadChange,
    onRemove: resetForm,
    maxCount: 1,
  }

  const { Dragger } = Upload
  let uploadFormItem
  if (packageTypePayload === 'file') {
    uploadFormItem = (
      <Form.Item name="upload" className="form-item upload">
        <h1 className="form-title">Upload package</h1>
        <p className="form-description">
          Add an r4 FHIR implementation guide package. Use the generated{' '}
          <span>
            <Link
              href="https://confluence.hl7.org/display/FHIR/IG+Publisher+Documentation#IGPublisherDocumentation-Summary"
              target="_blank"
            >
              ImplementationGuide/output/package.r4.tgz
            </Link>
          </span>{' '}
          file.
        </p>
        <Dragger
          {...uploadProps}
          className={`form-item ${fileList.length ? 'hidden' : ''}`}
          fileList={fileList}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag files to this area to upload
          </p>
          <p className="ant-upload-hint">Provide one tarball ending in .tgz</p>
        </Dragger>
      </Form.Item>
    )
  } else {
    uploadFormItem = (
      <Form.Item
        name="endpoint"
        valuePropName="fileList"
        getValueFromEvent={(e) => e.fileList}
        className="form-item upload"
      >
        <h1 className="form-title">Set content endpoint</h1>
        <p className="form-description">
          Specify endpoint address for r4 FHIR implementation guide package.
        </p>
        <div className="endpoint-input-wrapper">
          <Input
            placeholder="https://packages.simplifier.net/hl7.fhir.uv.cpg/2.0.0"
            onChange={handleEndpointChange}
            value={endpointPayload}
          />
          {loadingEndpoint && (
            <Spin indicator={<LoadingOutlined spin />} className="load-icon" />
          )}
        </div>
      </Form.Item>
    )
  }

  const { Option } = Select
  return (
    <>
      <Form
        onFinish={handleSubmit}
        form={form}
        className="form"
        autoComplete="off"
      >
        <Form.Item name="packageTypePayload" className="form-item">
          <h1 className="form-title">Select FHIR package type</h1>
          <p className="form-description">
            Choose to upload FHIR package from local filesystem or rest
            endpoint.
          </p>
          <Radio.Group
            value={packageTypePayload}
            onChange={handlePackageTypeChange}
            className="radio-group"
          >
            <Radio value="file">File</Radio>
            <Radio value="rest">Rest</Radio>
          </Radio.Group>
        </Form.Item>
        {uploadFormItem}
        <Form.Item name="select" className="form-item">
          <h1 className="form-title">Select plan definition</h1>
          <p className="form-description">
            Select a plan definition for review. Recommend using a{' '}
            <span>
              <Link
                href="https://build.fhir.org/ig/HL7/cqf-recommendations/documentation-approach-12-03-cpg-plan.html#pathways"
                target="_blank"
              >
                Clinical Practice Guidelines Pathway
              </Link>
            </span>
            .
          </p>
          <Select
            onChange={handlePlanSelectionChange}
            placeholder={
              planDefinitionSelectionOptions == null
                ? 'Upload content to view plans'
                : 'Select a plan definition'
            }
            popupMatchSelectWidth={true}
            disabled={planDefinitionSelectionOptions == null}
          >
            {planDefinitionSelectionOptions?.map((planOption) => {
              const { planDefinition, label, type } = planOption
              return (
                <Option key={planDefinition.url} value={planDefinition.url}>
                  {`${label} (${type})`}
                </Option>
              )
            })}
          </Select>
        </Form.Item>
        <Form.Item className="button-group">
          <button
            type="submit"
            className={
              planDefinitionPayload == undefined ? 'button disabled' : 'button'
            }
          >
            View Content
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
    </>
  )
}

export default UploadSection
