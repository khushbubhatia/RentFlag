"use client";

import { useRef, useState } from "react";
import { SAMPLE_LISTING_A, SAMPLE_LISTING_B } from "@/lib/sampleListings";
import type { AnalysisInputMode } from "@/lib/types";

const tabs: { id: AnalysisInputMode; label: string; description: string }[] = [
  {
    id: "text",
    label: "Paste text",
    description: "Best accuracy: copy the full body of the ad, including fees and disclaimers.",
  },
  {
    id: "url",
    label: "Link (or link + paste)",
    description:
      "Try the URL alone—we fetch HTML on the server when we can. If the site blocks bots, paste the ad text below the link.",
  },
  {
    id: "screenshots",
    label: "Screenshots",
    description: "Attach a few images; pairing them with pasted text works best until OCR ships.",
  },
];

export type InputSectionValues = {
  mode: AnalysisInputMode;
  listingText: string;
  listingUrl: string;
  imagesBase64: string[];
};

type InputSectionProps = {
  values: InputSectionValues;
  onChange: (next: InputSectionValues) => void;
  disabled?: boolean;
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function InputSection({ values, onChange, disabled }: InputSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const setMode = (mode: AnalysisInputMode) => {
    onChange({ ...values, mode });
    setFileError(null);
  };

  const applySample = (text: string) => {
    onChange({ ...values, mode: "text", listingText: text });
    setFileError(null);
  };

  const onFilesSelected = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList).slice(0, 3);
    if (files.length > 3) {
      setFileError("Use at most three screenshots.");
      return;
    }
    try {
      const payloads = await Promise.all(files.map((file) => readFileAsBase64(file)));
      onChange({
        ...values,
        mode: "screenshots",
        imagesBase64: payloads,
      });
      setFileError(null);
    } catch {
      setFileError("Could not read one of the images.");
    }
  };

  return (
    <section className="input-section">
      <div className="input-section__accent" aria-hidden />
      <div className="input-section__body">
        <div className="input-section__header-row">
          <div className="input-section__lead">
            <p className="input-section__step">Step 1</p>
            <h2 className="input-section__title">Listing source</h2>
            <p className="input-section__blurb">
              Everything below is parsed locally first; the model only refines what you already shared.
            </p>
          </div>
          <div className="input-section__samples">
            <button
              type="button"
              disabled={disabled}
              onClick={() => applySample(SAMPLE_LISTING_A)}
              className="input-section__sample-btn"
            >
              Try messy ad
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => applySample(SAMPLE_LISTING_B)}
              className="input-section__sample-btn"
            >
              Try detailed ad
            </button>
          </div>
        </div>

        <div className="input-section__tablist" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={values.mode === tab.id}
              disabled={disabled}
              onClick={() => setMode(tab.id)}
              className={`input-section__tab ${
                values.mode === tab.id ? "input-section__tab--active" : "input-section__tab--inactive"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tabs.map((tab) =>
          values.mode === tab.id ? (
            <p key={`hint-${tab.id}`} className="input-section__tab-hint">
              {tab.description}
            </p>
          ) : null,
        )}

        <div className="input-section__fields">
          {values.mode === "url" && (
            <label className="input-section__label">
              Listing URL
              <input
                type="url"
                disabled={disabled}
                placeholder="https://..."
                className="input-section__input"
                value={values.listingUrl}
                onChange={(event) => onChange({ ...values, listingUrl: event.target.value })}
              />
              <span className="input-section__hint">
                Link-only runs a best-effort fetch; many rental sites need you to paste the visible listing copy
                here too.
              </span>
            </label>
          )}

          {(values.mode === "text" || values.mode === "url") && (
            <label className="input-section__label">
              {values.mode === "url" ? "Listing text (recommended)" : "Listing description"}
              <textarea
                disabled={disabled}
                rows={7}
                placeholder="Paste the full listing here..."
                className="input-section__textarea"
                value={values.listingText}
                onChange={(event) => onChange({ ...values, listingText: event.target.value })}
              />
            </label>
          )}

          {values.mode === "screenshots" && (
            <div className="input-section__stack">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="input-section__sr-file"
                disabled={disabled}
                onChange={(event) => onFilesSelected(event.target.files)}
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className="input-section__upload"
              >
                Upload 1–3 screenshots
              </button>
              <p className="input-section__help">
                Files stay in your browser for this session. Adding any text you can read from the photos keeps
                the report useful until OCR is wired in.
              </p>
              {values.imagesBase64.length > 0 && (
                <p className="input-section__status">
                  {values.imagesBase64.length} image{values.imagesBase64.length === 1 ? "" : "s"} ready to send.
                </p>
              )}
              {fileError && <p className="input-section__file-error">{fileError}</p>}
              <label className="input-section__label">
                Optional: paste visible text
                <textarea
                  disabled={disabled}
                  rows={6}
                  className="input-section__textarea"
                  placeholder="Helps until OCR is connected."
                  value={values.listingText}
                  onChange={(event) => onChange({ ...values, listingText: event.target.value })}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
