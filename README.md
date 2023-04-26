# Reason Framework

A FHIR + CQL Clinical Reason Framework

This is a monorepo using npm's workspace feature. See
https://docs.npmjs.com/cli/v9/using-npm/workspaces for information on how this
works.

## Install

Run `npm install` in the root of this monorepo

## Build

Run `npm run build` in the root of this monorepo

## Format

Run `npm run fmt` in the root of this monorepo

## Running

To run locally, make sure to build the project, then `cd
./packages/cds-service`. Then run:
```
node ./lib/server.js
```

If you are developing, you can also use the npm script which allows:
```
npm run dev
```

## Content

There is fixture content in `packages/cpg-execution/test/fixtures/ExampleIG`.
This is built using IG Publisher, so you will need to make sure you have all the
requirements to run that installed. Once you do, there is a script that will
help create the output and clear un-necessary files:

```
cd packages/cpg-execution
./bin/prepare-ig
```

## Docker

To run with docker, first build the project
```
./bin/docker-build
```

Then run the project with docker
```
./bin/docker-run [endpoint address]
```

The `[endpoint address]` can either be a file or a remote service. In docker,
this endpoint will be used for all three (content, terminology, and data)
endpoints.

```
./bin/docker-run file://./packages/cpg-execution/test/fixtures/ExampleIG/output
```

```
./bin/docker-run http://hapi.fhir.org/baseR4
```

## Postman collection

See `./postman` for a Postman collection. There are a few variables to set for
the collection, so take a minute to review.

The stand-alone `CPG - PlanDefinition drink water $apply` example is recommended to get started with.
