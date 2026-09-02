import type { PublicRecord } from "@/domain/public-record/public-record";
import { createPublicRecordShareDescriptor } from "@/domain/public-record/public-record-sharing";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

import { DeterminationRecord } from "../determination/determination-record";
import { PublicRecordReport } from "./public-record-report";
import { PublicRecordSharing } from "./public-record-sharing";
import { localizePublicRecordShare } from "./public-record-sharing-copy";

export function PublicRecordExperience({
  record,
  locale,
  publicUrl,
  messages,
}: {
  record: PublicRecord;
  locale: InterfaceLocale;
  publicUrl: string;
  messages: MessageCatalog;
}) {
  const shareDescriptor = createPublicRecordShareDescriptor(record);
  const localizedShare = localizePublicRecordShare(
    shareDescriptor,
    locale,
    messages.Sharing,
  );

  return (
    <DeterminationRecord
      snapshot={record.snapshot}
      locale={locale}
      copy={messages.Determination}
      navigation={messages.Navigation}
      sessionLabel={messages.PublicRecord.sessionLabel}
      boundaryTitle={messages.PublicRecord.boundaryTitle}
      boundaryBody={messages.PublicRecord.boundaryBody}
      publicMetadata={{
        publishedAt: record.publishedAt,
        expiresAt: record.expiresAt,
        publishedLabel: messages.PublicRecord.publishedLabel,
        expiresLabel: messages.PublicRecord.expiresLabel,
      }}
      actions={
        <a className="button button-primary" href={`/${locale}`}>
          {messages.PublicRecord.homeAction}
        </a>
      }
      afterRecord={
        <>
          <PublicRecordSharing
            descriptor={shareDescriptor}
            localized={localizedShare}
            publicUrl={publicUrl}
            copy={messages.Sharing}
          />
          <PublicRecordReport
            publicId={record.publicId}
            copy={messages.PublicRecord}
          />
        </>
      }
    />
  );
}
