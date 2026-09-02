import type { DeterminationLanguage } from "@/domain/determination/determination-language";
import type { ChronologyFiling } from "@/domain/filing/chronology";

interface ChronologyDeterminationLanguageFixture {
  name: string;
  filing: ChronologyFiling;
  language: DeterminationLanguage;
}

export const CHRONOLOGY_DETERMINATION_LANGUAGE_FIXTURES = [
  {
    name: "premature departure with a held reservation",
    filing: {
      locale: "en",
      department: "chronology",
      respondent: "Marco",
      relationship: "friend",
      offence: "premature_departure",
      facts: { declaredTime: "19:30", delayMinutes: 24 },
      impact: "table_held",
      mitigation: "brings_dessert",
      statement: "Shoes were still being located.",
    },
    language: {
      schemaVersion: 1,
      locale: "en",
      disposition: "upheld_with_circumstances_noted",
      allegation: {
        text: "A declaration of “leaving now” preceded departure by 24 minutes; the submitted account records that shoes were still being located.",
        grounding: ["offence", "discrepancy", "witness_statement"],
      },
      finding: {
        text: "Departure language created a reasonable expectation of imminent movement. The 24-minute discrepancy is material under the Bureau’s chronology policy.",
        grounding: ["offence", "discrepancy", "severity"],
      },
      consequence: {
        text: "A table or reservation had to be preserved while departure remained pending.",
        grounding: ["impact"],
      },
      mitigation: {
        text: "The dependable dessert contribution is accepted in mitigation.",
        grounding: ["mitigation"],
      },
      remedy: {
        title: "Departure language protocol",
        instruction: {
          text: "For the next three social occasions, the Bureau recommends reserving “leaving now” for the point at which departure can begin.",
          grounding: ["remedy_family", "remedy_limit", "relationship_context"],
        },
      },
      closing: "Balance has been restored. This relationship may now continue.",
    },
  },
  {
    name: "professional lateness with repeated updates",
    filing: {
      locale: "en",
      department: "chronology",
      respondent: "Alex",
      relationship: "colleague",
      offence: "chronic_lateness",
      facts: { agreedTime: "09:00", delayMinutes: 8 },
      impact: "repeated_updates",
      mitigation: "apologizes",
      statement: "Three status requests were sent before arrival.",
    },
    language: {
      schemaVersion: 1,
      locale: "en",
      disposition: "upheld_with_circumstances_noted",
      allegation: {
        text: "Arrival occurred 8 minutes after the agreed time, following repeated requests for status.",
        grounding: ["offence", "discrepancy", "witness_statement"],
      },
      finding: {
        text: "The agreed arrival time established a clear expectation. The 8-minute discrepancy is established under the Bureau’s chronology policy.",
        grounding: ["offence", "discrepancy", "severity"],
      },
      consequence: {
        text: "Repeated status updates were requested while colleagues awaited arrival.",
        grounding: ["impact"],
      },
      mitigation: {
        text: "The respondent’s unprompted apologies are accepted in mitigation.",
        grounding: ["mitigation"],
      },
      remedy: {
        title: "Agreed-time arrival protocol",
        instruction: {
          text: "For the next three work commitments, the Bureau recommends sending a revised arrival time before the agreed time passes whenever delay is expected.",
          grounding: ["remedy_family", "remedy_limit", "relationship_context"],
        },
      },
      closing: "The record is complete. Professional harmony may continue.",
    },
  },
  {
    name: "optimistic estimate with useful warning",
    filing: {
      locale: "en",
      department: "chronology",
      respondent: "Sam",
      relationship: "roommate",
      offence: "optimistic_estimate",
      facts: { estimatedMinutes: 5, actualMinutes: 28 },
      impact: "irritation_only",
      mitigation: "useful_warning",
      statement: "The five-minute estimate was renewed halfway through.",
    },
    language: {
      schemaVersion: 1,
      locale: "en",
      disposition: "upheld_with_circumstances_noted",
      allegation: {
        text: "The preparation estimate was exceeded by 23 minutes after being renewed during the same period.",
        grounding: ["offence", "discrepancy", "witness_statement"],
      },
      finding: {
        text: "The preparation estimate did not represent the submitted duration. The 23-minute discrepancy is established under the Bureau’s chronology policy.",
        grounding: ["offence", "discrepancy", "severity"],
      },
      consequence: {
        text: "The irritation is recorded as context and does not increase the finding.",
        grounding: ["impact"],
      },
      mitigation: {
        text: "The respondent’s usual provision of a useful warning is accepted in mitigation.",
        grounding: ["mitigation"],
      },
      remedy: {
        title: "Preparation estimate calibration",
        instruction: {
          text: "For the next three social occasions, the Bureau recommends that each preparation estimate include the tasks still awaiting completion.",
          grounding: ["remedy_family", "remedy_limit", "relationship_context"],
        },
      },
      closing: "Balance has been restored. This relationship may now continue.",
    },
  },
] satisfies readonly ChronologyDeterminationLanguageFixture[];
