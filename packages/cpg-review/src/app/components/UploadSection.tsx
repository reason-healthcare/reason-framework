import { useState, useEffect } from 'react'
import { Form, Button, message, Upload, Select } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import '@/styles/form.css'
import type { RcFile } from 'antd/es/upload'
import BrowserResolver from 'resolver/browser'
import { is, notEmpty, resolveCanonical } from 'helpers'
import LoadIndicator from './LoadIndicator'

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
  const [planDefinitions, setPlanDefinitions] = useState<string[]>()
  const [planDefinitionSelection, setPlanDefinitionSelection] =
    useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [uploaded, setUploaded] = useState<RcFile | undefined>()

  const { Option } = Select
  const { Dragger } = Upload
  const [form] = Form.useForm()

  useEffect(() => {
    setPlanDefinitionSelection(undefined)
    setPlanDefinition(undefined)
    setUploaded(undefined)
  }, [])

  const beforeUpload = (file: RcFile) => {
    const isZip = file.type === 'application/zip'
    if (uploaded != null) {
      message.error('May only upload one zipped file')
    } else if (!isZip) {
      message.error('May only upload zipped files')
    }
    if (isZip && uploaded == null) {
      setUploaded(file)
    } else {
      return Upload.LIST_IGNORE
    }
  }

  const handleFileChange = (info: any) => {
    const { status, originFileObj } = info.file
    const { fileList } = info
    if (status === 'removed') {
      localStorage.clear()
    } else if (fileList.length > 1) {
      message.error('May only upload one zipped file')
    } else if (status === 'done') {
      handleUpload(originFileObj)
    }
  }

  const handleUpload = async (file: RcFile) => {
    setIsLoading(true)
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const zipData = JSON.stringify(event.target?.result)
        let resolver = new BrowserResolver()
        resolver.handleProcessZip(zipData).then((r) => {
          setResolver(resolver)
          try {
            localStorage.clear()
            localStorage.setItem('resolver', JSON.stringify(resolver))
            message.success('Saved content to local storage')
          } catch (e) {
            console.error(e)
            message.info('Unable to save content to local storage')
          }
          const { resourcesByCanonical } = resolver
          const plans = Object.keys(resourcesByCanonical)
            .map((k: string) => {
              const resource = resourcesByCanonical[k]
              let type
              if (
                resource.meta?.profile?.find(
                  (p) =>
                    p ===
                    'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-pathwaydefinition'
                )
              ) {
                type = 'CPG Pathway'
              } else if (
                resource.meta?.profile?.find(
                  (p) =>
                    p ===
                    'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-strategydefinition'
                )
              ) {
                type = 'CPG Strategy'
              } else if (
                resource.meta?.profile?.find(
                  (p) =>
                    p ===
                    'http://hl7.org/fhir/uv/cpg/StructureDefinition/cpg-recommendationdefinition'
                )
              ) {
                type = 'CPG Recommendation'
              } else {
                type = 'Plan Definition'
              }
              if (is.PlanDefinition(resource)) {
                return `${resource.url} ${type ? `(${type})` : null}`
              }
            })
            .filter(notEmpty)
          setPlanDefinitions(plans)
        })
      }
      reader.readAsDataURL(file)
    } else {
      message.error('Please upload a zipped file')
    }
  }

  const handleChange = (value: string) => {
    setPlanDefinitionSelection(value)
  }

  const handleSubmit = (e: Event) => {
    if (resolver instanceof BrowserResolver) {
      const plan = resolveCanonical(planDefinitionSelection, resolver)
      if (is.PlanDefinition(plan)) {
        setPlanDefinition(plan)
      }
    }
  }

  const onRemove = () => {
    localStorage.clear()
    setUploaded(undefined)
  }

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    accept: 'zip',
    beforeUpload,
    onChange: handleFileChange,
    onRemove,
  }

  return (
    <>
      <h1 className="form-title">Upload FHIR Content</h1>
      <Form
        onFinish={handleSubmit}
        form={form}
        className="form"
        autoComplete="off"
      >
        <Form.Item
          name="upload"
          valuePropName="fileList"
          getValueFromEvent={(e) => e.fileList}
          className="form-item upload"
        >
          <Dragger {...props} className="form-item">
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag files to this area to upload
            </p>
            <p className="ant-upload-hint">Provide only one zipped file.</p>
          </Dragger>
        </Form.Item>
        {planDefinitions ? (
          <Form.Item name={'select'} className="form-item">
            <Select
              onChange={handleChange}
              placeholder="Select a plan definition"
              popupMatchSelectWidth={true}
            >
              {planDefinitions.map((p) => {
                return (
                  <Option key={p} value={p.split(' ').shift()}>
                    {p}
                  </Option>
                )
              })}
            </Select>
          </Form.Item>
        ) : isLoading ? (
          <LoadIndicator />
        ) : null}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            disabled={planDefinitionSelection == undefined}
          >
            View Content
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}

export default UploadSection
