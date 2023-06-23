export interface CreateQuestionnaireArgs {
  structureDefinition: fhir4.StructureDefinition,
  supportedOnly?: boolean | undefined
}

export const createQuestionnaire = async (
  args: CreateQuestionnaireArgs
): Promise<fhir4.Questionnaire | undefined> => {
  const {
    structureDefinition,
    supportedOnly,
  } = args

  // get only differential elements and snapshot required elements
  let elements = structureDefinition?.differential?.element
  const snapshotRequiredElements = structureDefinition.snapshot?.element.filter((element) => element.min !== undefined && element.min > 0)

  if (elements && snapshotRequiredElements) {
    elements?.concat(snapshotRequiredElements)
  } else {
    elements = snapshotRequiredElements
  }

  console.log(elements)

  if (supportedOnly === true) {
    // filter through differential elements to see which are must support: true
    // use these elements to map to questions
  }

  return
}
