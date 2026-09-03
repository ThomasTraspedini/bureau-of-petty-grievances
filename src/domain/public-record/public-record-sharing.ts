import type { DigitalConductDeterminationSnapshot } from "@/domain/determination/determination-experience";
import type { DomesticAffairsDeterminationSnapshot } from "@/domain/determination/determination-experience";
import type { PublicRecord } from "./public-record";

export const PUBLIC_RECORD_SHARE_DESCRIPTOR_VERSION = 3 as const;

interface ShareDescriptorCommon {
  descriptorVersion: typeof PUBLIC_RECORD_SHARE_DESCRIPTOR_VERSION;
  disposition: "upheld_with_circumstances_noted";
  reference: string;
  presentationVariant: 0 | 1 | 2 | 3;
}

export type PublicRecordShareDescriptor =
  | (ShareDescriptorCommon & {
      department: "chronology";
      offence:
        "premature_departure" | "chronic_lateness" | "optimistic_estimate";
      discrepancyMinutes: number;
      mitigation:
        "brings_dessert" | "apologizes" | "helps_others" | "useful_warning";
    })
  | (ShareDescriptorCommon & {
      department: "digital_conduct";
      offence:
        | "fragmented_messages"
        | "excessive_voice_note"
        | "unacknowledged_coordination";
      evidence:
        | { kind: "message_density"; messageCount: number; ideaCount: number }
        | { kind: "voice_note_duration"; durationMinutes: number }
        | {
            kind: "response_interval";
            responseHours: number;
            followUpCount: number;
          };
      mitigation:
        | "provides_summary"
        | "acknowledges_delay"
        | "usually_clear"
        | "helps_coordinate";
    })
  | (ShareDescriptorCommon & {
      department: "domestic_affairs";
      offence: "token_remainder" | "misplaced_object" | "empty_packaging";
      evidence:
        | {
            kind: "container_remainder";
            remainingServings: number;
            capacityServings: number;
          }
        | {
            kind: "correction_path";
            itemCount: number;
            distanceSteps: number;
          }
        | {
            kind: "empty_inventory";
            emptyPackageCount: number;
            recurrencesInThirtyDays: number;
          };
      mitigation:
        | "usually_restocks"
        | "corrects_when_asked"
        | "handles_other_chores"
        | "usually_orderly";
    });

export function createPublicRecordShareDescriptor(
  record: PublicRecord,
): PublicRecordShareDescriptor {
  const snapshot = record.snapshot;
  if (isDigitalSnapshot(snapshot)) {
    const source = snapshot.assessment.evidence;
    const evidence =
      source.kind === "message_density"
        ? {
            kind: source.kind,
            messageCount: source.messageCount,
            ideaCount: source.ideaCount,
          }
        : source.kind === "voice_note_duration"
          ? { kind: source.kind, durationMinutes: source.durationMinutes }
          : {
              kind: source.kind,
              responseHours: source.responseHours,
              followUpCount: source.followUpCount,
            };
    return {
      descriptorVersion: PUBLIC_RECORD_SHARE_DESCRIPTOR_VERSION,
      department: "digital_conduct",
      disposition: "upheld_with_circumstances_noted",
      reference: snapshot.reference,
      offence: snapshot.filing.offence,
      evidence,
      mitigation: snapshot.filing.mitigation,
      presentationVariant: snapshot.presentationVariant,
    };
  }
  if (isDomesticSnapshot(snapshot)) {
    const source = snapshot.assessment.evidence;
    const evidence =
      source.kind === "container_remainder"
        ? {
            kind: source.kind,
            remainingServings: source.remainingServings,
            capacityServings: source.capacityServings,
          }
        : source.kind === "correction_path"
          ? {
              kind: source.kind,
              itemCount: source.itemCount,
              distanceSteps: source.distanceSteps,
            }
          : {
              kind: source.kind,
              emptyPackageCount: source.emptyPackageCount,
              recurrencesInThirtyDays: source.recurrencesInThirtyDays,
            };
    return {
      descriptorVersion: PUBLIC_RECORD_SHARE_DESCRIPTOR_VERSION,
      department: "domestic_affairs",
      disposition: "upheld_with_circumstances_noted",
      reference: snapshot.reference,
      offence: snapshot.filing.offence,
      evidence,
      mitigation: snapshot.filing.mitigation,
      presentationVariant: snapshot.presentationVariant,
    };
  }
  return {
    descriptorVersion: PUBLIC_RECORD_SHARE_DESCRIPTOR_VERSION,
    department: "chronology",
    disposition: "upheld_with_circumstances_noted",
    reference: snapshot.reference,
    offence: snapshot.filing.offence,
    discrepancyMinutes: snapshot.assessment.discrepancy.minutes,
    mitigation: snapshot.filing.mitigation,
    presentationVariant: snapshot.presentationVariant,
  };
}

function isDigitalSnapshot(
  snapshot: PublicRecord["snapshot"],
): snapshot is DigitalConductDeterminationSnapshot {
  return snapshot.filing.department === "digital_conduct";
}

function isDomesticSnapshot(
  snapshot: PublicRecord["snapshot"],
): snapshot is DomesticAffairsDeterminationSnapshot {
  return snapshot.filing.department === "domestic_affairs";
}
