library ExampleLibrary version '0.1.0'

using FHIR version '4.0.1'

valueset "Height": 'http://example.org/ValueSet/Height'
valueset "Weight": 'http://example.org/ValueSet/Weight' version '0.1.0'

context Patient

define "example message": 
  'welcome to my message'

define "is false":
  false

define "is true":
  true