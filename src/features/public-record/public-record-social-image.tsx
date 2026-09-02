import type { PublicRecordShareDescriptor } from "@/domain/public-record/public-record-sharing";

import type { LocalizedPublicRecordShare } from "./public-record-sharing-copy";

const ACCENTS = ["#ef9c72", "#79a9c8", "#d8ae55", "#7fb4a4"] as const;

export function renderPublicRecordSocialImage(
  descriptor: PublicRecordShareDescriptor,
  localized: LocalizedPublicRecordShare,
) {
  const accent = ACCENTS[descriptor.presentationVariant];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#f6f1e7",
        color: "#132d56",
        fontFamily: "sans-serif",
        padding: "54px",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          width: "430px",
          height: "430px",
          top: "-230px",
          right: "-100px",
          borderRadius: "999px",
          background: accent,
          opacity: 0.28,
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          border: "2px solid rgba(19,45,86,.44)",
          borderRadius: "30px",
          background: "#fffaf0",
          padding: "44px 48px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                width: "66px",
                height: "66px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid #132d56",
                borderRadius: "999px",
                boxShadow: `inset 0 0 0 7px #fffaf0, inset 0 0 0 10px ${accent}`,
                fontSize: "30px",
                fontWeight: 800,
              }}
            >
              {localized.brandInitial}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "22px", fontWeight: 760 }}>
                {localized.brandName}
              </span>
              <span
                style={{
                  color: "#456080",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                {localized.department}
              </span>
            </div>
          </div>
          <span
            style={{
              borderRadius: "999px",
              background: accent,
              padding: "10px 16px",
              fontFamily: "monospace",
              fontSize: "12px",
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            {localized.imageStatus}
          </span>
        </div>

        <div
          style={{
            maxWidth: "880px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              marginBottom: "12px",
              color: "#456080",
              fontFamily: "monospace",
              fontSize: "14px",
              letterSpacing: ".1em",
              textTransform: "uppercase",
            }}
          >
            {localized.disposition}
          </span>
          <span
            style={{
              color: "#092146",
              fontSize: "66px",
              fontWeight: 720,
              letterSpacing: "-.045em",
              lineHeight: 1,
            }}
          >
            {localized.offence}
          </span>
          <span
            style={{
              maxWidth: "900px",
              marginTop: "20px",
              color: "#456080",
              fontSize: "26px",
              lineHeight: 1.32,
            }}
          >
            {localized.summary}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(19,45,86,.2)",
            paddingTop: "22px",
            fontFamily: "monospace",
            fontSize: "13px",
            letterSpacing: ".08em",
            textTransform: "uppercase",
          }}
        >
          <span>{localized.reference}</span>
          <span>{localized.imageMotto}</span>
        </div>
      </div>
    </div>
  );
}
