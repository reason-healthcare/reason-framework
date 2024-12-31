import { useState, useEffect } from 'react'
import { Form, message, Upload, Select, Radio, Input } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { RadioChangeEvent, UploadProps } from 'antd'
import '@/styles/uploadSection.css'
import type { RcFile } from 'antd/es/upload'
import BrowserResolver from 'resolver/browser'
import { is, notEmpty, resolveCanonical } from 'helpers'
import Link from 'next/link'
import { debounce } from 'lodash'

interface UploadSectionProps {
  setResolver: React.Dispatch<React.SetStateAction<BrowserResolver | undefined>>
  setPlanDefinition: React.Dispatch<
    React.SetStateAction<fhir4.PlanDefinition | undefined>
  >
  resolver: BrowserResolver | undefined
}

const UploadSection = ({
  setResolver,
  setPlanDefinition,
  resolver,
}: UploadSectionProps) => {
  const [planDefinitions, setPlanDefinitions] =
    useState<fhir4.PlanDefinition[]>()
  const [planDefinitionPayload, setPlanDefinitionPayload] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [uploaded, setUploaded] = useState<RcFile | undefined>()
  const [packageType, setPackageType] = useState<string>('file')
  const [endpoint, setEndpoint] = useState<string | undefined>()

  const { Option } = Select
  const { Dragger } = Upload
  const [form] = Form.useForm()

  const beforeUpload = (file: RcFile) => {
    const isTar = file.type === 'application/gzip'
    if (uploaded != null) {
      message.error('May only upload one compressed package')
    } else if (!isTar) {
      message.error('May only upload file ending in .tgz')
    }
    if (isTar && uploaded == null) {
      setUploaded(file)
    } else {
      return Upload.LIST_IGNORE
    }
  }

  const handleUpload = async (rawData: RcFile | Blob) => {
    setIsLoading(true)
    if (rawData) {
      let resolver = new BrowserResolver()
      resolver.decompress(rawData).then((decompressed) => {
        if (decompressed instanceof Error) {
          message.error(
            'Unable to process compressed data. Ensure that the data is a FHIR Implementation Guide Package ending in .tgz'
          )
        } else {
          localStorage.clear()
          setPlanDefinitionPayload(undefined)
          setPlanDefinition(undefined)
          setResolver(decompressed)
          const { resourcesByCanonical } = resolver
          const plans = Object.keys(resourcesByCanonical)
            .map((k: string) => {
              const resource = resourcesByCanonical[k]
              if (is.PlanDefinition(resource)) {
                return resource
              }
            })
            .filter(notEmpty)
          if (plans.length > 0) {
            setPlanDefinitions(plans)
          } else {
            message.error(
              'Unable to find plan definitions. Please load content with at least one plan definition'
            )
          }
          try {
            localStorage.setItem('resolver', JSON.stringify(decompressed))
            message.success('Saved content to local storage')
          } catch (e) {
            console.error(e)
            message.info(
              'Unable to save content to local storage. Content can be reviewed but will not be saved between sessions.'
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

  const handleFileChange = (info: any) => {
    const { status, originFileObj } = info.file
    const { fileList } = info
    if (status === 'removed') {
      localStorage.clear()
    } else if (fileList.length > 1) {
      message.error('May only upload one compressed file')
    } else if (status === 'done') {
      handleUpload(originFileObj)
    }
  }

  const handleInput = debounce(async (value) => {
    if (value.startsWith('https://') || value.startsWith('http://')) {
      setEndpoint(value)
      try {
        const response = await fetch(value)
        if (!response.ok) {
          throw response
        }
        const blob = await response.blob()
        await handleUpload(blob)
      } catch (e) {
        console.error(`Problem fetching resource: ${e}`)
      }
    } else if (value != '') {
      message.error('Not a valid url')
    }
  }, 2000)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInput(e.target.value)
  }

  const formatPlanOptions = (plans: fhir4.PlanDefinition[] | undefined) => {
    const planOptions = planDefinitions?.map((plan) => {
      let type
      if (
        plan.meta?.profile?.find(
          (p) =>
            p ===
            'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-pathwaydefinition'
        )
      ) {
        type = 'CPG Pathway'
      } else if (
        plan.meta?.profile?.find(
          (p) =>
            p ===
            'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-strategydefinition'
        )
      ) {
        type = 'CPG Strategy'
      } else if (
        plan.meta?.profile?.find(
          (p) =>
            p ===
            'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-recommendationdefinition'
        )
      ) {
        type = 'CPG Recommendation'
      } else {
        type = 'Plan Definition'
      }
      return (
        <Option key={plan.url} value={plan.url}>
          {`${plan.title ?? plan.name ?? plan.url ?? plan.id} (${type})`}
        </Option>
      )
    })

    const sortOrder = [
      'CPG Pathway',
      'CPG Strategy',
      'CPG Recommendation',
      'Plan Definition',
    ]
    return planOptions?.sort().sort((a, b) => {
      const aKeyword =
        a.props.children
          .match(/\((.*?)\)/)
          ?.shift()
          ?.replace('(', '')
          .replace(')', '') || ''
      const bKeyword =
        b.props.children
          .match(/\((.*?)\)/)
          ?.shift()
          ?.replace('(', '')
          .replace(')', '') || ''
      const aIndex = sortOrder.indexOf(aKeyword)
      const bIndex = sortOrder.indexOf(bKeyword)
      return aIndex - bIndex
    })
  }

  const handleChange = (value: string) => {
    setPlanDefinitionPayload(value)
  }

  const handleSubmit = (e: Event) => {
    if (resolver instanceof BrowserResolver) {
      const plan = resolveCanonical(planDefinitionPayload, resolver)
      if (is.PlanDefinition(plan)) {
        localStorage.setItem('planDefinition', JSON.stringify(plan))
        setPlanDefinition(plan)
      }
    }
  }

  const onRemove = () => {
    localStorage.clear()
    setUploaded(undefined)
    setPlanDefinitions(undefined)
    setPlanDefinitionPayload(undefined)
    setResolver(undefined)
  }

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    accept: 'tgz',
    beforeUpload,
    onChange: handleFileChange,
    onRemove,
    maxCount: 1,
  }

  const handlePackageTypeChange = (e: RadioChangeEvent) => {
    setPackageType(e.target.value)
  }

  let uploadItem
  if (packageType === 'file') {
    uploadItem = (
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
        <Dragger {...props} className="form-item">
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
    uploadItem = (
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
        <Input
          placeholder="https://packages.simplifier.net/hl7.fhir.uv.cpg/2.0.0"
          onChange={handleInputChange}
        />
      </Form.Item>
    )
  }
  return (
    <>
      <Form
        onFinish={handleSubmit}
        form={form}
        className="form"
        autoComplete="off"
      >
        <Form.Item name="packageType" className="form-item">
          <h1 className="form-title">Select FHIR package type</h1>
          <Radio.Group
            value={packageType}
            onChange={handlePackageTypeChange}
            className="radio-group"
          >
            <Radio value="file">File</Radio>
            <Radio value="rest">Rest</Radio>
          </Radio.Group>
        </Form.Item>
        {uploadItem}
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
            onChange={handleChange}
            placeholder={
              planDefinitions == null
                ? 'Upload content to view plans'
                : 'Select a plan definition'
            }
            popupMatchSelectWidth={true}
            disabled={planDefinitions == null}
          >
            {formatPlanOptions(planDefinitions)}
          </Select>
        </Form.Item>
        <Form.Item>
          <button
            type="submit"
            className={
              planDefinitionPayload == undefined ? 'button disabled' : 'button'
            }
          >
            View Content
          </button>
        </Form.Item>
      </Form>
    </>
  )
}

export default UploadSection
