import {
  assessChronologyFiling,
  type ChronologyAssessment,
} from "./chronology-assessment";
import {
  assessDigitalConductFiling,
  type DigitalConductAssessment,
} from "./digital-conduct-assessment";
import type { Filing } from "@/domain/filing/filing";
import {
  assessDomesticAffairsFiling,
  type DomesticAffairsAssessment,
} from "./domestic-affairs-assessment";

export type DeterminationAssessment =
  ChronologyAssessment | DigitalConductAssessment | DomesticAffairsAssessment;

export function assessFiling(filing: Filing): DeterminationAssessment {
  if (filing.department === "chronology") return assessChronologyFiling(filing);
  return filing.department === "digital_conduct"
    ? assessDigitalConductFiling(filing)
    : assessDomesticAffairsFiling(filing);
}
