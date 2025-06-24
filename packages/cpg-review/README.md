# CPG Review Tool

The CPG (Clinical Practice Guidelines) Review tool renders a flow diagram dynamically based on desired FHIR plan definition. Each plan action is displayed as a node in the diagram. Where a resource is nested as action.definitionCanonical, the resolved resource is represented as:

- Child action nodes, where the resolved resource is a plan definition; OR
- A child Activity Definition node; OR
- A child Questionnaire node

Refer to [Clinical Practice Guidelines IG](https://hl7.org/fhir/uv/cpg/STU2/index.html) for documentation on representing Clinical Practice Guidelines as FHIR Plan Definitions.

## Local Development

### Install

Run `npm install` in the root of this monorepo

### Build

Run `npm run build` in the root of this monorepo

### Format

Run `npm run fmt` in the root of this monorepo

### Running

Then from `packages/cpg-review`, run the development server:

```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in browser.
