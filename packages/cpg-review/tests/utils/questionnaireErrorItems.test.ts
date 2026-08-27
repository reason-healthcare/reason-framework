import {
  styleQuestionnaireErrors,
  isGeneratedErrorItem,
  errorItemContext,
} from 'utils/questionnaireErrorItems'

const RENDERING_XHTML_URL =
  'http://hl7.org/fhir/StructureDefinition/rendering-xhtml'

const ERROR =
  'An error occurred during item creation: No resource of type Library found for url: http://example.org/Library/LastCbcPanelReportDateLogic|null'

// the renderer reads `rendering-xhtml` from the `_text` primitive element
const xhtmlOf = (item: any) =>
  item?._text?.extension?.find((e: any) => e.url === RENDERING_XHTML_URL)
    ?.valueString

describe('isGeneratedErrorItem', () => {
  it('matches generated display errors', () => {
    expect(isGeneratedErrorItem({ type: 'display', text: ERROR })).toBe(true)
  })

  it('matches response items, which carry no type', () => {
    expect(isGeneratedErrorItem({ text: ERROR })).toBe(true)
  })

  it('ignores real questions and unrelated display text', () => {
    expect(isGeneratedErrorItem({ type: 'boolean', text: ERROR })).toBe(false)
    expect(
      isGeneratedErrorItem({ type: 'display', text: 'Select a status' })
    ).toBe(false)
  })
})

