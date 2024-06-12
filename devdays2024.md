# Reason Framework Dev Days 2024 with CPG Starter Example

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

There is fixture content at [Interactive CDS Content](https://github.com/reason-healthcare/interactive-cds-content). Follow the [instructions](https://github.com/reason-healthcare/interactive-cds-content/blob/main/devdays2024.md) there for setup. The content must be built with IG publisher prior to using with CPG engine.

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
