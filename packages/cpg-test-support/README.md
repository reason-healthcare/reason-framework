# CPG Test Support

CPG Test support provides integration testing of the CPG $apply operation using cucumber tests.

## Testing with Example Content

To run the tests, first build the project.

```
npm run build
```

An example implementation guide is included `./DevIG` along with test features. Prior to running the tests, the IG must be generated using the IG publisher.

```
cd DevIG
./_genonce.sh
```

Additionally, the step definitions must be configured to use a CPG engine capable of $apply, and the server must be running. Set environment variables as specified in `.env.example`.

Ensure the @reason-framework/cpg-test-support package is installed. Then, execute tests.

```
npm install
npx cucumber-js
```

## Gherkin Expressions

```
Given {{PlanDefinitionIdentifier}} is loaded
When apply is called with context {{DataBundleIdentifier}}
# Specify user selection of an action (optional)
  When {{action.title || ActivityDefinitionIdentifier || PlanDefinitionIdentifier}} is selected
# Check for recommendation
  Then {{ActivityDefinitionIdentifier}} should have been recommended
# Check for recommendations with selection behavior
  Then select {{action.selectionBehavior.code}} of the following should have been recommended
  |{{ActivityDefinitionIdentifier1}}|
  |{{ActivityDefinitionIdentifier2}}|
```

<!-- #Check for selection between actions
  Then select {{action.selectionBehavior.code}} of the following should be present
  |action.title 1|
  |action.title 2| -->

## Request Group Mappings

| Identifier                     | Request Group Property        |
| ------------------------------ | ----------------------------- |
| Activity Definition Identifier | Request.instantiatesCanonical |

### Assertion of stand alone recommendation

Request exists where request.instantiatesCanonical = activity definition identifier

### Assertion of selection group match

Selection group must match by:

- action.selectionBehavior.code; And
- action.resource where request.instantiatesCanonical = activity definition identifier; And
- there must be no additional actions on the group

### Selection of specific action, followed by assertions

When specifying selection of a specific action, the asserted recommendations and selection groups must be children of the specified action.
