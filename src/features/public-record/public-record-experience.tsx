import type { PublicRecord } from "@/domain/public-record/public-record";
import type { PublicConsultationAggregate } from "@/domain/public-record/public-consultation";
import { createPublicRecordShareDescriptor } from "@/domain/public-record/public-record-sharing";
import type { MessageCatalog } from "@/i18n/catalogs";
import type { InterfaceLocale } from "@/i18n/routing";
import type {
  AnalyticsEntrySurface,
  AnalyticsSubject,
} from "@/domain/observability/product-analytics";

import { DeterminationRecord } from "../determination/determination-record";
import { SurfaceObserver } from "../observability/surface-observer";
import { PublicRecordConsultation } from "./public-record-consultation";
import { PublicRecordReport } from "./public-record-report";
import { PublicRecordSharing } from "./public-record-sharing";
import { localizePublicRecordShare } from "./public-record-sharing-copy";

export function PublicRecordExperience({
  record,
  locale,
  publicUrl,
  messages,
  consultationAggregate,
  analyticsSubject = null,
  entrySurface = "direct",
}: {
  record: PublicRecord;
  locale: InterfaceLocale;
  publicUrl: string;
  messages: MessageCatalog;
  consultationAggregate: PublicConsultationAggregate | null;
  analyticsSubject?: AnalyticsSubject | null;
  entrySurface?: AnalyticsEntrySurface;
}) {
  const shareDescriptor = createPublicRecordShareDescriptor(record);
  const localizedShare = localizePublicRecordShare(
    shareDescriptor,
    locale,
    messages.Sharing,
  );

  return (
    <>
      {analyticsSubject ? (
        <SurfaceObserver
          locale={locale}
          surface={{
            name: "public_record",
            department: record.snapshot.filing.department,
            recordSubject: analyticsSubject,
            entrySurface,
          }}
        />
      ) : null}
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
            <PublicRecordConsultation
              publicId={record.publicId}
              locale={locale}
              initialAggregate={consultationAggregate}
              copy={messages.Consultation}
            />
            <PublicRecordSharing
              descriptor={shareDescriptor}
              localized={localizedShare}
              publicUrl={publicUrl}
              copy={messages.Sharing}
              locale={locale}
              analyticsSubject={analyticsSubject}
            />
            <PublicRecordReport
              publicId={record.publicId}
              copy={messages.PublicRecord}
            />
          </>
        }
      />
    </>
  );
}
