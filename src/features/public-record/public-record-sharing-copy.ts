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
  const values = {
    offence,
    mitigation,
    minutes: number.format(descriptor.discrepancyMinutes),
    reference: descriptor.reference,
  };

  return {
    brandName: copy.brandName,
    brandInitial: copy.brandInitial,
    imageStatus: copy.imageStatus,
    imageMotto: copy.imageMotto,
    department: copy.department,
    disposition: copy.disposition,
    offence,
    mitigation,
    reference: descriptor.reference,
    title: format(copy.sharePayloadTitle, values),
    metadataTitle: format(copy.metadataTitle, values),
    summary: format(copy.summary, values),
    shareText: format(copy.shareText, values),
    imageAlt: format(copy.imageAlt, values),
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
