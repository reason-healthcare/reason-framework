Instance: 3268e67a-158b-447b-b722-649c4c95bb4c
InstanceOf: Questionnaire
Usage: #example
* description = "Questionnaire generated from http://example.org/StructureDefinition/EffectiveTimingObservation"
* status = #draft
* url = "http://questionnaire-processor/Questionnaire/3268e67a-158b-447b-b722-649c4c95bb4c"
* item
  * linkId = "49fa2a74-39d2-4742-8e42-d729ed495576"
  * definition = "http://example.org/StructureDefinition/EffectiveTimingObservation#Observation"
  * text = "Observation Group"
  * type = #group
  * item[0]
    * linkId = "927990ff-8ea7-40b8-a018-ddd380b147b7"
    * definition = "http://example.org/StructureDefinition/EffectiveTimingObservation#Observation.effectiveTiming"
    * type = #group
    * text = "Observation.effectiveTiming Group"
    // * item[0]
    //   * linkId = "5e3e3f73-f6fb-49db-b40a-f0b9bd18727a"
    //   * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Observation.effectiveTiming"
    //   * type = #group
    //   * text = "Observation.effectiveTiming Group"
    * item[0]
      * linkId = "269cce87-8597-4581-b3fa-f2359e971057"
      * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.event"
      * type = #dateTime
      * text = "When the event occurs"
      * repeats = true
    * item[+]
      * linkId = "6cde03d0-4947-4fe0-a527-53bc0b218ec4"
      * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat"
      * type = #group
      * text = "Observation.effectiveTiming.repeat Group"
      * item[0]
        * linkId = "3f97b88b-01e8-497c-9302-b7bdadd7f7fd"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.boundsPeriod"
        * type = #group
        * text = "Observation.effectiveTiming.repeat.boundsPeriod Group"
        // * item[0]
        //   * linkId = "9a443241-661b-4c36-8ab9-4104b470d771"
        //   * definition = "http://hl7.org/fhir/StructureDefinition/Duration#Timing.event"
        //   * type = #dateTime
        //   * text = "When the event occurs"
        //   * repeats = true
        // * item[+]
        //   * linkId = "f11e9d38-93de-48d4-b02a-ecf56d4c6b3f"
        //   * definition = "http://hl7.org/fhir/StructureDefinition/Duration#Timing.repeat"
        //   * type = #group
        //   * text = "Timing.repeat Group"
        // * item[+]
        //   * linkId = "55b7608b-0539-4b18-9a53-c836258075f2"
        //   * definition = "http://hl7.org/fhir/StructureDefinition/Duration#Timing.code"
        //   * type = #choice
        //   * answerValueSet = "http://hl7.org/fhir/ValueSet/timing-abbreviation"
        //   * text = "BID | TID | QID | AM | PM | QD | QOD | +"
        // * linkId = "Observation.boundsPeriod"
        // * type = #group
        // * definition = "http://hl7.org/fhir/StructureDefinition/Period#Period"
        // * text = "Observation.boundsPeriod Group"
        * item[+]
          * linkId = "Timing.boundsPeriod.start"
          * type = #dateTime
          * definition = "http://hl7.org/fhir/StructureDefinition/Period#Period.start"
          * text = "Starting time with inclusive boundary"
        * item[+]
          * linkId = "Timing.boundsPeriod.end"
          * type = #dateTime
          * definition = "http://hl7.org/fhir/StructureDefinition/Period#Period.end"
          * text = "End time with inclusive boundary, if not ongoing"
      * item[+]
        * linkId = "429b34e8-80ff-4e7c-9a40-89ba59431d83"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.count"
        * type = #integer
        * text = "Number of times to repeat"
      * item[+]
        * linkId = "ed6a8c83-ea31-4f3f-9d27-01e3cd070711"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.countMax"
        * type = #integer
        * text = "Maximum number of times to repeat"
      * item[+]
        * linkId = "c6794b49-bcd3-4202-b71c-63dc51bd4d38"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.duration"
        * type = #decimal
        * text = "How long when it happens"
      * item[+]
        * linkId = "0e740638-10a1-4604-87c3-9aa6a60c2f20"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.durationMax"
        * type = #decimal
        * text = "How long when it happens (Max)"
      * item[+]
        * linkId = "8a887f49-ba14-4c60-9d81-917878246f11"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.durationUnit"
        * type = #choice
        * answerValueSet = "http://hl7.org/fhir/ValueSet/units-of-time"
        * text = "s | min | h | d | wk | mo | a - unit of time (UCUM)"
      * item[+]
        * linkId = "cbb72507-107f-4d93-936d-5d8eaf8d1e5c"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.frequency"
        * type = #integer
        * text = "Event occurs frequency times per period"
      * item[+]
        * linkId = "72ac84ce-bcea-4d05-92e7-8f556464971a"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.frequencyMax"
        * type = #integer
        * text = "Event occurs up to frequencyMax times per period"
      * item[+]
        * linkId = "ff18fe38-6a6b-4218-af5f-f9ab17b5661a"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.period"
        * type = #decimal
        * text = "Event occurs frequency times per period"
      * item[+]
        * linkId = "7a5cf1dd-1414-4355-a078-3a7bbff4e0fe"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.periodMax"
        * type = #decimal
        * text = "Upper limit of period (3-4 hours)"
      * item[+]
        * linkId = "8ba33cd0-8167-44d2-8a9a-4a4092706856"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.periodUnit"
        * type = #choice
        * answerValueSet = "http://hl7.org/fhir/ValueSet/units-of-time"
        * text = "s | min | h | d | wk | mo | a - unit of time (UCUM)"
      * item[+]
        * linkId = "c2cb22fb-29bd-4d52-8118-40b9cacd84f1"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.dayOfWeek"
        * type = #choice
        * answerValueSet = "http://hl7.org/fhir/ValueSet/days-of-week"
        * text = "mon | tue | wed | thu | fri | sat | sun"
        * repeats = true
      * item[+]
        * linkId = "f781d697-d466-462c-83ed-944fdbd9af63"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.timeOfDay"
        * type = #time
        * text = "Time of day for action"
        * repeats = true
      * item[+]
        * linkId = "a323fcd2-cccf-4897-a3b6-df2f57b9c14c"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.when"
        * type = #choice
        * answerValueSet = "http://hl7.org/fhir/ValueSet/event-timing"
        * text = "Code for time period of occurrence"
        * repeats = true
      * item[+]
        * linkId = "20e65aaa-45da-4d1c-a383-06d6bcb5c8c7"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.repeat.offset"
        * type = #integer
        * text = "Minutes from event (before or after)"
    * item[+]
        * linkId = "98a35426-a58d-4f4b-b225-e0474c5a0d3f"
        * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Timing.code"
        * type = #choice
        * answerValueSet = "http://hl7.org/fhir/ValueSet/timing-abbreviation"
        * text = "BID | TID | QID | AM | PM | QD | QOD | +"
    // * item[+]
    //   * linkId = "3eba8742-f14e-4274-b73f-84e0a55c6b5f"
    //   * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Observation.status"
    //   * type = #choice
    //   * answerValueSet = "http://hl7.org/fhir/ValueSet/observation-status"
    //   * text = "registered | preliminary | final | amended +"
    //   * required = true
    // * item[+]
    //   * linkId = "ef88e590-2e71-4958-916e-44241904c54b"
    //   * definition = "http://hl7.org/fhir/StructureDefinition/Timing#Observation.code"
    //   * type = #open-choice
    //   * answerValueSet = "http://hl7.org/fhir/ValueSet/observation-codes"
    //   * text = "Type of observation (code / type)"
    //   * required = true
  * item[+]
    * linkId = "a42044b3-037b-4f9c-b844-313f22f09c05"
    * definition = "http://example.org/StructureDefinition/EffectiveTimingObservation#Observation.status"
    * type = #choice
    * answerValueSet = "http://hl7.org/fhir/ValueSet/observation-status"
    * text = "registered | preliminary | final | amended +"
    * required = true
  * item[+]
    * linkId = "45479e9f-b2be-4664-a624-4725151d6888"
    * definition = "http://example.org/StructureDefinition/EffectiveTimingObservation#Observation.code"
    * type = #open-choice
    * answerValueSet = "http://hl7.org/fhir/ValueSet/observation-codes"
    * text = "Type of observation (code / type)"
    * required = true