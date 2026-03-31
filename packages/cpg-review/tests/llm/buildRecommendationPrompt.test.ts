import { buildRecommendationPrompt } from 'llm/buildRecommendationPrompt'

describe('buildRecommendationPrompt', () => {
  it('includes item text, linkId, and answer options when present', () => {
    const item: fhir4.QuestionnaireItem = {
      linkId: 'item-1',
      text: 'Smoking status',
      type: 'choice',
      answerOption: [
        { valueString: 'Current smoker' },
        { valueString: 'Former smoker' },
      ],
    }

    const prompt = buildRecommendationPrompt(item, {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [],
    })

    expect(prompt).toContain('Questionnaire item linkId: item-1')
    expect(prompt).toContain('Questionnaire item text: Smoking status')
    expect(prompt).toContain('Current smoker')
    expect(prompt).toContain('Former smoker')
  })

  it('instructs free-text output when no answer options exist', () => {
    const prompt = buildRecommendationPrompt(
      {
        linkId: 'item-2',
        text: 'Clinical notes',
        type: 'string',
      },
      {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [],
      }
    )

    expect(prompt).toContain('No fixed answer options are provided')
    expect(prompt).toContain('Respond ONLY as valid JSON')
  })

  it('handles an empty context bundle without throwing', () => {
    const item: fhir4.QuestionnaireItem = {
      linkId: 'item-3',
      text: 'Age',
      type: 'integer',
    }

    expect(() =>
      buildRecommendationPrompt(item, {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [],
      })
    ).not.toThrow()

    const prompt = buildRecommendationPrompt(item, {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [],
    })
    expect(prompt).toContain('Patient demographics: not available')
    expect(prompt).not.toContain('raw JSON snippets')
  })

  it('includes questionnaire title when provided', () => {
    const prompt = buildRecommendationPrompt(
      {
        linkId: 'item-4',
        text: 'Blood pressure control status',
        type: 'string',
      },
      {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [],
      },
      {
        resourceType: 'Questionnaire',
        status: 'active',
        title: 'Hypertension Follow-up',
      }
    )

    expect(prompt).toContain('Questionnaire title: Hypertension Follow-up')
  })

  it('includes normalized Observation fields with provenance', () => {
    const prompt = buildRecommendationPrompt(
      {
        linkId: 'obs-item',
        text: 'What is the blood pressure status?',
        type: 'string',
      },
      {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'Observation',
              id: 'obs-1',
              status: 'final',
              code: {
                text: 'Systolic blood pressure',
              },
              valueQuantity: {
                value: 140,
                unit: 'mmHg',
              },
              effectiveDateTime: '2026-03-31T12:00:00Z',
              interpretation: [{ text: 'High' }],
            },
          },
        ],
      }
    )

    expect(prompt).toContain('Observation | code=Systolic blood pressure')
    expect(prompt).toContain('value=140 mmHg')
    expect(prompt).toContain('effective=2026-03-31T12:00:00Z')
    expect(prompt).toContain('interpretation=High')
    expect(prompt).toContain('status=final')
    expect(prompt).toContain('provenance=Observation/obs-1 @ 2026-03-31T12:00:00Z')
  })

  it('includes normalized Condition fields with provenance', () => {
    const prompt = buildRecommendationPrompt(
      {
        linkId: 'condition-item',
        text: 'What condition is active?',
        type: 'string',
      },
      {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'Condition',
              id: 'cond-1',
              code: { text: 'Hypertension' },
              clinicalStatus: { coding: [{ code: 'active' }] },
              verificationStatus: { coding: [{ code: 'confirmed' }] },
              onsetDateTime: '2025-01-01',
              severity: { text: 'moderate' },
              recordedDate: '2025-01-15',
              subject: { reference: 'Patient/p1' },
            },
          },
        ],
      }
    )

    expect(prompt).toContain('Condition | code=Hypertension')
    expect(prompt).toContain('clinicalStatus=active')
    expect(prompt).toContain('verificationStatus=confirmed')
    expect(prompt).toContain('onset=2025-01-01')
    expect(prompt).toContain('severity=moderate')
    expect(prompt).toContain('provenance=Condition/cond-1 @ 2025-01-15')
  })

  it('includes normalized MedicationStatement fields with provenance', () => {
    const prompt = buildRecommendationPrompt(
      {
        linkId: 'med-item',
        text: 'Current medication',
        type: 'string',
      },
      {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'MedicationStatement',
              id: 'med-1',
              status: 'active',
              medicationCodeableConcept: { text: 'Lisinopril' },
              dosage: [{ text: '10 mg once daily' }],
              effectivePeriod: { start: '2026-01-01', end: '2026-12-31' },
              subject: { reference: 'Patient/p1' },
            },
          },
        ],
      }
    )

    expect(prompt).toContain('MedicationStatement | medication=Lisinopril')
    expect(prompt).toContain('status=active')
    expect(prompt).toContain('dosage=10 mg once daily')
    expect(prompt).toContain('effectivePeriod=2026-01-01 to 2026-12-31')
    expect(prompt).toContain('provenance=MedicationStatement/med-1 @ 2026-01-01')
  })

  it('includes normalized AllergyIntolerance fields with provenance', () => {
    const prompt = buildRecommendationPrompt(
      {
        linkId: 'allergy-item',
        text: 'Allergy summary',
        type: 'string',
      },
      {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'AllergyIntolerance',
              id: 'alg-1',
              code: { text: 'Penicillin' },
              criticality: 'high',
              reaction: [
                {
                  manifestation: [{ text: 'Rash' }, { text: 'Anaphylaxis' }],
                },
              ],
              recordedDate: '2024-05-10',
              patient: { reference: 'Patient/p1' },
            },
          },
        ],
      }
    )

    expect(prompt).toContain('AllergyIntolerance | substance=Penicillin')
    expect(prompt).toContain('criticality=high')
    expect(prompt).toContain('reactionManifestations=Rash, Anaphylaxis')
    expect(prompt).toContain('provenance=AllergyIntolerance/alg-1 @ 2024-05-10')
  })

})
