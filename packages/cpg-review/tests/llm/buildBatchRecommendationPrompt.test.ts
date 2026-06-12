import { buildBatchRecommendationPrompt } from 'llm/buildBatchRecommendationPrompt'

describe('buildBatchRecommendationPrompt', () => {
  it('includes all item linkIds and deterministic keyed output schema', async () => {
    const prompt = await buildBatchRecommendationPrompt(
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
    expect(prompt).toContain('"confidence":"high|medium|low"')
    expect(prompt).toContain('Confidence must be one of: "high", "medium", or "low".')
    expect(prompt).toContain('Prefer "medium" or "low" when evidence is sparse')
  })

  it('includes shared context summary once for the chunk', async () => {
    const prompt = await buildBatchRecommendationPrompt(
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

  it('includes decoded DocumentReference attachment text excerpt in shared context', async () => {
    const prompt = await buildBatchRecommendationPrompt(
      [{ linkId: 'item-1', text: 'Question 1', type: 'string' }],
      {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'DocumentReference',
              id: 'doc-1',
              status: 'current',
              type: { text: 'Progress Note' },
              date: '2026-05-02',
              content: [
                {
                  attachment: {
                    contentType: 'text/plain',
                    data: Buffer.from('Patient reports improved appetite and sleep.', 'utf8').toString('base64'),
                    title: 'note.txt',
                  },
                },
              ],
            },
          },
        ],
      }
    )

    expect(prompt).toContain('DocumentReference')
    expect(prompt).toContain('attachmentMime=text/plain')
    expect(prompt).toContain('attachmentTextExcerpt=Patient reports improved appetite and sleep.')
  })
})
