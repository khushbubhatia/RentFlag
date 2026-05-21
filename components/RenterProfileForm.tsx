"use client";

import type { RenterPreferences } from "@/lib/types";

type RenterProfileFormProps = {
  preferences: RenterPreferences;
  onChange: (next: RenterPreferences) => void;
};

export function RenterProfileForm({ preferences, onChange }: RenterProfileFormProps) {
  const setNumber = (key: "monthlyTakeHomeIncome" | "maxMonthlyBudget", raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange({ ...preferences, [key]: null });
      return;
    }
    const value = Number.parseFloat(trimmed.replace(/,/g, ""));
    onChange({ ...preferences, [key]: Number.isNaN(value) ? null : value });
  };

  const toggleMustHave = (
    key:
      | "mustHaveInUnitLaundry"
      | "mustHaveParking"
      | "mustHavePetFriendly"
      | "mustHaveFurnished"
      | "mustHaveAirConditioning",
    checked: boolean,
  ) => {
    onChange({ ...preferences, [key]: checked });
  };

  return (
    <section className="renter-profile">
      <div className="renter-profile__accent" aria-hidden />
      <div className="renter-profile__body">
        <div className="renter-profile__lead">
          <p className="renter-profile__step">Step 2 (optional)</p>
          <h2 className="renter-profile__title">What you are optimizing for</h2>
          <p className="renter-profile__blurb">
            Optional. Budget and must-haves tune the budget-fit score and surface preference gaps—never a final
            verdict on applying.
          </p>
        </div>
        <div className="renter-profile__grid">
          <label className="renter-profile__label">
            Monthly take-home pay (after tax)
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 5200"
              className="renter-profile__input"
              value={preferences.monthlyTakeHomeIncome ?? ""}
              onChange={(event) => setNumber("monthlyTakeHomeIncome", event.target.value)}
            />
          </label>
          <label className="renter-profile__label">
            Target max rent (before utilities)
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 2100"
              className="renter-profile__input"
              value={preferences.maxMonthlyBudget ?? ""}
              onChange={(event) => setNumber("maxMonthlyBudget", event.target.value)}
            />
          </label>
          <label className="renter-profile__label renter-profile__label--full">
            Target move-in date
            <input
              type="date"
              className="renter-profile__input renter-profile__input--narrow"
              value={preferences.moveInDate}
              onChange={(event) => onChange({ ...preferences, moveInDate: event.target.value })}
            />
          </label>
        </div>
        <fieldset className="renter-profile__fieldset">
          <legend className="renter-profile__legend">Non-negotiables</legend>
          <div className="renter-profile__chips">
            {[
              ["mustHaveInUnitLaundry", "In-unit laundry"],
              ["mustHaveParking", "Parking"],
              ["mustHavePetFriendly", "Pet friendly"],
              ["mustHaveFurnished", "Furnished"],
              ["mustHaveAirConditioning", "Air conditioning"],
            ].map(([key, label]) => (
              <label key={key} className="renter-profile__chip">
                <input
                  type="checkbox"
                  className="renter-profile__chip-input"
                  checked={preferences[key as keyof RenterPreferences] as boolean}
                  onChange={(event) =>
                    toggleMustHave(
                      key as
                        | "mustHaveInUnitLaundry"
                        | "mustHaveParking"
                        | "mustHavePetFriendly"
                        | "mustHaveFurnished"
                        | "mustHaveAirConditioning",
                      event.target.checked,
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
