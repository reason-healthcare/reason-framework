import { Link, NavigateFunction, useNavigate } from 'react-router-dom'
import BrowserResolver from 'resolver/browser'
import { v4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import SingleDisplayItem from './components/narrative-display/SingleDisplayItem'
import ListDisplayItem from './components/narrative-display/ListDisplayItem'

export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  return value !== null && value !== undefined
}

export type KnowledgeArtifact =
  | fhir4.PlanDefinition
  | fhir4.ActivityDefinition
  | fhir4.Library
export type TerminologyArtifact = fhir4.ValueSet | fhir4.CodeSystem

export const is = {
  FhirResource: (resource: any): resource is fhir4.FhirResource => {
    return resource?.resourceType != null
  },
  PlanDefinition: (resource: any): resource is fhir4.PlanDefinition => {
    return resource?.resourceType === 'PlanDefinition'
  },
  Questionnaire: (resource: any): resource is fhir4.Questionnaire => {
    return resource?.resourceType === 'Questionnaire'
  },
  PlanDefinitionAction: (object: any): object is fhir4.PlanDefinitionAction => {
    const keys = [
      'action',
      'cardinalityBehavior',
      '_cardinalityBehavior',
      'code',
      'condition',
      'definitionCanonical',
      '_definitionCanonical',
      'definitionUri',
      '_definitionUri',
      'description',
      '_description',
      'documentation',
      'dynamicValue',
      'goalId',
      '_goalId',
      'groupingBehavior',
      '_groupingBehavior',
      'input',
      'output',
      'participant',
      'precheckBehavior',
      '_precheckBehavior',
      'prefix',
      '_prefix',
      'priority',
      '_priority',
      'reason',
      'relatedAction',
      'requiredBehavior',
      '_requiredBehavior',
      'selectionBehavior',
      '_selectionBehavior',
      'subjectCodeableConcept',
      'subjectReference',
      'textEquivalent',
      '_textEquivalent',
      'timingDateTime',
      '_timingDateTime',
      'timingAge',
      'timingPeriod',
      'timingDuration',
      'timingRange',
      'timingTiming',
      'title',
      '_title',
      'transform',
      '_transform',
      'trigger',
      'type',
    ]

    return (
      object &&
      Object.keys(object).every((key) => keys.includes(key)) &&
      (Array.isArray(object.action) || object.action === undefined) &&
      (typeof object.cardinalityBehavior === 'string' ||
        object.cardinalityBehavior === undefined) &&
      (Array.isArray(object.code) || object.code === undefined) &&
      (Array.isArray(object.condition) || object.condition === undefined) &&
      (typeof object.definitionCanonical === 'string' ||
        object.definitionCanonical === undefined) &&
      (typeof object.definitionUri === 'string' ||
        object.definitionUri === undefined) &&
      (typeof object.description === 'string' ||
        object.description === undefined) &&
      (Array.isArray(object.documentation) ||
        object.documentation === undefined) &&
      (Array.isArray(object.dynamicValue) ||
        object.dynamicValue === undefined) &&
      (Array.isArray(object.goalId) || object.goalId === undefined) &&
      (typeof object.groupingBehavior === 'string' ||
        object.groupingBehavior === undefined) &&
      (Array.isArray(object.input) || object.input === undefined) &&
      (Array.isArray(object.output) || object.output === undefined) &&
      (Array.isArray(object.participant) || object.participant === undefined) &&
      (typeof object.precheckBehavior === 'string' ||
        object.precheckBehavior === undefined) &&
      (typeof object.prefix === 'string' || object.prefix === undefined) &&
      (typeof object.priority === 'string' || object.priority === undefined) &&
      (Array.isArray(object.reason) || object.reason === undefined) &&
      (Array.isArray(object.relatedAction) ||
        object.relatedAction === undefined) &&
      (typeof object.requiredBehavior === 'string' ||
        object.requiredBehavior === undefined) &&
      (typeof object.selectionBehavior === 'string' ||
        object.selectionBehavior === undefined) &&
      (typeof object.subjectCodeableConcept === 'object' ||
        object.subjectCodeableConcept === undefined) &&
      (typeof object.subjectReference === 'object' ||
        object.subjectReference === undefined) &&
      (typeof object.textEquivalent === 'string' ||
        object.textEquivalent === undefined) &&
      (typeof object.timingDateTime === 'string' ||
        object.timingDateTime === undefined) &&
      (typeof object.timingAge === 'object' ||
        object.timingAge === undefined) &&
      (typeof object.timingPeriod === 'object' ||
        object.timingPeriod === undefined) &&
      (typeof object.timingDuration === 'object' ||
        object.timingDuration === undefined) &&
      (typeof object.timingRange === 'object' ||
        object.timingRange === undefined) &&
      (typeof object.timingTiming === 'object' ||
        object.timingTiming === undefined) &&
      (typeof object.title === 'string' || object.title === undefined) &&
      (typeof object.transform === 'string' ||
        object.transform === undefined) &&
      (Array.isArray(object.trigger) || object.trigger === undefined) &&
      (typeof object.type === 'object' || object.type === undefined)
    )
  },
  ActivityDefinition: (resource: any): resource is fhir4.ActivityDefinition => {
    return resource?.resourceType === 'ActivityDefinition'
  },
  Bundle: (resource: any): resource is fhir4.Bundle => {
    return resource?.resourceType === 'Bundle'
  },
  Library: (resource: any): resource is fhir4.Library => {
    return resource?.resourceType === 'Library'
  },
  CodeSystem: (resource: any): resource is fhir4.CodeSystem => {
    return resource?.resourceType === 'CodeSystem'
  },
  ValueSet: (resource: any): resource is fhir4.ValueSet => {
    return resource?.resourceType === 'ValueSet'
  },
  StructureDefinition: (
    resource: any
  ): resource is fhir4.StructureDefinition => {
    return resource?.resourceType === 'StructureDefinition'
  },
  KnowledgeArtifact: (resource: any): resource is KnowledgeArtifact => {
    return (
      is.PlanDefinition(resource) ||
      is.ActivityDefinition(resource) ||
      is.Library(resource)
    )
  },
  TerminologyArtifact: (resource: any): resource is TerminologyArtifact => {
    return is.ValueSet(resource) || is.CodeSystem(resource)
  },
  Coding: (object: any): object is fhir4.Coding => {
    const keys = [
      'code',
      '_code',
      'display',
      '_display',
      'system',
      '_system',
      'userSelected',
      '_userSelected',
      'version',
      '_version',
    ]
    return (
      object &&
      Object.keys(object).every((k) => keys.includes(k)) &&
      (typeof object.code === 'string' || object.code === undefined) &&
      (typeof object._code === 'object' || object._code === undefined) &&
      (typeof object.display === 'string' || object.display === undefined) &&
      (typeof object._display === 'object' || object._display === undefined) &&
      (typeof object.system === 'string' || object.system === undefined) &&
      (typeof object._system === 'object' || object._system === undefined) &&
      (typeof object.userSelected === 'boolean' ||
        object.userSelected === undefined) &&
      (typeof object._userSelected === 'object' ||
        object._userSelected === undefined) &&
      (typeof object.version === 'string' || object.version === undefined) &&
      (typeof object._version === 'object' || object._version === undefined)
    )
  },
  CodeableConcept: (object: any): object is fhir4.CodeableConcept => {
    const keys = ['coding', 'text', '_text']
    return (
      object &&
      Object.keys(object).every((k) => keys.includes(k)) &&
      (Array.isArray(object.coding) || object.coding === undefined) &&
      (typeof object.text === 'string' || object.text === undefined) &&
      (typeof object._text === 'object' || object._text === undefined) &&
      (object.coding === undefined ||
        object.coding.every((c: any) => is.Coding(c)))
    )
  },
  Extension: (object: any): object is fhir4.Extension => {
    const keys = typeof object === 'object' ? Object.keys(object) : null
    return (
      typeof object === 'object' &&
      object.url &&
      typeof object.url === 'string' &&
      keys?.find((k) => k.startsWith('value')) &&
      keys.length == 2
    )
  },
  Expression: (object: any): object is fhir4.Expression => {
    const keys = [
      'description',
      '_description',
      'expression',
      '_expression',
      'language',
      '_language',
      'name',
      '_name',
      'reference',
      '_reference',
    ]
    return (
      object &&
      Object.keys(object).every((key) => keys.includes(key)) &&
      (typeof object.description === 'string' ||
        object.description === undefined) &&
      (typeof object._description === 'object' ||
        object._description === undefined) &&
      (typeof object.name === 'string' || object.name === undefined) &&
      (typeof object._name === 'object' || object._name === undefined) &&
      (typeof object.language === 'string' || object.language === undefined) &&
      (typeof object._language === 'object' ||
        object._language === undefined) &&
      (typeof object.expression === 'string' ||
        object.expression === undefined) &&
      (typeof object._expression === 'object' ||
        object._expression === undefined) &&
      (typeof object.reference === 'string' ||
        object.reference === undefined) &&
      (typeof object._reference === 'object' || object._reference === undefined)
    )
  },
  Condition: (object: any): object is fhir4.PlanDefinitionActionCondition => {
    const keys = ['expression', 'kind', '_kind']
    return (
      object &&
      Object.keys(object).every((key) => keys.includes(key)) &&
      (typeof object.kind === 'string' || object.kind === undefined) &&
      (typeof object._kind === 'object' || object._kind === undefined) &&
      (typeof object.expression === 'object' || object.expression === undefined)
    )
  },
  DataRequirement: (object: any): object is fhir4.DataRequirement => {
    const keys = [
      'codeFilter',
      'dateFilter',
      'limit',
      'mustSupport',
      '_mustSupport',
      'profile',
      '_profile',
      'sort',
      'subjectCodeableConcept',
      'subjectReference',
      'type',
      '_type',
    ]
    return (
      object &&
      Object.keys(object).every((key) => keys.includes(key)) &&
      ((Array.isArray(object.profile) &&
        object.profile.every((p: any) => typeof p === 'string')) ||
        object.profile === undefined) &&
      typeof object.type === 'string'
    )
  },
  RelatedArtifact: (object: any): object is fhir4.RelatedArtifact => {
    const keys = [
      'citation',
      '_citation',
      'display',
      '_display',
      'document',
      'label',
      '_label',
      'resource',
      '_resource',
      'type',
      '_type',
      'url',
      '_url',
    ]
    const types = [
      'documentation',
      'justification',
      'citation',
      'predecessor',
      'successor',
      'derived-from',
      'depends-on',
      'composed-of',
    ]
    return (
      typeof object === 'object' &&
      Object.keys(object).every((key) => keys.includes(key)) &&
      (typeof object.citation === 'string' || object.citation === undefined) &&
      (typeof object._citation === 'object' ||
        object._citation === undefined) &&
      (typeof object.display === 'string' || object.display === undefined) &&
      (typeof object._display === 'object' || object._display === undefined) &&
      (typeof object.document === 'object' || object.document === undefined) &&
      (typeof object.label === 'string' || object.label === undefined) &&
      (typeof object._label === 'object' || object._label === undefined) &&
      (typeof object.resource === 'string' || object.resource === undefined) &&
      (typeof object._resource === 'object' ||
        object._resource === undefined) &&
      types.includes(object.type) &&
      (typeof object._type === 'object' || object._type === undefined) &&
      (typeof object.url === 'string' || object.url === undefined) &&
      (typeof object._url === 'object' || object._url === undefined)
    )
  },
  UsageContext: (object: any): object is fhir4.UsageContext => {
    const keys = [
      'code',
      'valueCodeableConcept',
      'valueQuantity',
      'valueRange',
      'valueReference',
    ]
    return (
      typeof object === 'object' &&
      Object.keys(object).every((key) => keys.includes(key)) &&
      typeof object.code === 'object' &&
      (is.CodeableConcept(object.valueCodeableConcept) ||
        object.valueCodeableConcept === undefined) &&
      (typeof object.valueQuantity === 'object' ||
        object.valueQuantity === undefined) &&
      (typeof object.valueRange === 'object' ||
        object.valueRange === undefined) &&
      (typeof object.valueReference === 'object' ||
        object.valueReference === undefined)
    )
  },
  Quantity: (object: any): object is fhir4.Quantity => {
    const keys = [
      'code',
      '_code',
      'comparator',
      '_comparator',
      'system',
      '_system',
      'unit',
      '_unit',
      'value',
    ]
    return (
      object !== null &&
      typeof object === 'object' &&
      (typeof object.code === 'string' || typeof object.code === 'undefined') &&
      (typeof object._code === 'object' ||
        typeof object._code === 'undefined') &&
      (typeof object.comparator === 'string' ||
        typeof object.comparator === 'undefined') &&
      (typeof object._comparator === 'object' ||
        typeof object._comparator === 'undefined') &&
      (typeof object.system === 'string' ||
        typeof object.system === 'undefined') &&
      (typeof object._system === 'object' ||
        typeof object._system === 'undefined') &&
      (typeof object.unit === 'string' || typeof object.unit === 'undefined') &&
      (typeof object._unit === 'object' ||
        typeof object._unit === 'undefined') &&
      (typeof object.value === 'number' ||
        typeof object.value === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
  Range: (object: any): object is fhir4.Range => {
    const keys = ['high', 'low']
    return (
      object !== null &&
      typeof object === 'object' &&
      (is.Quantity(object.high) || typeof object.high === 'undefined') &&
      (is.Quantity(object.low) || typeof object.low === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
  Ratio: (object: any): object is fhir4.Ratio => {
    const keys = ['denominator', 'numerator']
    return (
      object !== null &&
      typeof object === 'object' &&
      (is.Quantity(object.denominator) ||
        typeof object.denominator === 'undefined') &&
      (is.Quantity(object.numerator) ||
        typeof object.numerator === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
  Timing: (object: any): object is fhir4.Timing => {
    const keys = ['code', 'event', '_event', 'repeat']
    return (
      object !== null &&
      typeof object === 'object' &&
      (is.CodeableConcept(object.code) || typeof object.code === 'undefined') &&
      ((Array.isArray(object.event) &&
        object.event.every((item: any) => typeof item === 'string')) ||
        typeof object.event === 'undefined') &&
      (Array.isArray(object._event) || typeof object._event === 'undefined') &&
      (is.TimingRepeat(object.repeat) ||
        typeof object.repeat === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
  TimingRepeat: (object: any): object is fhir4.TimingRepeat => {
    const keys = [
      'boundsDuration',
      'boundsRange',
      'boundsPeriod',
      'count',
      'countMax',
      'dayOfWeek',
      '_dayOfWeek',
      'duration',
      'durationMax',
      'durationUnit',
      '_durationUnit',
      'frequency',
      'frequencyMax',
      'offset',
      'period',
      'periodMax',
      'periodUnit',
      '_periodUnit',
      'timeOfDay',
      '_timeOfDay',
      'when',
      '_when',
    ]
    return (
      object !== null &&
      typeof object === 'object' &&
      (typeof object.boundsDuration === 'object' ||
        typeof object.boundsDuration === 'undefined') &&
      (is.Range(object.boundsRange) ||
        typeof object.boundsRange === 'undefined') &&
      (typeof object.boundsPeriod === 'object' ||
        typeof object.boundsPeriod === 'undefined') &&
      (typeof object.count === 'number' ||
        typeof object.count === 'undefined') &&
      (typeof object.countMax === 'number' ||
        typeof object.countMax === 'undefined') &&
      ((Array.isArray(object.dayOfWeek) &&
        object.dayOfWeek.every((item: any) =>
          ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(item)
        )) ||
        typeof object.dayOfWeek === 'undefined') &&
      (Array.isArray(object._dayOfWeek) ||
        typeof object._dayOfWeek === 'undefined') &&
      (typeof object.duration === 'number' ||
        typeof object.duration === 'undefined') &&
      (typeof object.durationMax === 'number' ||
        typeof object.durationMax === 'undefined') &&
      (['s', 'min', 'h', 'd', 'wk', 'mo', 'a'].includes(object.durationUnit) ||
        typeof object.durationUnit === 'undefined') &&
      (typeof object._durationUnit === 'object' ||
        typeof object._durationUnit === 'undefined') &&
      (typeof object.frequency === 'number' ||
        typeof object.frequency === 'undefined') &&
      (typeof object.frequencyMax === 'number' ||
        typeof object.frequencyMax === 'undefined') &&
      (typeof object.offset === 'number' ||
        typeof object.offset === 'undefined') &&
      (typeof object.period === 'number' ||
        typeof object.period === 'undefined') &&
      (typeof object.periodMax === 'number' ||
        typeof object.periodMax === 'undefined') &&
      (['s', 'min', 'h', 'd', 'wk', 'mo', 'a'].includes(object.periodUnit) ||
        typeof object.periodUnit === 'undefined') &&
      (typeof object._periodUnit === 'object' ||
        typeof object._periodUnit === 'undefined') &&
      ((Array.isArray(object.timeOfDay) &&
        object.timeOfDay.every((item: any) => typeof item === 'string')) ||
        typeof object.timeOfDay === 'undefined') &&
      (Array.isArray(object._timeOfDay) ||
        typeof object._timeOfDay === 'undefined') &&
      ((Array.isArray(object.when) &&
        object.when.every((item: any) => typeof item === 'string')) ||
        typeof object.when === 'undefined') &&
      (Array.isArray(object._when) || typeof object._when === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
  Period: (object: any): object is fhir4.Period => {
    const keys = ['end', '_end', 'start', '_start']
    return (
      object !== null &&
      typeof object === 'object' &&
      (typeof object.end === 'string' || typeof object.end === 'undefined') &&
      (typeof object._end === 'object' || typeof object._end === 'undefined') &&
      (typeof object.start === 'string' ||
        typeof object.start === 'undefined') &&
      (typeof object._start === 'object' ||
        typeof object._start === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
  Duration: (object: any): object is fhir4.Duration => {
    const keys = ['value', 'comparator', 'unit', 'system', 'code']
    return (
      object !== null &&
      typeof object === 'object' &&
      (typeof object.value === 'number' ||
        typeof object.value === 'undefined') &&
      (typeof object.comparator === 'string' ||
        typeof object.comparator === 'undefined') &&
      (typeof object.unit === 'string' || typeof object.unit === 'undefined') &&
      (typeof object.system === 'string' ||
        typeof object.system === 'undefined') &&
      (typeof object.code === 'string' || typeof object.code === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
  Reference: (object: any): object is fhir4.Reference => {
    const keys = [
      'display',
      '_display',
      'identifier',
      'reference',
      '_reference',
      'type',
      '_type',
    ]
    return (
      object !== null &&
      typeof object === 'object' &&
      (typeof object.display === 'string' ||
        typeof object.display === 'undefined') &&
      (typeof object._display === 'object' ||
        typeof object._display === 'undefined') &&
      (typeof object.identifier === 'object' ||
        typeof object.identifier === 'undefined') &&
      (typeof object.reference === 'string' ||
        typeof object.reference === 'undefined') &&
      (typeof object._reference === 'object' ||
        typeof object._reference === 'undefined') &&
      (typeof object.type === 'string' || typeof object.type === 'undefined') &&
      (typeof object._type === 'object' ||
        typeof object._type === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
  TriggerDefinition: (object: any): object is fhir4.TriggerDefinition => {
    const keys = [
      'condition',
      'data',
      'name',
      '_name',
      'timingTiming',
      'timingReference',
      'timingDate',
      '_timingDate',
      'timingDateTime',
      '_timingDateTime',
      'type',
      '_type',
    ]
    return (
      object !== null &&
      typeof object === 'object' &&
      (is.Expression(object.condition) ||
        typeof object.condition === 'undefined') &&
      ((Array.isArray(object.data) && object.data.every(is.DataRequirement)) ||
        typeof object.data === 'undefined') &&
      (typeof object.name === 'string' || typeof object.name === 'undefined') &&
      (typeof object._name === 'object' ||
        typeof object._name === 'undefined') &&
      (is.Timing(object.timingTiming) ||
        typeof object.timingTiming === 'undefined') &&
      (is.Reference(object.timingReference) ||
        typeof object.timingReference === 'undefined') &&
      (typeof object.timingDate === 'string' ||
        typeof object.timingDate === 'undefined') &&
      (typeof object._timingDate === 'object' ||
        typeof object._timingDate === 'undefined') &&
      (typeof object.timingDateTime === 'string' ||
        typeof object.timingDateTime === 'undefined') &&
      (typeof object._timingDateTime === 'object' ||
        typeof object._timingDateTime === 'undefined') &&
      [
        'named-event',
        'periodic',
        'data-changed',
        'data-added',
        'data-modified',
        'data-removed',
        'data-accessed',
        'data-access-ended',
      ].includes(object.type) &&
      (typeof object._type === 'object' ||
        typeof object._type === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
  ParameterDefinition: (object: any): object is fhir4.ParameterDefinition => {
    const keys = [
      'documentation',
      '_documentation',
      'max',
      '_max',
      'min',
      'name',
      '_name',
      'profile',
      '_profile',
      'type',
      '_type',
      'use',
      '_use',
    ]
    return (
      object !== null &&
      typeof object === 'object' &&
      (typeof object.documentation === 'string' ||
        typeof object.documentation === 'undefined') &&
      (typeof object._documentation === 'object' ||
        typeof object._documentation === 'undefined') &&
      (typeof object.max === 'string' || typeof object.max === 'undefined') &&
      (typeof object._max === 'object' || typeof object._max === 'undefined') &&
      (typeof object.min === 'number' || typeof object.min === 'undefined') &&
      (typeof object.name === 'string' || typeof object.name === 'undefined') &&
      (typeof object._name === 'object' ||
        typeof object._name === 'undefined') &&
      (typeof object.profile === 'string' ||
        typeof object.profile === 'undefined') &&
      (typeof object._profile === 'object' ||
        typeof object._profile === 'undefined') &&
      typeof object.type === 'string' &&
      (typeof object._type === 'object' ||
        typeof object._type === 'undefined') &&
      ['in', 'out'].includes(object.use) &&
      (typeof object._use === 'object' || typeof object._use === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
  DosageDoseAndRate: (object: any): object is fhir4.DosageDoseAndRate => {
    const keys = [
      'doseRange',
      'doseQuantity',
      'rateRatio',
      'rateRange',
      'rateQuantity',
      'type',
    ]
    return (
      object !== null &&
      typeof object === 'object' &&
      (is.Range(object.doseRange) || typeof object.doseRange === 'undefined') &&
      (is.Quantity(object.doseQuantity) ||
        typeof object.doseQuantity === 'undefined') &&
      (is.Ratio(object.rateRatio) || typeof object.rateRatio === 'undefined') &&
      (is.Range(object.rateRange) || typeof object.rateRange === 'undefined') &&
      (is.Quantity(object.rateQuantity) ||
        typeof object.rateQuantity === 'undefined') &&
      (is.CodeableConcept(object.type) || typeof object.type === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
  Dosage: (object: any): object is fhir4.Dosage => {
    const keys = [
      'additionalInstruction',
      'asNeededBoolean',
      '_asNeededBoolean',
      'asNeededCodeableConcept',
      'doseAndRate',
      'maxDosePerAdministration',
      'maxDosePerLifetime',
      'maxDosePerPeriod',
      'method',
      'patientInstruction',
      '_patientInstruction',
      'route',
      'sequence',
      'site',
      'text',
      '_text',
      'timing',
    ]
    return (
      object !== null &&
      typeof object === 'object' &&
      ((Array.isArray(object.additionalInstruction) &&
        object.additionalInstruction.every(is.CodeableConcept)) ||
        typeof object.additionalInstruction === 'undefined') &&
      (typeof object.asNeededBoolean === 'boolean' ||
        typeof object.asNeededBoolean === 'undefined') &&
      (typeof object._asNeededBoolean === 'object' ||
        typeof object._asNeededBoolean === 'undefined') &&
      (is.CodeableConcept(object.asNeededCodeableConcept) ||
        typeof object.asNeededCodeableConcept === 'undefined') &&
      ((Array.isArray(object.doseAndRate) &&
        object.doseAndRate.every(is.DosageDoseAndRate)) ||
        typeof object.doseAndRate === 'undefined') &&
      (is.Quantity(object.maxDosePerAdministration) ||
        typeof object.maxDosePerAdministration === 'undefined') &&
      (is.Quantity(object.maxDosePerLifetime) ||
        typeof object.maxDosePerLifetime === 'undefined') &&
      (is.Ratio(object.maxDosePerPeriod) ||
        typeof object.maxDosePerPeriod === 'undefined') &&
      (is.CodeableConcept(object.method) ||
        typeof object.method === 'undefined') &&
      (typeof object.patientInstruction === 'string' ||
        typeof object.patientInstruction === 'undefined') &&
      (typeof object._patientInstruction === 'object' ||
        typeof object._patientInstruction === 'undefined') &&
      (is.CodeableConcept(object.route) ||
        typeof object.route === 'undefined') &&
      (typeof object.sequence === 'number' ||
        typeof object.sequence === 'undefined') &&
      (is.CodeableConcept(object.site) || typeof object.site === 'undefined') &&
      (typeof object.text === 'string' || typeof object.text === 'undefined') &&
      (typeof object._text === 'object' ||
        typeof object._text === 'undefined') &&
      (is.Timing(object.timing) || typeof object.timing === 'undefined') &&
      Object.keys(object).every((key) => keys.includes(key))
    )
  },
}

export const getNodeIdFromResource = (resource: fhir4.ActivityDefinition | fhir4.Questionnaire) => {
  const {title, name, url, id} = resource
  return title ?? name ?? url ?? id
}

export const resolveCanonical = (
  canonical: string | undefined,
  resolver: BrowserResolver
) => {
  canonical = canonical?.split('|').shift()
  return canonical != null && resolver.resourcesByCanonical
    ? resolver.resourcesByCanonical[canonical]
    : undefined
}

export const resolveReference = (
  reference: string | undefined,
  resolver: BrowserResolver
) => {
  return reference != null
    ? resolver.resourcesByReference[reference]
    : undefined
}

export const isMarkdown = (content: any) => {
  const regex =
    /^(?!https?:\/\/)(?=.*(^|\s)(#{1,6}\s|\*{1,2}[^*]+\*{1,2}|_[^_]+_|`[^`]+`|```[^```]+```|>\s|!\[.*\]\(.*\)|\[.*\]\(.*\)|\d+\.\s|\-|\+|\*|_|\|))[\s\S]+$/
  return regex.test(content)
}

export const isPrimitive = (content: any) => {
  const types = ['string', 'number', 'bigint', 'boolean']
  if (typeof content === 'boolean') {
  }
  return types.includes(typeof content)
}

export const isUrl = (content: any) => {
  return (
    typeof content === 'string' &&
    (content.startsWith('http') || content.startsWith('https'))
  )
}

export const capitalize = (string: any) => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export const addSpaces = (string: any | undefined): string | undefined => {
  return string
    ?.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
}

/** General purpose */

export const formatTitle = (
  resource: fhir4.FhirResource | fhir4.PlanDefinitionAction
) => {
  const { title, name, url, id } = resource as {
    title?: string
    name?: string
    url?: string
    id?: string
  }
  return title ?? addSpaces(name) ?? url ?? id
}

export const formatResourceType = (
  resource: fhir4.FhirResource | fhir4.PlanDefinitionAction
) => {
  if ('resourceType' in resource) {
    return addSpaces(resource.resourceType)
  }
}

/** Datatypes */

export const formatMarkdown = (markdown: string) => {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
}

export const formatUrl = (
  url: string,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  if (resolver != null && navigate != null) {
    const [canonical, version] = url.split('|')
    const resource = resolver.resolveCanonical(canonical)
    if (resource != null) {
      const path = canonical.split('/').slice(-2).join('/')
      return (
        <Link onClick={() => navigate(`/${path}`)} to={`/${path}`}>
          {formatTitle(resource)}
        </Link>
      )
    }
  }
  return (
    <Link to={url} target="_blank">
      {url}
    </Link>
  )
}

export const formatReference = (
  referenceObj: fhir4.Reference,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  const { reference, type, identifier, display } = referenceObj
  if (
    reference?.split('/').length == 2 &&
    resolver != null &&
    navigate != null
  ) {
    const resource = resolver.resolveReference(reference)
    if (resource != null) {
      return (
        <Link onClick={() => navigate(`/${reference}`)} to={`/${reference}`}>
          {formatTitle(resource)}
        </Link>
      )
    }
  }
  return reference ?? identifier ?? display
}

export const formatCodeableConcept = (
  codeableConcept: fhir4.CodeableConcept,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  const { coding, text } = codeableConcept
  if (coding?.length && coding.length > 1) {
    return codeableConcept?.coding?.map((c: fhir4.Coding) => {
      return <li key={c.code}>{formatCoding(c, resolver, navigate)}</li>
    })
  } else if (coding) {
    return formatCoding(coding[0], resolver, navigate)
  }
}

export const formatCoding = (
  coding: fhir4.Coding,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  const { system, code, display, version } = coding
  return (
    <>
      {system != null ? (
        <>
          <span>{`"${code}" from `}</span>
          <span>{formatUrl(system, resolver, navigate)}</span>
          <span>
            {version ? `|${version}` : ''}
            {display ? ` (${display})` : ''}
          </span>
        </>
      ) : (
        <span>{capitalize(code)}</span>
      )}
    </>
  )
}
export const formatRatio = (ratio: fhir4.Ratio) => {
  const { numerator, denominator } = ratio
  return `${numerator} : ${denominator}`
}
export const formatQuntity = (quantity: fhir4.Quantity) => {
  const { value, comparator, unit, system, code } = quantity
  return `${comparator ?? ''} ${value} ${unit} ${code ? `as ${code}` : ''} ${
    system ? `from ${system}` : ''
  }`
}
export const formatRange = (range: fhir4.Range) => {
  const { low, high } = range
  return `${low} to ${high}`
}
export const formatPeriod = (period: fhir4.Period) => {
  const { start, end } = period
  return `From ${start} to ${end}`
}

export const formatTimingRepeat = (repeat: fhir4.TimingRepeat) => {
  const {
    boundsDuration,
    boundsRange,
    boundsPeriod,
    count,
    countMax,
    duration,
    durationMax,
    durationUnit,
    frequency,
    frequencyMax,
    period,
    periodMax,
    periodUnit,
    dayOfWeek,
    timeOfDay,
    when,
    offset,
  } = repeat
  return `${boundsDuration ?? boundsRange ?? boundsPeriod ?? ''} ${
    count ? `${count} times` : ''
  } ${countMax ? `to at most ${countMax} times` : ''} ${
    duration ? `for ${duration}${durationUnit ?? ''}` : ''
  } ${frequency ? `${frequency} times` : null} ${
    period ? `per ${period}${periodUnit ?? ''}` : ''
  } ${dayOfWeek ? `on ${formatValue(dayOfWeek)}` : ''} ${
    timeOfDay ? `at ${formatValue(timeOfDay)}` : ''
  } ${when ? `when ${formatValue(when)}` : ''}`
}

export const formatExtension = (
  extension: fhir4.Extension,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  const { url } = extension
  const title = url.split('/').pop()
  const valueKey = Object.keys(extension).find((k) =>
    k.includes('value')
  ) as keyof fhir4.Extension
  const value = valueKey ? extension[valueKey] : null
  if (value != null) {
    return (
      <>
        <span>{`${title}`}</span>:{' '}
        <span>{formatValue(value, resolver, navigate)}</span>
      </>
    )
  }
}
// TODO: Format Reference, Dosage

export const formatExpression = (
  exp: fhir4.Expression,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  const { language, expression, reference } = exp
  return (
    <>
      <span>{`${expression}${language ? ` as ${language}` : ''}${
        reference ? ` from ` : ''
      }`}</span>
      <span>
        {reference ? formatValue(reference, resolver, navigate) : null}
      </span>
    </>
  )
}

export const formatRelatedArtifact = (
  artifact: fhir4.RelatedArtifact,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  const { type, display, label, resource, document, citation } = artifact
  return (
    <>
      {type && <span>{`${capitalize(type)}: `}</span>}
      {(display || label) && <span>{display ?? label}</span>}
      {citation && <span>{citation}</span>}
      {resource && <> {formatValue(resource, resolver, navigate)}</>}
      {document && <> {formatValue(document, resolver, navigate)}</>}
    </>
  )
}

export const formatDataRequirement = (
  dataRequirement: fhir4.DataRequirement,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  const { type, profile } = dataRequirement
  const profileDisplay =
    profile?.length && profile.length > 1 ? (
      profile.map((p) => <li key={p}>{formatValue(p, resolver, navigate)}</li>)
    ) : profile ? (
      <span>{formatValue(profile[0], resolver, navigate)}</span>
    ) : null
  return (
    <>
      {profileDisplay ? `${type}: ` : <span>{type}</span>}
      {profileDisplay}
    </>
  )
}

export const formatUsageContext = (
  usageContext: fhir4.UsageContext,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  const {
    code,
    valueCodeableConcept,
    valueQuantity,
    valueRange,
    valueReference,
  } = usageContext
  return (
    <>
      {formatValue(code)}:{' '}
      {formatValue(
        valueCodeableConcept ?? valueQuantity ?? valueRange ?? valueReference,
        resolver,
        navigate
      )}
    </>
  )
}
// TODO: Format Trigger Def, parameter

/** Plan Definition Types */

export const formatActions = (actions: fhir4.PlanDefinitionAction[]) => {
  let index = 0
  return actions
    .map((a) => {
      const header = formatTitle(a)
      index += 1
      return (
        <li key={v4()}>
          {header ?? `Action ${index} (no identifier available)`}
        </li>
      )
    })
    .filter(notEmpty)
}

export const formatCondition = (
  condition: any,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
) => {
  const { kind, expression } = condition
  return (
    <>
      <span>{formatExpression(expression, resolver, navigate)}</span>
      <span>{`${expression ? ' ' : ''}${kind ? `(${kind})` : ''}`}</span>
    </>
  )
}

/** TODO Structure Definition Types: differential */

/** TODO Code System Types: concept */

/** TODO Activity Definition Types: dynamic value */

export const formatValue = (
  value: any,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction
): JSX.Element | string | undefined => {
  let formattedValue
  if (isMarkdown(value)) {
    formattedValue = formatMarkdown(value.toString())
  } else if (isUrl(value)) {
    formattedValue = formatUrl(value, resolver, navigate)
  } else if (isPrimitive(value)) {
    formattedValue = value.toString()
  } else if (is.Reference(value)) {
    formattedValue = formatReference(value, resolver, navigate)
  } else if (is.Coding(value)) {
    formattedValue = formatCoding(value, resolver, navigate)
  } else if (is.Extension(value)) {
    formattedValue = formatExtension(value, resolver, navigate)
  } else if (is.Expression(value)) {
    formattedValue = formatExpression(value, resolver, navigate)
  } else if (is.CodeableConcept(value)) {
    formattedValue = formatCodeableConcept(value, resolver, navigate)
  } else if (is.Condition(value)) {
    formattedValue = formatCondition(value, resolver, navigate)
  } else if (is.DataRequirement(value)) {
    formattedValue = formatDataRequirement(value, resolver, navigate)
  } else if (is.RelatedArtifact(value)) {
    formattedValue = formatRelatedArtifact(value, resolver, navigate)
  } else if (is.UsageContext(value)) {
    formattedValue = formatUsageContext(value, resolver, navigate)
  } else if (is.Ratio(value)) {
    formattedValue = formatRatio(value)
  } else if (is.Quantity(value)) {
    formattedValue = formatQuntity(value)
  } else if (is.Period(value)) {
    formattedValue = formatPeriod(value)
  } else if (is.Range(value)) {
    formattedValue = formatRange(value)
  } else if (is.TimingRepeat(value)) {
    formattedValue = formatTimingRepeat(value)
  }

  return formattedValue
}

export const formatProperty = (
  value: any,
  resolver?: BrowserResolver | undefined,
  navigate?: NavigateFunction,
  key?: string | undefined
) => {
  let content
  if (key === 'action') {
    content = formatActions(value)
  } else if (Array.isArray(value) && value.length > 1) {
    content = value.map((v) => {
      return <li key={v4()}>{formatProperty(v, resolver, navigate)}</li>
    })
  } else {
    const singleValue = Array.isArray(value) ? value[0] : value
    content = formatValue(singleValue, resolver, navigate)
    if (content == null && typeof value === 'object') {
      content = Object.entries(singleValue)
        .map((e: [string, any]) => {
          const [k, v] = e
          return formatProperty(v, resolver, navigate, k)
        })
        .filter(notEmpty)
    }
  }
  const keyFormatted = key != null ? addSpaces(capitalize(key)) : undefined
  if (Array.isArray(content)) {
    return (
      <ListDisplayItem
        key={keyFormatted}
        heading={keyFormatted}
        content={content}
      />
    )
  } else {
    return (
      <SingleDisplayItem
        key={keyFormatted}
        heading={keyFormatted}
        content={content}
      />
    )
  }
}
