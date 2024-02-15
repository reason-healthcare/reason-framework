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

Additionally, the step definitions must be configured to use a CPG engine capable of $apply, and the server must be running. Set environment variables as specified in `./.env.example`.

Ensure the @reason-framework/cpg-test-support package is installed. Then, execute tests.
```
npm install
npx cucumber-js
```



