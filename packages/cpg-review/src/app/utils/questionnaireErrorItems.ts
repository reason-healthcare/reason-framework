/**
 * The CQL engine reports item-generation failures by emitting a `display` item
 * whose text is the raw error message, which renders as unremarkable body copy
 * indistinguishable from a question label.
 *
 * These helpers tag those items with the standard SDC `rendering-xhtml`
 * extension so the renderer draws them as an error callout instead. Styling is
 * presentation-only: item structure, ordering and text are left untouched, and
 * the questionnaire submitted back to the server is unaffected.
 */

const RENDERING_XHTML_URL =
  'http://hl7.org/fhir/StructureDefinition/rendering-xhtml'

const ERROR_TEXT_PATTERN = /^An error occurred/i

type AnyItem = {
  linkId?: string
  type?: string
  text?: string
  /**
   * The primitive element paired with `text`. `rendering-xhtml` belongs here
   * rather than on the item itself, and the renderer only reads it from here.
   */
  _text?: { extension?: fhir4.Extension[] }
  item?: AnyItem[]
}

/**
 * True when an item is a generated error placeholder rather than a real
 * question. Response items carry no `type`, so the text is the only reliable
 * signal on that side of the pair.
 */
export const isGeneratedErrorItem = (item: AnyItem) =>
  typeof item.text === 'string' &&
  ERROR_TEXT_PATTERN.test(item.text.trim()) &&
  (item.type == null || item.type === 'display')

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * The engine supplies no reference to what failed — an error item carries only
 * a `linkId` and the message — so the same failing expression yields byte
 * identical text once per affected item.
 *
 * What separates them is where they sit. A questionnaire item is generated per
 * action `input`, in order, so a failed input's error item directly follows the
 * item(s) generated for that action's other inputs. The nearest preceding
 * sibling group therefore names the same action, and its text is what tells two
 * otherwise identical errors apart.
 *
 * This is positional, so it is only offered as context when a preceding sibling
 * group actually carries text; otherwise the callout shows the message alone
 * rather than asserting a relationship that cannot be established.
 */
export const errorItemContext = (
  items: AnyItem[],
  index: number,
  groupText?: string
): string | undefined => {
  for (let i = index - 1; i >= 0; i--) {
    const previous = items[i]
    if (isGeneratedErrorItem(previous)) {
      continue
    }
    if (previous.type === 'group' && previous.text) {
      return previous.text
    }
    break
  }

  return groupText
}

/**
 * A callout: error symbol, the context label when one could be established,
 * then the message. Inline SVG keeps the markup self-contained, since the
 * renderer parses this string in isolation.
 */
const errorCalloutXhtml = (message: string, context?: string) =>
  `<div xmlns="http://www.w3.org/1999/xhtml" class="questionnaire-error-callout" role="alert">` +
  `<svg class="questionnaire-error-callout-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">` +
  `<circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>` +
  `<path d="M8 4.5v4.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>` +
  `<circle cx="8" cy="11.4" r="0.9" fill="currentColor"/>` +
  `</svg>` +
  `<span class="questionnaire-error-callout-body">` +
  (context
    ? `<span class="questionnaire-error-callout-label">${escapeHtml(
        context
      )}</span>`
    : '') +
  `<span class="questionnaire-error-callout-message">${escapeHtml(
    message
  )}</span>` +
  `</span>` +
  `</div>`

const hasRenderingXhtml = (item: AnyItem) =>
  item._text?.extension?.some(
    (extension) => extension.url === RENDERING_XHTML_URL
  ) === true

const styleItems = (
  items: AnyItem[] | undefined,
  groupText?: string
): AnyItem[] | undefined => {
  if (items == null) {
    return undefined
  }

  return items.map((item, index) => {
    const styled =
      isGeneratedErrorItem(item) && !hasRenderingXhtml(item)
        ? {
            ...item,
            _text: {
              ...item._text,
              extension: [
                ...(item._text?.extension ?? []),
                {
                  url: RENDERING_XHTML_URL,
                  valueString: errorCalloutXhtml(
                    (item.text as string).trim(),
                    errorItemContext(items, index, groupText)
                  ),
                },
              ],
            },
          }
        : item

    return styled.item != null
      ? { ...styled, item: styleItems(styled.item, styled.text) }
      : styled
  })
}

/**
 * Returns a copy of the resource with generated error items marked up as
 * callouts. The original is returned unchanged when it has no items, so callers
 * can pass through undefined resources safely.
 */
export const styleQuestionnaireErrors = <T extends { item?: AnyItem[] }>(
  resource: T | undefined
): T | undefined => {
  if (resource?.item == null) {
    return resource
  }

  return { ...resource, item: styleItems(resource.item) }
}
