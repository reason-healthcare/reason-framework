import { useState, useEffect } from 'react'
import { Form, Button, message, Upload, Select } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import '@/styles/form.css'
import type { RcFile } from 'antd/es/upload'
import FileResolver from 'resolver/file'
import BrowserResolver from 'resolver/browser'
import { is, notEmpty, resolveCanonical } from 'helpers'
import LoadIndicator from './LoadIndicator'

interface UploadSectionProps {
  setResolver: React.Dispatch<
    React.SetStateAction<BrowserResolver | undefined>
  >
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

  const { Option } = Select
  const { Dragger } = Upload
  const [form] = Form.useForm()

  useEffect(() => {
    setPlanDefinitionSelection(undefined)
    setPlanDefinition(undefined)
  }, [])

  const beforeUpload = (file: RcFile) => {
    const isZip = file.type === 'application/zip'
    if (!isZip) {
      message.error('You can only upload zipped files')
    }
    return isZip || Upload.LIST_IGNORE
  }

  const handleFileChange = (info: any) => {
    const { status, originFileObj } = info.file
    if (status === 'removed') {
      localStorage.clear()
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
                type = 'Plan'
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

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    accept: 'zip',
    beforeUpload: beforeUpload,
    onChange: handleFileChange,
    onRemove: () => localStorage.clear(),
    onDrop(e) {},
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
          className="form-item"
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
            >
              {planDefinitions.map((p) => {
                return <Option key={p} value={p.split(' ').shift()}>{p}</Option>
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
