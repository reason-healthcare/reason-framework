Instance: EffectiveTimingExpected
InstanceOf: Questionnaire
Usage: #example
* description = "Test case for processing complex data type with nested structure"
* insert QuestionnaireMetaData(EffectiveTimingExpected)
* item
  * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation)
  * text = "Measurements and simple assertions"
  * type = #group
  * item[+]
    * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming)
    * type = #group
    * text = "Clinically relevant time/time-period for observation"
    * item[+]
      * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.event)
      * type = #dateTime
      * text = "When the event occurs"
      * required = true
    * item[+]
      * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat)
      * type = #group
      * text = "When the event is to occur"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.boundsPeriod)
        * type = #group
        * text = "Length/Range of lengths, or (Start and/or end) limits" //currently getting "text: "Observation effectiveTiming repeat boundsPeriod""
        * item[+]
          * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.boundsPeriod.start)
          * type = #dateTime
          * text = "Starting time with inclusive boundary"
        * item[+]
          * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.boundsPeriod.end)
          * type = #dateTime
          * text = "End time with inclusive boundary, if not ongoing"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.count)
        * type = #integer
        * text = "Number of times to repeat"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.countMax)
        * type = #integer
        * text = "Maximum number of times to repeat"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.duration)
        * type = #decimal
        * text = "How long when it happens"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.durationMax)
        * type = #decimal
        * text = "How long when it happens (Max)"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.durationUnit)
        * type = #choice
        * answerValueSet = Canonical(units-of-time)
        * text = "s | min | h | d | wk | mo | a - unit of time (UCUM)"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.frequency)
        * type = #integer
        * text = "Event occurs frequency times per period"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.frequencyMax)
        * type = #integer
        * text = "Event occurs up to frequencyMax times per period"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.period)
        * type = #decimal
        * text = "Event occurs frequency times per period"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.periodMax)
        * type = #decimal
        * text = "Upper limit of period (3-4 hours)"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.periodUnit)
        * type = #choice
        * answerValueSet = Canonical(units-of-time)
        * text = "s | min | h | d | wk | mo | a - unit of time (UCUM)"
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.dayOfWeek)
        * type = #choice
        * answerValueSet = Canonical(days-of-week)
        * text = "mon | tue | wed | thu | fri | sat | sun"
        * repeats = true
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.timeOfDay)
        * type = #time
        * text = "Time of day for action"
        * repeats = true
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.when)
        * type = #choice
        * answerValueSet = Canonical(event-timing)
        * text = "Code for time period of occurrence"
        * repeats = true
      * item[+]
        * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.repeat.offset)
        * type = #integer
        * text = "Minutes from event (before or after)"
    * item[+]
      * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.effectiveTiming.code)
      * type = #choice
      * answerValueSet = Canonical(timing-abbreviation)
      * text = "BID | TID | QID | AM | PM | QD | QOD | +"
  * item[+]
    * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.status)
    * type = #choice
    * answerValueSet = Canonical(observation-status)
    * text = "registered | preliminary | final | amended +"
    * required = true
  * item[+]
    * insert QuestionnaireItemMeta(EffectiveTimingObservation, Observation.code)
    * type = #open-choice
    * answerValueSet = Canonical(observation-codes)
    * text = "Type of observation (code / type)"
    * required = true