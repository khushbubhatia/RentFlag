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

const MAX_SCREENSHOTS = 3;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB per file

/** Returns the full data URL ("data:image/png;base64,...") so we can use it directly as <img src>. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function InputSection({ values, onChange, disabled }: InputSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const setMode = (mode: AnalysisInputMode) => {
    onChange({ ...values, mode });
    setFileError(null);
  };

  const applySample = (text: string) => {
    onChange({ ...values, mode: "text", listingText: text });
    setFileError(null);
  };

  const ingestFiles = async (incoming: File[]) => {
    if (incoming.length === 0) return;

    const onlyImages = incoming.filter((file) => file.type.startsWith("image/"));
    if (onlyImages.length === 0) {
      setFileError("Only image files can be uploaded.");
      return;
    }

    const tooBig = onlyImages.find((file) => file.size > MAX_IMAGE_BYTES);
    if (tooBig) {
      setFileError(`"${tooBig.name}" is over 8 MB. Shrink it or pick a different shot.`);
      return;
    }

    const slotsLeft = MAX_SCREENSHOTS - values.imagesBase64.length;
    if (slotsLeft <= 0) {
      setFileError(`You can keep at most ${MAX_SCREENSHOTS} screenshots—remove one first.`);
      return;
    }

    const accepted = onlyImages.slice(0, slotsLeft);
    const overflowed = onlyImages.length > slotsLeft;

    try {
      const payloads = await Promise.all(accepted.map((file) => readFileAsDataUrl(file)));
      onChange({
        ...values,
        mode: "screenshots",
        imagesBase64: [...values.imagesBase64, ...payloads],
      });
      setFileError(
        overflowed
          ? `Kept the first ${accepted.length}—you can hold ${MAX_SCREENSHOTS} screenshots at a time.`
          : null
      );
    } catch {
      setFileError("Could not read one of the images.");
    }
  };

  const onFilesSelected = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    await ingestFiles(Array.from(fileList));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImageAt = (index: number) => {
    const next = values.imagesBase64.filter((_, i) => i !== index);
    onChange({ ...values, imagesBase64: next });
    setFileError(null);
  };

  const onDropZoneDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!isDragOver) setIsDragOver(true);
  };

  const onDropZoneDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const onDropZoneDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const files = Array.from(event.dataTransfer?.files ?? []);
    await ingestFiles(files);
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

              <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled}
                aria-label="Upload listing screenshots — click to browse or drag and drop"
                onClick={() => !disabled && fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (disabled) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={onDropZoneDragOver}
                onDragOver={onDropZoneDragOver}
                onDragLeave={onDropZoneDragLeave}
                onDrop={onDropZoneDrop}
                className={`input-section__dropzone ${
                  isDragOver ? "input-section__dropzone--active" : ""
                } ${disabled ? "input-section__dropzone--disabled" : ""}`}
              >
                <div className="input-section__dropzone-inner">
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    className="input-section__dropzone-icon"
                  >
                    <path d="M12 16V4m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 17v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" strokeLinecap="round" />
                  </svg>
                  <p className="input-section__dropzone-title">
                    {isDragOver ? "Drop to add" : "Drag screenshots here, or click to browse"}
                  </p>
                  <p className="input-section__dropzone-sub">
                    PNG / JPG · up to {MAX_SCREENSHOTS} files · 8 MB each
                  </p>
                  {values.imagesBase64.length > 0 && (
                    <p className="input-section__dropzone-meta">
                      {values.imagesBase64.length} of {MAX_SCREENSHOTS} added
                    </p>
                  )}
                </div>
              </div>

              {values.imagesBase64.length > 0 && (
                <ul className="input-section__thumbs" aria-label="Uploaded screenshots">
                  {values.imagesBase64.map((src, index) => (
                    <li
                      key={`${index}-${src.slice(0, 40)}`}
                      className="input-section__thumb"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Screenshot ${index + 1}`}
                        className="input-section__thumb-img"
                      />
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removeImageAt(index)}
                        className="input-section__thumb-remove"
                        aria-label={`Remove screenshot ${index + 1}`}
                      >
                        ×
                      </button>
                      <span className="input-section__thumb-index">{index + 1}</span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="input-section__help">
                Files stay in your browser for this session. Adding any text you can read from the photos keeps
                the report useful until OCR is wired in.
              </p>
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
