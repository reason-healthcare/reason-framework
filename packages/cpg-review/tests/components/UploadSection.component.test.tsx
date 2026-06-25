import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadSection, { UploadSectionProps } from '@/components/UploadSection'

const mockPlanDefinition = {
  resourceType: 'PlanDefinition',
  id: 'test-plan',
  url: 'http://example.org/PlanDefinition/test-plan',
  title: 'Test Plan',
}

jest.mock('resolver/browser', () => ({
  __esModule: true,
  default: class MockBrowserResolver {
    resourcesByCanonical = {
      [mockPlanDefinition.url]: mockPlanDefinition,
    }
    resourcesByReference = {}

    async decompress() {
      return this
    }
  },
}))

const makeProps = (
  overrides: Partial<UploadSectionProps> = {}
): UploadSectionProps => ({
  setResolver: jest.fn(),
  setPlanDefinition: jest.fn(),
  resolver: undefined,
  packageTypePayload: 'file',
  setPackageTypePayload: jest.fn(),
  endpointPayload: undefined,
  setEndpointPayload: jest.fn(),
  fileList: [],
  setFileList: jest.fn(),
  planDefinitionSelectionOptions: undefined,
  setPlanDefinitionSelectionOptions: jest.fn(),
  planDefinitionPayload: undefined,
  setPlanDefinitionPayload: jest.fn(),
  setShowUploadPage: jest.fn(),
  ...overrides,
})

describe('UploadSection local file upload', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('processes accepted files in memory instead of posting to the page', async () => {
    const setResolver = jest.fn()
    const setPlanDefinitionSelectionOptions = jest.fn()
    const setFileList = jest.fn()

    const { container } = render(
      <UploadSection
        {...makeProps({
          setResolver,
          setPlanDefinitionSelectionOptions,
          setFileList,
        })}
      />
    )

    const input = container.querySelector('input[type="file"]')
    expect(input).not.toBeNull()

    await userEvent.upload(
      input as HTMLInputElement,
      new File(['fake package bytes'], 'package.r4.tgz', {
        type: 'application/gzip',
      })
    )

    await waitFor(() => {
      expect(setResolver).toHaveBeenCalledWith(
        expect.objectContaining({
          resourcesByCanonical: {
            [mockPlanDefinition.url]: mockPlanDefinition,
          },
        })
      )
    })

    expect(setFileList).toHaveBeenCalledWith([expect.any(File)])
    expect(setPlanDefinitionSelectionOptions).toHaveBeenCalledWith([
      expect.objectContaining({
        label: 'Test Plan',
        planDefinition: mockPlanDefinition,
        type: 'Plan Definition',
      }),
    ])
    expect(window.fetch).not.toHaveBeenCalled()
    expect(
      screen.getByText('Click or drag files to this area to upload')
    ).toBeInTheDocument()
  })
})
