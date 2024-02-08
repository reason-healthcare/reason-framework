library RecommendationLogic version '0.1.0'

using FHIR version '4.0.1'

context Patient

define "Over 18": 
  AgeInYears() > 18

define "Not over 18": 
  not "Over 18"