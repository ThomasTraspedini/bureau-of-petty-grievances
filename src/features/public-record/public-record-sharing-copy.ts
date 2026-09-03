import type { PublicRecordShareDescriptor } from "@/domain/public-record/public-record-sharing";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

export type PublicRecordSharingCopy = MessageCatalog["Sharing"];

export interface LocalizedPublicRecordShare {
  brandName: string;
  brandInitial: string;
  imageStatus: string;
  imageMotto: string;
  department: string;
  disposition: string;
  offence: string;
  mitigation: string;
  reference: string;
  title: string;
  metadataTitle: string;
  summary: string;
  shareText: string;
  imageAlt: string;
}

export function localizePublicRecordShare(
  descriptor: PublicRecordShareDescriptor,
  locale: InterfaceLocale,
  copy: PublicRecordSharingCopy,
): LocalizedPublicRecordShare {
  const number = new Intl.NumberFormat(locale);
  const offence = offenceLabel(descriptor.offence, copy);
  const mitigation = mitigationLabel(descriptor.mitigation, copy);
  const values: Record<string, string | number> = {
    offence,
    mitigation,
    reference: descriptor.reference,
  };
  if (descriptor.department === "chronology") {
    values.minutes = number.format(descriptor.discrepancyMinutes);
  } else {
    values.evidence = digitalEvidenceSummary(descriptor, number, copy);
  }
  const digitalConduct = descriptor.department === "digital_conduct";

  return {
    brandName: copy.brandName,
    brandInitial: copy.brandInitial,
    imageStatus: copy.imageStatus,
    imageMotto: copy.imageMotto,
    department: digitalConduct ? copy.digitalDepartment : copy.department,
    disposition: copy.disposition,
    offence,
    mitigation,
    reference: descriptor.reference,
    title: format(copy.sharePayloadTitle, values),
    metadataTitle: format(copy.metadataTitle, values),
    summary: format(
      digitalConduct ? copy.digitalSummary : copy.summary,
      values,
    ),
    shareText: format(
      digitalConduct ? copy.digitalShareText : copy.shareText,
      values,
    ),
    imageAlt: format(
      digitalConduct ? copy.digitalImageAlt : copy.imageAlt,
      values,
    ),
  };
}

function offenceLabel(
  offence: PublicRecordShareDescriptor["offence"],
  copy: PublicRecordSharingCopy,
): string {
  switch (offence) {
    case "premature_departure":
      return copy.offencePrematureDeparture;
    case "chronic_lateness":
      return copy.offenceChronicLateness;
    case "optimistic_estimate":
      return copy.offenceOptimisticEstimate;
    case "fragmented_messages":
      return copy.offenceFragmentedMessages;
    case "excessive_voice_note":
      return copy.offenceExcessiveVoiceNote;
    case "unacknowledged_coordination":
      return copy.offenceUnacknowledgedCoordination;
  }
}

function mitigationLabel(
  mitigation: PublicRecordShareDescriptor["mitigation"],
  copy: PublicRecordSharingCopy,
): string {
  switch (mitigation) {
    case "brings_dessert":
      return copy.mitigationBringsDessert;
    case "apologizes":
      return copy.mitigationApologizes;
    case "helps_others":
      return copy.mitigationHelpsOthers;
    case "useful_warning":
      return copy.mitigationUsefulWarning;
    case "provides_summary":
      return copy.mitigationProvidesSummary;
    case "acknowledges_delay":
      return copy.mitigationAcknowledgesDelay;
    case "usually_clear":
      return copy.mitigationUsuallyClear;
    case "helps_coordinate":
      return copy.mitigationHelpsCoordinate;
  }
}

function digitalEvidenceSummary(
  descriptor: Extract<
    PublicRecordShareDescriptor,
    { department: "digital_conduct" }
  >,
  number: Intl.NumberFormat,
  copy: PublicRecordSharingCopy,
): string {
  switch (descriptor.evidence.kind) {
    case "message_density":
      return format(copy.evidenceMessageDensity, {
        messages: number.format(descriptor.evidence.messageCount),
        ideas: number.format(descriptor.evidence.ideaCount),
      });
    case "voice_note_duration":
      return format(copy.evidenceVoiceDuration, {
        minutes: number.format(descriptor.evidence.durationMinutes),
      });
    case "response_interval":
      return format(copy.evidenceResponseInterval, {
        hours: number.format(descriptor.evidence.responseHours),
        followUps: number.format(descriptor.evidence.followUpCount),
      });
  }
}

function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{([^}]+)\}/gu, (match, name: string) =>
    String(values[name] ?? match),
  );
}
