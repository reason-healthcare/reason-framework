import { PlanDefinitionAction, RequestGroupAction } from 'fhir/r4'

/**
 * Generates a simple hash code from a string (djb2 algorithm)
 */
function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

/**
 * Serializes a CodeableConcept array to a stable string for hashing.
 * Uses system and code from each coding.
 */
function serializeCodeableConcepts(
  concepts: fhir4.CodeableConcept[] | undefined
): string {
  if (!concepts || concepts.length === 0) return ''
  return concepts
    .flatMap(
      (c) =>
        c.coding?.map(
          (coding) => `${coding.system ?? ''}|${coding.code ?? ''}`
        ) ?? []
    )
    .sort()
    .join(';')
}

/**
 * Generates a stable hash for an action based on properties that are
 * preserved between PlanDefinitionAction and RequestGroupAction during $apply.
 * Includes parent path to ensure uniqueness when properties are not unique across nodes.
 *
 * Properties included (preserved from PD to RG during $apply):
 * - id, title, description, textEquivalent, prefix
 * - priority, cardinalityBehavior, groupingBehavior
 * - selectionBehavior, requiredBehavior, precheckBehavior
 * - code (CodeableConcept[])
 * - timingDateTime (as representative timing value)
 *
 * Properties EXCLUDED (added/modified by $apply):
 * - type (action-type like "create" is added by $apply)
 * - resource (reference to created resource, added by $apply)
 * - definitionCanonical/definitionUri (PD-only, not copied to RG)
 *
 * @param action The PlanDefinition or RequestGroup action
 * @param parentPath Array of parent action hashes forming the path to this action
 * @returns A hash string identifying this action
 */
export function generateActionHash(
  action: PlanDefinitionAction | RequestGroupAction,
  parentPath: string[] = []
): string {
  // Properties that are preserved from PlanDefinition to RequestGroup during $apply
  const components = [
    // String properties
    action.id ?? '',
    action.title ?? '',
    action.description ?? '',
    action.textEquivalent ?? '',
    action.prefix ?? '',
    // Enum/code properties
    action.priority ?? '',
    action.cardinalityBehavior ?? '',
    action.groupingBehavior ?? '',
    action.selectionBehavior ?? '',
    action.requiredBehavior ?? '',
    action.precheckBehavior ?? '',
    // Timing (using DateTime as representative - most commonly used)
    action.timingDateTime ?? '',
    // CodeableConcept properties (code is preserved, type is NOT - it's added by $apply)
    serializeCodeableConcepts(action.code),
    // NOTE: action.type is excluded because $apply adds it (e.g., "create")
  ]

  // Include parent path to ensure uniqueness for actions with same properties
  const pathComponent = parentPath.length > 0 ? parentPath.join('/') : ''
  const hashInput = `${pathComponent}|${components.join('|')}`
  return hashString(hashInput)
}

/**
 * Builds a map of action hashes to actions for efficient lookup.
 * Recursively processes nested actions, tracking parent paths.
 * Works with both PlanDefinitionAction and RequestGroupAction.
 */
export function buildActionHashMap<
  T extends PlanDefinitionAction | RequestGroupAction
>(actions: T[] | undefined, parentPath: string[] = []): Map<string, T> {
  const map = new Map<string, T>()
  if (!actions) return map

  for (const action of actions) {
    const hash = generateActionHash(action, parentPath)
    map.set(hash, action)

    if (action.action) {
      const childMap = buildActionHashMap(action.action as T[], [
        ...parentPath,
        hash,
      ])
      childMap.forEach((v, k) => map.set(k, v))
    }
  }
  return map
}

/**
 * Checks if all RequestGroup actions can be matched to PlanDefinition actions.
 * Returns true if every RQ action has a corresponding PD action match.
 * @param rqActions RequestGroup actions to validate
 * @param pdActionHashMap Pre-built map of PD action hashes
 * @param parentPath Current parent path for hash generation
 */
export function canMatchAllRQActions(
  rqActions: RequestGroupAction[] | undefined,
  pdActionHashMap: Map<string, PlanDefinitionAction>,
  parentPath: string[] = []
): boolean {
  if (!rqActions || rqActions.length === 0) return true

  for (const rqAction of rqActions) {
    const hash = generateActionHash(rqAction, parentPath)
    if (!pdActionHashMap.has(hash)) {
      console.warn(
        `No matching PD action found for RQ action: ${
          rqAction.title ?? rqAction.id ?? 'unknown'
        }`
      )
      return false
    }

    // Check child actions recursively
    if (rqAction.action && rqAction.action.length > 0) {
      const currentPath = [...parentPath, hash]
      if (
        !canMatchAllRQActions(
          rqAction.action as RequestGroupAction[],
          pdActionHashMap,
          currentPath
        )
      ) {
        return false
      }
    }
  }
  return true
}
