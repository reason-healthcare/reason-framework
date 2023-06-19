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
cp .env.example .env
```
Then, go to your new .env file and update the path for your machine.

Finally, run:
```
node ./lib/server.js
```

If you are developing, you can also use the npm script which allows:
```
npm run dev
```

## Content

There is fixture content (pre-built) in `packages/cpg-execution/test/fixtures/ExampleIG`.

If you wish to edit and build the content yourself, this process uses IG Publisher. 
You will need to make sure you have all the requirements to run that installed.
If you are using asdf, the `.tool-versions` file includes all the requirements, so `asdf install` should work. After running, you will need to install the following:

```
npm install -g fsh-sushi
gem install jekyll -N
```

The first time, you will also need to install IG Publisher:
```
cd packages/cpg-execution/test/fixtures/ExampleIG
./_updatePublisher.sh
```

Once you do, there is a script that will help create the output and clear unnecessary files:

```
cd packages/cpg-execution
./bin/prepare-ig
```

## Supported features
This technology focuses on imlementing [Workflow]([url](https://hl7.org/fhir/r5/workflow-module.html)) module of FHIR as well as the [Clinical Guidelines IG](https://hl7.org/fhir/uv/cpg/index.html). In particular, the following features are supported:

* PlanDefinition/$apply from [FHIR R5](https://hl7.org/fhir/r5/plandefinition-operation-apply.html)
* [CPGPlanDefinitionApply](https://hl7.org/fhir/uv/cpg/OperationDefinition-cpg-plandefinition-apply.html)'s profile for PlanDefinition/$apply - specifically `data`, `dataEndpoint`, `contentEndpoint`, and `terminologyEndpoint` parameters
  * both `http(s)://` and `file://` URL schemes for endpoint parameters are supported

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
