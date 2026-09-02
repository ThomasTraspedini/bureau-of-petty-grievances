import type { PublicRecord } from "./public-record";

export const PUBLIC_RECORD_SHARE_DESCRIPTOR_VERSION = 1 as const;

export interface PublicRecordShareDescriptor {
  descriptorVersion: typeof PUBLIC_RECORD_SHARE_DESCRIPTOR_VERSION;
  department: "chronology";
  disposition: "upheld_with_circumstances_noted";
  reference: string;
  offence: PublicRecord["snapshot"]["filing"]["offence"];
  discrepancyMinutes: number;
  mitigation: PublicRecord["snapshot"]["filing"]["mitigation"];
  presentationVariant: PublicRecord["snapshot"]["presentationVariant"];
}

export function createPublicRecordShareDescriptor(
  record: PublicRecord,
): PublicRecordShareDescriptor {
  return {
    descriptorVersion: PUBLIC_RECORD_SHARE_DESCRIPTOR_VERSION,
    department: "chronology",
    disposition: "upheld_with_circumstances_noted",
    reference: record.snapshot.reference,
    offence: record.snapshot.filing.offence,
    discrepancyMinutes: record.snapshot.assessment.discrepancy.minutes,
    mitigation: record.snapshot.filing.mitigation,
    presentationVariant: record.snapshot.presentationVariant,
  };
}