describe('styleQuestionnaireErrors', () => {
  it('marks up every error item as a callout, keeping all items and order', () => {
    const questionnaire = {
      resourceType: 'Questionnaire',
      item: [
        { linkId: '1', type: 'group', text: 'ActiveMethotrexateFeature' },
        { linkId: '2', type: 'display', text: ERROR },
        { linkId: '3', type: 'group', text: 'ActiveSulfasalazineFeature' },
        { linkId: '4', type: 'display', text: ERROR },
      ],
    }

    const result = styleQuestionnaireErrors(questionnaire)

    // nothing is removed — repeats are styled, not deduped
    expect(result?.item?.map((i: any) => i.linkId)).toEqual(['1', '2', '3', '4'])
    expect(xhtmlOf(result?.item?.[1])).toContain('questionnaire-error-callout')
    expect(xhtmlOf(result?.item?.[3])).toContain('questionnaire-error-callout')
    expect(xhtmlOf(result?.item?.[0])).toBeUndefined()
    expect(xhtmlOf(result?.item?.[2])).toBeUndefined()
  })

  it('gives repeated errors a distinct label so they are not identical', () => {
    const result = styleQuestionnaireErrors({
      item: [
        { linkId: '1', type: 'group', text: 'ActiveMethotrexateFeature' },
        { linkId: '2', type: 'display', text: ERROR },
        { linkId: '3', type: 'group', text: 'ActiveSulfasalazineFeature' },
        { linkId: '4', type: 'display', text: ERROR },
      ],
    })

    const first = xhtmlOf(result?.item?.[1])
    const second = xhtmlOf(result?.item?.[3])
    // each error names the group generated from the same action's other input
    expect(first).toContain('ActiveMethotrexateFeature')
    expect(second).toContain('ActiveSulfasalazineFeature')
    expect(first).not.toEqual(second)
  })

  it('falls back to the enclosing group when there is no preceding sibling', () => {
    const result = styleQuestionnaireErrors({
      item: [
        {
          linkId: '1',
          type: 'group',
          text: 'MonitoringTests',
          item: [{ linkId: '1.1', type: 'display', text: ERROR }],
        },
      ],
    })

    expect(xhtmlOf((result?.item?.[0] as any).item[0])).toContain(
      'MonitoringTests'
    )
  })

  it('omits the label rather than asserting an unknown relationship', () => {
    const result = styleQuestionnaireErrors({
      item: [{ linkId: '1', type: 'display', text: ERROR }],
    })

    expect(xhtmlOf(result?.item?.[0])).not.toContain(
      'questionnaire-error-callout-label'
    )
  })

  it('includes an error symbol and the original message', () => {
    const result = styleQuestionnaireErrors({
      item: [{ linkId: '1', type: 'display', text: ERROR }],
    })

    const xhtml = xhtmlOf(result?.item?.[0])
    expect(xhtml).toContain('<svg')
    expect(xhtml).toContain('questionnaire-error-callout-icon')
    expect(xhtml).toContain('role="alert"')
    expect(xhtml).toContain('No resource of type Library found')
  })

  it('escapes markup in the message', () => {
    const result = styleQuestionnaireErrors({
      item: [
        {
          linkId: '1',
          type: 'display',
          text: 'An error occurred: <script>alert("x")</script>',
        },
      ],
    })

    const xhtml = xhtmlOf(result?.item?.[0])
    expect(xhtml).not.toContain('<script>')
    expect(xhtml).toContain('&lt;script&gt;')
  })

  it('styles errors nested inside groups, leaving questions alone', () => {
    const result = styleQuestionnaireErrors({
      item: [
        {
          linkId: '1',
          type: 'group',
          item: [
            { linkId: '1.1', type: 'boolean', text: 'Observation.value[x]' },
            { linkId: '1.2', type: 'display', text: ERROR },
          ],
        },
      ],
    })

    const nested = (result?.item?.[0] as any).item
    expect(nested.map((i: any) => i.linkId)).toEqual(['1.1', '1.2'])
    expect(xhtmlOf(nested[0])).toBeUndefined()
    expect(xhtmlOf(nested[1])).toContain('questionnaire-error-callout')
  })

  it('preserves existing extensions and does not double-apply', () => {
    const existing = { url: 'http://example.org/other', valueString: 'keep' }
    const once = styleQuestionnaireErrors({
      item: [
        {
          linkId: '1',
          type: 'display',
          text: ERROR,
          _text: { extension: [existing] },
        },
      ],
    })
    expect(once?.item?.[0]._text?.extension).toHaveLength(2)
    expect(once?.item?.[0]._text?.extension?.[0]).toEqual(existing)

    const twice = styleQuestionnaireErrors(once)
    expect(twice?.item?.[0]._text?.extension).toHaveLength(2)
  })

  it('passes through resources with no items', () => {
    expect(styleQuestionnaireErrors(undefined)).toBeUndefined()

    const empty: fhir4.Questionnaire = {
      resourceType: 'Questionnaire',
      status: 'draft',
    }
    expect(styleQuestionnaireErrors(empty)).toEqual(empty)
  })

  it('does not mutate the input', () => {
    const questionnaire = {
      item: [{ linkId: '1', type: 'display', text: ERROR }],
    }

    styleQuestionnaireErrors(questionnaire)

    expect((questionnaire.item[0] as any)._text).toBeUndefined()
  })
})

describe('errorItemContext', () => {
  const group = (text: string) => ({ type: 'group', text })

  it('uses the nearest preceding sibling group', () => {
    const items = [group('ActiveMethotrexateFeature'), { type: 'display', text: ERROR }]
    expect(errorItemContext(items, 1)).toBe('ActiveMethotrexateFeature')
  })

  it('skips over other error items to reach that group', () => {
    const items = [
      group('ActiveMethotrexateFeature'),
      { type: 'display', text: ERROR },
      { type: 'display', text: ERROR },
    ]
    expect(errorItemContext(items, 2)).toBe('ActiveMethotrexateFeature')
  })

  it('does not reach past a non-group item', () => {
    const items = [
      group('ActiveMethotrexateFeature'),
      { type: 'boolean', text: 'Observation.value[x]' },
      { type: 'display', text: ERROR },
    ]
    expect(errorItemContext(items, 2)).toBeUndefined()
  })

  it('falls back to the enclosing group when there is no preceding sibling', () => {
    expect(errorItemContext([{ type: 'display', text: ERROR }], 0, 'Parent')).toBe(
      'Parent'
    )
  })

  it('returns nothing when no context can be established', () => {
    expect(errorItemContext([{ type: 'display', text: ERROR }], 0)).toBeUndefined()
  })
})
