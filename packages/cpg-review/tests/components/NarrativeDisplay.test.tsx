import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NarrativeDisplay from 'components/narrative-display/NarrativeDisplay'

const mockUseBuildForm = jest.fn((_params: unknown) => false)

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'mock-uuid'),
}))

jest.mock('@aehrc/smart-forms-renderer', () => ({
  __esModule: true,
  BaseRenderer: () => <div data-testid="base-renderer" />,
  RendererThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useBuildForm: (params: unknown) => mockUseBuildForm(params),
  useRendererQueryClient: jest.fn(() => ({})),
}))

jest.mock('@tanstack/react-query', () => ({
  __esModule: true,
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

jest.mock('highlight.js', () => ({
  __esModule: true,
  default: {
    highlightElement: jest.fn(),
  },
}))

describe('NarrativeDisplay questionnaire rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseBuildForm.mockReturnValue(false)
  })

  it('renders Questionnaire resources with the Smart Forms renderer in read-only mode', () => {
    const questionnaire: fhir4.Questionnaire = {
      resourceType: 'Questionnaire',
      id: 'q-1',
      title: 'Vitals Check',
      status: 'active',
      item: [
        { linkId: 'blood-pressure', text: 'Blood pressure', type: 'string' },
      ],
    }

    render(
      <MemoryRouter>
        <NarrativeDisplay
          resolver={undefined}
          setSelectedNode={jest.fn()}
          narrativeContent={{ resource: questionnaire }}
        />
      </MemoryRouter>
    )

    expect(screen.getByText('Questionnaire: Vitals Check')).toBeInTheDocument()
    expect(screen.getByTestId('base-renderer')).toBeInTheDocument()
    expect(mockUseBuildForm).toHaveBeenCalledWith({
      questionnaire: {
        ...questionnaire,
        item: [
          {
            ...questionnaire.item?.[0],
            readOnly: true,
          },
        ],
      },
      readOnly: false,
      rendererConfigOptions: {
        readOnlyVisualStyle: 'readonly',
      },
      qItemOverrideComponents: {},
    })
  })

  it('renders choice dropdowns through an inspect-only override while making fields read-only', () => {
    const questionnaire: fhir4.Questionnaire = {
      resourceType: 'Questionnaire',
      id: 'q-1',
      title: 'Vitals Check',
      status: 'active',
      item: [
        {
          linkId: 'vitals',
          text: 'Vitals',
          type: 'group',
          item: [
            {
              linkId: 'blood-pressure',
              text: 'Blood pressure',
              type: 'string',
            },
            {
              linkId: 'position',
              text: 'Position',
              type: 'choice',
              answerOption: [
                { valueString: 'Sitting' },
                { valueString: 'Standing' },
              ],
            },
          ],
        },
      ],
    }

    render(
      <MemoryRouter>
        <NarrativeDisplay
          resolver={undefined}
          setSelectedNode={jest.fn()}
          narrativeContent={{ resource: questionnaire }}
        />
      </MemoryRouter>
    )

    const buildFormParams = mockUseBuildForm.mock.calls[0][0] as {
      questionnaire: fhir4.Questionnaire
      qItemOverrideComponents: Record<string, React.ComponentType>
    }
    const builtQuestionnaire = buildFormParams.questionnaire
    const group = builtQuestionnaire.item?.[0]
    const stringItem = group?.item?.[0]
    const choiceItem = group?.item?.[1]
    const qItemOverrideComponents = buildFormParams.qItemOverrideComponents

    expect(mockUseBuildForm).toHaveBeenCalledWith(
      expect.objectContaining({
        readOnly: false,
        rendererConfigOptions: {
          readOnlyVisualStyle: 'readonly',
        },
        qItemOverrideComponents: expect.objectContaining({
          position: expect.any(Function),
        }),
      })
    )
    expect(group?.readOnly).toBeUndefined()
    expect(stringItem?.readOnly).toBe(true)
    expect(choiceItem?.readOnly).toBe(true)
    expect(qItemOverrideComponents['position']).toEqual(expect.any(Function))
    expect(questionnaire.item?.[0].item?.[0].readOnly).toBeUndefined()
  })

  it('keeps the JSON view available for Questionnaire resources', () => {
    const questionnaire: fhir4.Questionnaire = {
      resourceType: 'Questionnaire',
      id: 'q-1',
      title: 'Vitals Check',
      status: 'active',
      item: [
        { linkId: 'blood-pressure', text: 'Blood pressure', type: 'string' },
      ],
    }

    render(
      <MemoryRouter>
        <NarrativeDisplay
          resolver={undefined}
          setSelectedNode={jest.fn()}
          narrativeContent={{ resource: questionnaire }}
        />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('JSON'))

    expect(screen.queryByTestId('base-renderer')).not.toBeInTheDocument()
    expect(
      screen.getByText(/"resourceType": "Questionnaire"/)
    ).toBeInTheDocument()
  })
})
