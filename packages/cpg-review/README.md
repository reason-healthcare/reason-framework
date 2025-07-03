# CPG Review Tool

The CPG (Clinical Practice Guidelines) Review tool renders a flow diagram dynamically based on FHIR plan definitions. Each plan action is displayed as a node in the diagram. Where a resource is nested as action.definitionCanonical, the resolved resource is represented as:

- Child action nodes, where the resolved resource is a plan definition; OR
- A child Activity Definition node

Additionally, the tool supports running the planDefinition/$apply operation which renders the server response as a request group resource (note that request orchestration is not yet supported). In order to render the results of $apply, a CPG engine endpoint must be provided and running.

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

## Running with HAPI clinical reasoning module

docker pull hapiproject/hapi:latest
docker run -p 8080:8080 -e hapi.fhir.cr.enabled=true hapiproject/hapi:latest
