# TODO

1. Documentation
2. Refactor assertions for readability and performance
3. Github CI action
4. Use human readable identifiers in place of ID - title or name?
5. Improve error handling for selection behavior

Current: Selection behaviors on actions are optional. Selection behavior is hybrid of titles/definitions. Only definitions that are unused will be checked at test completion.

Option 1: separate selection behavior from recommendations so that selection only uses action titles and definitions/requests are separate
Option 2: only test selection behaviors that point to definitions/requests
