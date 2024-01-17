import Resolver from "./resolver"
import { set } from "./expression"
import { is } from './helpers'
import { v4 as uuidv4 } from 'uuid'

export interface AssembleQuestionnaireArgs {
  questionnaire: fhir4.Questionnaire,
  contentEndpoint: fhir4.Endpoint
}

export const assembleQuestionnaire = async (
  args: AssembleQuestionnaireArgs,
): Promise<fhir4.Questionnaire | undefined> => {
  const {
    questionnaire,
    contentEndpoint
  } = args

  const {
    version,
    url,
    extension,
    item
  } = questionnaire

  // If stored, an assembled Questionnaire SHALL have the same URL as the base Questionnaire but must have a distinct version - typically either a UUID or "[version]-assembled.
  if (version) {
    set(questionnaire, 'version', `${version}-assembled`);
  } else {
    set(questionnaire, 'version', uuidv4())
  }

  // Resolve all subQuestionnaire extensions as described in the Modular Forms page. If there is an issue resolving any of the subQuestionnaires or applying the reolution process results in any errors, the operation SHOULD fail.
  const contentResolver = Resolver(contentEndpoint)
  const updatedItems: fhir4.QuestionnaireItem[] = [];
  if (item) {
    // This will only work with sub questionnaires at root (not nested) which is the expected structure returned from $questionnaire
    for (const i of item) {
      const subQuestionnaireExtension = i.extension?.find(e => e.url === "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-subQuestionnaire")

      if (subQuestionnaireExtension?.valueCanonical) {
        const subQuestionnaire = await contentResolver.resolveCanonical(subQuestionnaireExtension.valueCanonical)

        const rootExtensions = ["http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemPopulationContext", "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext", "http://hl7.org/fhir/StructureDefinition/variable", "http://hl7.org/fhir/StructureDefinition/cqf-library", "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext"]

        subQuestionnaire.extension?.forEach((e: fhir4.Extension) => {
          if (rootExtensions.includes(e.url) && !extension?.some(ext => ext.url === e.url)) {
            extension?.push(e) || set(questionnaire, 'extension', e)
          }
        })

        if (subQuestionnaire?.item) {
          subQuestionnaire.item.forEach((item: fhir4.QuestionnaireItem) => updatedItems.push(item))
        } else {
          console.warn('Unable to resolve sub-questionnaire')
        }
      } else {
        updatedItems.push(i)
      }
    }
  }

  if (updatedItems.length > 0) {
    set(questionnaire, 'item', updatedItems);
  }

  // Adjust or remove the assemble-expectation extension from the Questionnaire - because it no longer requires assembly
  if (extension) {
    const assembleExpectationIndex = extension.findIndex(e => e.url === "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assemble-expectation")
    const assembleExpectationCode = extension[assembleExpectationIndex].valueCode
    if (assembleExpectationCode === "assemble-root") {
      extension.splice(assembleExpectationIndex, 1)
    } else if (assembleExpectationCode?.includes("assemble")) {
      set(questionnaire, `${extension[assembleExpectationIndex]}.valueCode`, assembleExpectationCode.replace("assemble", "independent"))
    }
  }

  // Add the assembledFrom extension, pointing to the canonical URL and version of the Questionnaire that was assembled.
  const assembledFromExt = {
    url: 	"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assembledFrom",
    valueCanonical: url
  }
  extension?.push(assembledFromExt) || set(questionnaire, 'extension', [assembledFromExt])

  // Optionally, check the resulting Questionnaire to ensure that it is valid according to the base Questionnaire and possibly any declared profiles. If the resulting Questionnaire is not valid, return a warning.
  if (is.Questionnaire(questionnaire)) {
    return questionnaire
  } else {
    console.warn("Unable to produce assembled questionnaire")
  }
}