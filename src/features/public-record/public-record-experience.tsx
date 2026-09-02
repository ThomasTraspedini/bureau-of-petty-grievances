import type { PublicRecord } from "@/domain/public-record/public-record";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";

import { DeterminationRecord } from "../determination/determination-record";
import { PublicRecordReport } from "./public-record-report";

export function PublicRecordExperience({
  record,
  locale,
  messages,
}: {
  record: PublicRecord;
  locale: InterfaceLocale;
  messages: MessageCatalog;
}) {
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
        <PublicRecordReport
          publicId={record.publicId}
          copy={messages.PublicRecord}
        />
      }
    />
  );
}
