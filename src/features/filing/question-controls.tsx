import type { MessageCatalog } from "@/i18n/catalogs";

type FilingCopy = MessageCatalog["Filing"];

export function DepartmentEvidenceMismatch({
  copy,
  goToClassification,
}: {
  copy: FilingCopy;
  goToClassification: () => void;
}) {
  return (
    <QuestionFrame
      kicker={copy.classificationKicker}
      title={copy.classificationTitle}
      body={copy.classificationBody}
      why={copy.classificationWhy}
      copy={copy}
    >
      <button
        className="button button-secondary"
        type="button"
        onClick={goToClassification}
      >
        {copy.back}
      </button>
    </QuestionFrame>
  );
}

type EvidenceNumberField = readonly [
  label: string,
  value: string,
  minimum: number,
  maximum: number,
  suffix: string,
  onChange: (value: string) => void,
];

export function EvidenceNumberGrid({
  fields,
  errorId,
  rangeCopy,
}: {
  fields: readonly EvidenceNumberField[];
  errorId: string | undefined;
  rangeCopy: string;
}) {
  return (
    <div className="timing-grid evidence-number-grid">
      {fields.map(
        ([label, value, minimum, maximum, suffix, onChange], index) => {
          const rangeId = `evidence-number-range-${String(index)}`;
          return (
            <label key={label}>
              <span className="field-label">{label}</span>
              <span className="number-control">
                <input
                  autoFocus={index === 0}
                  className="text-input"
                  type="number"
                  inputMode="numeric"
                  min={minimum}
                  max={maximum}
                  step={1}
                  value={value}
                  aria-describedby={errorId ? `${rangeId} ${errorId}` : rangeId}
                  onChange={(event) => {
                    onChange(event.target.value);
                  }}
                />
                <span className="field-unit">{suffix}</span>
              </span>
              <small className="field-range" id={rangeId}>
                {format(rangeCopy, { minimum, maximum })}
              </small>
            </label>
          );
        },
      )}
    </div>
  );
}

interface TimingFieldsProps {
  firstLabel: string;
  firstType: "time" | "number";
  firstValue: string;
  secondLabel: string;
  secondValue: string;
  suffix: string;
  errorId: string | undefined;
  onFirst: (value: string) => void;
  onSecond: (value: string) => void;
}

export function TimingFields(props: TimingFieldsProps) {
  return (
    <div className="timing-grid">
      <label>
        <span className="field-label">{props.firstLabel}</span>
        <span className="number-control">
          <input
            autoFocus
            className="text-input"
            type={props.firstType}
            min={props.firstType === "number" ? 1 : undefined}
            max={props.firstType === "number" ? 180 : undefined}
            value={props.firstValue}
            aria-describedby={props.errorId}
            onChange={(event) => {
              props.onFirst(event.target.value);
            }}
          />
          {props.firstType === "number" ? (
            <span className="field-unit">{props.suffix}</span>
          ) : null}
        </span>
      </label>
      <label>
        <span className="field-label">{props.secondLabel}</span>
        <span className="number-control">
          <input
            className="text-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={360}
            value={props.secondValue}
            aria-describedby={props.errorId}
            onChange={(event) => {
              props.onSecond(event.target.value);
            }}
          />
          <span className="field-unit">{props.suffix}</span>
        </span>
      </label>
    </div>
  );
}

interface QuestionFrameProps {
  kicker: string;
  title: string;
  body: string;
  why: string;
  copy: FilingCopy;
  children: React.ReactNode;
}

export function QuestionFrame({
  kicker,
  title,
  body,
  why,
  copy,
  children,
}: QuestionFrameProps) {
  return (
    <>
      <p className="eyebrow">{kicker}</p>
      <h1>{title}</h1>
      <p className="question-intro">{body}</p>
      <div className="question-field">{children}</div>
      <details className="why-panel">
        <summary>{copy.whyLabel}</summary>
        <p>{why}</p>
      </details>
    </>
  );
}

interface ChoiceGroupProps {
  name: string;
  selected: string;
  options: readonly (readonly [string, string, string?])[];
  onSelect: (value: string) => void;
}

export function ChoiceGroup({
  name,
  selected,
  options,
  onSelect,
}: ChoiceGroupProps) {
  return (
    <fieldset className="choice-list">
      <legend className="sr-only">{name}</legend>
      {options.map(([value, label, description]) => (
        <label className="choice" key={value}>
          <input
            type="radio"
            name={name}
            value={value}
            checked={selected === value}
            onChange={() => {
              onSelect(value);
            }}
          />
          <span className="choice-indicator" aria-hidden="true" />
          <span>
            <strong>{label}</strong>
            {description ? <small>{description}</small> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function FieldError({
  id,
  children,
}: {
  id: string | undefined;
  children: string;
}) {
  return (
    <p className="form-error" id={id} role="alert">
      {children}
    </p>
  );
}

export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{([^}]+)\}/gu, (match, name: string) =>
    String(values[name] ?? match),
  );
}
