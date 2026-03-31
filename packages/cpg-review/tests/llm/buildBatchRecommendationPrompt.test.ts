import { buildBatchRecommendationPrompt } from 'llm/buildBatchRecommendationPrompt'

describe('buildBatchRecommendationPrompt', () => {
  it('includes all item linkIds and deterministic keyed output schema', () => {
    const prompt = buildBatchRecommendationPrompt(
      [
        { linkId: 'item-1', text: 'Question 1', type: 'string' },
        { linkId: 'item-2', text: 'Question 2', type: 'choice', answerOption: [{ valueString: 'Yes' }] },
      ],
      {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [],
      }
    )

    expect(prompt).toContain('linkId=item-1')
    expect(prompt).toContain('linkId=item-2')
    expect(prompt).toContain('"recommendations"')
    expect(prompt).toContain('"<linkId>"')
    expect(prompt).toContain('answerOptions=[Yes]')
  })

  it('includes shared context summary once for the chunk', () => {
    const prompt = buildBatchRecommendationPrompt(
      [{ linkId: 'item-1', text: 'Question 1', type: 'string' }],
      {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: 'p-1',
              name: [{ given: ['Alex'], family: 'Doe' }],
              gender: 'male',
              birthDate: '1980-01-01',
            },
          },
          {
            resource: {
              resourceType: 'Observation',
              id: 'obs-1',
              status: 'final',
              code: { text: 'Heart Rate' },
              valueQuantity: { value: 85, unit: 'bpm' },
            },
          },
        ],
      },
      {
        resourceType: 'Questionnaire',
        status: 'active',
        title: 'Vitals Check',
      }
    )

    expect(prompt).toContain('Questionnaire title: Vitals Check')
    expect(prompt).toContain('Patient: Alex Doe, gender: male, birthDate: 1980-01-01')
    expect(prompt).toContain('Relevant normalized clinical entries:')
    expect(prompt).toContain('Observation | code=Heart Rate | value=85 bpm')
    expect(prompt).toContain('interpretation=none')
    expect(prompt).toContain('status=final')
    expect(prompt).toContain('provenance=Observation/obs-1 @ unknown')
  })
})
