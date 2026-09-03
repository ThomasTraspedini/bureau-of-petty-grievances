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
import {
  assessSocialPlanningFiling,
  type SocialPlanningAssessment,
} from "./social-planning-assessment";

export type DeterminationAssessment =
  | ChronologyAssessment
  | DigitalConductAssessment
  | DomesticAffairsAssessment
  | SocialPlanningAssessment;

export function assessFiling(filing: Filing): DeterminationAssessment {
  if (filing.department === "chronology") return assessChronologyFiling(filing);
  if (filing.department === "digital_conduct")
    return assessDigitalConductFiling(filing);
  return filing.department === "domestic_affairs"
    ? assessDomesticAffairsFiling(filing)
    : assessSocialPlanningFiling(filing);
}
