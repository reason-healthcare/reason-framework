import Resolver from '../resolver'
import {
  inspect,
  is,
  notEmpty,
  resolveFromConfigurableEndpoints
} from '../helpers'
import { v4 as uuidv4 } from 'uuid'
import { EndpointConfiguration } from '../structure-definition/buildQuestionnaire'
import {
  SDC_QUESTIONNAIRE_ITEM_POPULATION_CONTEXT,
  SDC_QUESTIONNAIRE_ITEM_EXTRACTION_CONTEXT,
  VARIABLE,
  QUESTIONNAIRE_CONSTRAINT,
  CQF_LIBRARY,
  SDC_QUESTIONNAIRE_LAUNCH_CONTEXT,
  SDC_QUESTIONNAIRE_ASSEMBLE_EXPECTATION
} from '../constants'

export interface AssembleQuestionnaireArgs {
  questionnaire: fhir4.Questionnaire
  contentEndpoint?: fhir4.Endpoint | undefined
  artifactEndpointConfigurable?: EndpointConfiguration[] | undefined
}

export const assembleQuestionnaire = async (
  args: AssembleQuestionnaireArgs
): Promise<fhir4.Questionnaire | undefined> => {
  const { questionnaire, contentEndpoint, artifactEndpointConfigurable } = args
  const {
    id,
    meta,
    implicitRules,
    language,
    text,
    version,
    url,
    identifier,
    extension,
    item,
    contained
  } = questionnaire

  if (!is.Questionnaire(questionnaire)) {
    throw new Error(
      `questionnaire does not seem to be a FHIR StructureDefinition" ${inspect(
        questionnaire
      )}`
    )
  }

  const questionnaireAssembled = {
    ...questionnaire
  } as fhir4.Questionnaire

  delete questionnaireAssembled.contained

  // If stored, an assembled Questionnaire SHALL have the same URL as the base Questionnaire but must have a distinct version - typically either a UUID or "[version]-assembled.
  if (version != null) {
    questionnaireAssembled.version = `${version}-assembled`
  } else {
    questionnaireAssembled.version = uuidv4()
  }

  // Adjust or remove the assemble-expectation extension from the Questionnaire - because it no longer requires assembly
  if (extension != null) {
    const extensions = extension
      .map((ext) => {
        if (ext.url === SDC_QUESTIONNAIRE_ASSEMBLE_EXPECTATION) {
          if (ext.valueCode === 'assemble-root') {
            return undefined
          } else if (ext.valueCode?.includes('assemble')) {
            return {
              ...ext,
              valueCode: ext.valueCode.replace('assemble', 'independent')
            }
          } else if (ext.valueCode?.includes('assembly')) {
            return {
              ...ext,
              valueCode: ext.valueCode.replace('assembly', 'independent')
            }
          }
        }
        return ext
      })
      .filter(notEmpty)
    if (extensions?.length) {
      questionnaireAssembled.extension === extensions
    } else {
      delete questionnaireAssembled.extension
    }
  }

  // Add the assembledFrom extension, pointing to the canonical URL and version of the Questionnaire that was assembled.
  const assembledFromExt = {
    url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assembledFrom',
    valueCanonical: url
  }
  ;(questionnaireAssembled.extension ||= []).push(assembledFromExt)

  // TODO this should recurse to resolve nested sub-questionnaires
  // Resolve all subQuestionnaire extensions as described in the Modular Forms page. If there is an issue resolving any of the subQuestionnaires or applying the resolution process results in any errors, the operation SHOULD fail.
  if (item != null) {
    const items: (fhir4.QuestionnaireItem | fhir4.QuestionnaireItem[])[] =
      await Promise.all(
        item.map(async (i) => {
          const subQuestionnaireExtension = i.extension?.find(
            (e) =>
              e.url ===
              'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-subQuestionnaire'
          )

          if (
            subQuestionnaireExtension != null &&
            subQuestionnaireExtension.valueCanonical != null
          ) {
            let subQuestionnaireRaw
            if (contained != null && contained.length) {
              subQuestionnaireRaw = contained?.find(
                (resource) =>
                  is.Questionnaire(resource) &&
                  resource.url === subQuestionnaireExtension.valueCanonical
              )
            }
            if (subQuestionnaireRaw == null && contentEndpoint != null) {
              const resolver = Resolver(contentEndpoint)
              subQuestionnaireRaw = await resolver.resolveCanonical(
                subQuestionnaireExtension.valueCanonical
              )
            }
            if (
              subQuestionnaireRaw == null &&
              artifactEndpointConfigurable != null
            ) {
              subQuestionnaireRaw = await resolveFromConfigurableEndpoints(
                artifactEndpointConfigurable,
                subQuestionnaireExtension.valueCanonical
              )
            }

            let subQuestionnaire: fhir4.Questionnaire
            if (is.Questionnaire(subQuestionnaireRaw)) {
              subQuestionnaire = subQuestionnaireRaw as fhir4.Questionnaire
              if (subQuestionnaire.language !== language) {
                return {
                  ...i,
                  text: `Error: ${subQuestionnaireExtension.valueCanonical} language ${subQuestionnaire.language} does not match root questionnaire language ${language}`
                }
              }
              if (subQuestionnaire.implicitRules != null) {
                return {
                  ...i,
                  text: `Error: unable to process sub-questionnaire with ${subQuestionnaireExtension.valueCanonical} implicit rules`
                }
              }
              if (subQuestionnaire.modifierExtension != null) {
                return {
                  ...i,
                  text: `Error: unable to process sub-questionnaire with ${subQuestionnaireExtension.valueCanonical} modifier extension`
                }
              }
              if (subQuestionnaire.contained != null) {
                contained?.forEach((resource) => {
                  if (
                    !questionnaireAssembled.contained?.some(
                      (r) => resource.id === r.id
                    )
                  ) {
                    ;(questionnaireAssembled.contained ||= []).push(resource)
                  }
                })
              }
              const rootExtensions = [
                CQF_LIBRARY,
                SDC_QUESTIONNAIRE_LAUNCH_CONTEXT
              ]

              subQuestionnaire.extension?.forEach((e: fhir4.Extension) => {
                // propagate to the 'root' of the base Questionnaire
                if (
                  rootExtensions.includes(e.url) &&
                  !extension?.some((ext) => ext.url === e.url)
                ) {
                  ;(questionnaireAssembled.extension ||= []).push(e)
                }
                // propagate to the item that contains the 'display' item being substituted. (If the display item is at the root, then this will also be at the root.)
                if (
                  (e.url === VARIABLE &&
                    !questionnaireAssembled.extension?.some((ext) => {
                      ext.url === VARIABLE &&
                        ext.valueExpression === e.valueExpression
                    })) ||
                  e.url === QUESTIONNAIRE_CONSTRAINT
                ) {
                  ;(questionnaireAssembled.extension ||= []).push(e)
                } else if (
                  e.url === SDC_QUESTIONNAIRE_ITEM_POPULATION_CONTEXT ||
                  e.url === SDC_QUESTIONNAIRE_ITEM_EXTRACTION_CONTEXT
                ) {
                  if (
                    questionnaireAssembled.extension?.some((ext) => {
                      ext.url === e.url &&
                        ext.valueExpression === e.valueExpression
                    })
                  ) {
                    return {
                      ...i,
                      text: `Error: extension ${e.url} already exists. Cannot process ${subQuestionnaire.url}`
                    }
                  } else {
                    ;(questionnaireAssembled.extension ||= []).push(e)
                  }
                }
              })

              if (subQuestionnaire.item != null) {
                return subQuestionnaire.item
              } else {
                return {
                  ...i,
                  text: `Error: ${subQuestionnaire.url} does not contain items for substitution`
                }
              }
            } else {
              return {
                ...i,
                text: `Error: ${subQuestionnaireExtension.valueCanonical} does not seem to be a FHIR Questionnaire`
              }
            }
          } else {
            return i
          }
        })
      )
    questionnaireAssembled.item = items.flat()
  }

  /** TODO: handle link IDS
   * It is also an error if the resulting fully-assembled Questionnaire has any duplicate linkIds.
    In order to avoid duplicate linkIds, a parent Questionnaire MAY declare a special variable with the name linkIdPrefix. If there is a linkIdPrefix in context at the time a subQuestionnaire is substituted, that linkIdPrefix SHALL be pre-pended to the linkId and enableWhen.question elements of all items in that Questionnaire. See the examples to see how this works in practice. If linkIdPrefix is not used, care should be taken to ensure that linkIds are appropriately coordinated to avoid overlap across all referenced Questionnaires
   */

  // Optionally, check the resulting Questionnaire to ensure that it is valid according to the base Questionnaire and possibly any declared profiles. If the resulting Questionnaire is not valid, return a warning.
  if (is.Questionnaire(questionnaireAssembled)) {
    return questionnaireAssembled
  } else {
    console.warn('Unable to produce assembled questionnaire')
  }
}
