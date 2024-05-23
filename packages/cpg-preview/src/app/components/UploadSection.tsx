import { useState } from 'react'
import { Form, Button, Input, message, Upload } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import '@/styles/form.css'
import type { RcFile } from 'antd/es/upload'
import FileResolver from 'resolver/file'
import BrowserResolver from 'resolver/browser'

interface UploadSectionProps {
  setResolver: React.Dispatch<
    React.SetStateAction<FileResolver | BrowserResolver | undefined>
  >
  // setPlanDefinition: React.Dispatch<React.SetStateAction<fhir4.PlanDefinition | undefined>>
}

const UploadSection = ({ setResolver }: UploadSectionProps) => {
  const [file, setFile] = useState<RcFile>()
  const [localContent, setLocalContent] = useState<string | undefined>()
  // const [planDefinitionIdentifier, setPlanDefinitionIdentifier]=useState<string>()

  const { Dragger } = Upload
  const [form] = Form.useForm()

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
      setFile(undefined)
    } else if (status === 'done') {
      setFile(originFileObj)
    }
  }

  const handleSubmit = async () => {
    if (file) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const zipData = JSON.stringify(event.target?.result)
        setLocalContent(zipData)
        let resolver = new BrowserResolver()
        resolver.handleProcessZip(zipData).then((r) => {
          setResolver(resolver)
          localStorage.clear()
          localStorage.setItem('resolver', JSON.stringify(resolver))
          message.success('Saved content to local storage')
        })
      }
      reader.readAsDataURL(file)
    } else {
      message.error('Please upload a zipped file')
    }
  }

  const props: UploadProps = {
    name: 'file',
    multiple: false,
    accept: 'zip',
    beforeUpload: beforeUpload,
    onChange: handleFileChange,
    onRemove: () => setFile(undefined),
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
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add Content
          </Button>
        </Form.Item>
      </Form>
    </>
  )
}

export default UploadSection
