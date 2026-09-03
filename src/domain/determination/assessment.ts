import {
  assessChronologyFiling,
  type ChronologyAssessment,
} from "./chronology-assessment";
import {
  assessDigitalConductFiling,
  type DigitalConductAssessment,
} from "./digital-conduct-assessment";
import type { Filing } from "@/domain/filing/filing";

export type DeterminationAssessment =
  ChronologyAssessment | DigitalConductAssessment;

export function assessFiling(filing: Filing): DeterminationAssessment {
  return filing.department === "chronology"
    ? assessChronologyFiling(filing)
    : assessDigitalConductFiling(filing);
}
