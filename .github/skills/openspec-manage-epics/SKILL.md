````skill
---
name: openspec-manage-epics
description: Define, refine, and prioritize epics from rough ideas so `propose` can start from a clear epic.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: reason-framework
  version: "1.0"
---

Define and manage epics above the change level.

Use this when the user has a list of features, refinements, bugs, or technical investments and wants help turning them into a small set of coherent epics.

**Input**: A rough list of ideas, themes, backlog items, or an existing epic name to refine.

**Output**:
- One or more epic folders under `openspec/epics/`
- An `epic.md` file in each epic folder
- Optional updates to `openspec/epics/index.md`
- Clear candidate changes that can be handed to `propose`
- A maintained progress ledger for epic-level status

---

## Workflow

1. **Understand the request**
   - If the user provides ideas, cluster them into a small number of meaningful epics.
   - If the user references an existing epic, refine or expand that epic.
   - If the request is too vague to group responsibly, ask a focused open-ended question.

2. **Inspect current epic context**
   - Read `openspec/epics/index.md` if it exists.
   - List existing folders under `openspec/epics/`.
   - Read any existing `epic.md` files relevant to the request.

3. **Normalize into epics**
   For each epic, define:
   - title
   - summary
   - problem
   - desired outcomes
   - in scope
   - out of scope
   - candidate changes
   - dependencies
   - risks
   - open questions
   - priority and status
   - candidate change progress state

   Keep epics strategic and broad enough to contain multiple changes.
   Keep `candidate changes` implementation-sized so `propose` can start from one.

4. **Create or update epic files**
   - Use `openspec/epics/epic-template.md` as the shape.
   - Store each epic at `openspec/epics/<epic-name>/epic.md`.
   - Prefer updating an existing epic if the idea clearly belongs there.
   - Create a new epic only when the work does not fit cleanly into an existing one.

5. **Maintain the epic index**
   - Update `openspec/epics/index.md` with active epics, priorities, and short notes.
   - Keep the index concise.

6. **Prepare the handoff to `propose`**
   - End by listing the candidate changes available in each epic.
   - Recommend the best epic to start with when the user asks.
   - If the user wants to proceed immediately, tell them which epic to pass into `propose`.
   - When a candidate already maps to an OpenSpec change, record that in the ledger.

---

## Epic Writing Guidance

- Write for future implementation planning, not marketing.
- Separate business outcomes from solution details.
- Put constraints and assumptions in `Notes` or `Open Questions`.
- Prefer 2-5 candidate changes per epic.
- Candidate changes should be small enough to become a single OpenSpec change.
- Track each candidate change with a status such as `not-started`, `proposed`, `in-progress`, `done`, or `archived`.
- If ideas are duplicates or near-duplicates, merge them.
- If ideas are unrelated, split them into separate epics.

### Good Epic Boundary
A good epic is:
- larger than one implementation change
- smaller than a product strategy document
- coherent enough that one team can reason about it

### Good Candidate Change
A good candidate change is:
- implementable in one change directory
- scoped to a clear behavior, capability, or technical improvement
- understandable without revisiting the whole backlog

---

## Example Handoff

After defining epics, summarize like this:

- `care-gap-review`: 3 candidate changes
- `cds-hooks-improvements`: 2 candidate changes
- `terminology-performance`: 4 candidate changes

Then suggest the next move:
- "To start implementation planning, run `propose` against `care-gap-review` and choose `add-encounter-context-to-review` as the first change."

---

## Guardrails

- Do not implement code in this skill.
- Do not create OpenSpec change artifacts here unless the user explicitly asks to move into `propose`.
- Prefer a small number of well-formed epics over exhaustive backlog decomposition.
- Keep `candidate changes` concrete enough that `propose` can use them with minimal re-interpretation.
- Treat the `Candidate Changes` table as the source of truth for epic-level progress.
- Reuse and refine existing epics instead of creating duplicates.

````
