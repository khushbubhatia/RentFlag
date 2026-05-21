export function HomeAside() {
  return (
    <aside className="home-rail" aria-labelledby="home-rail-heading">
      <div className="home-rail__sticky">
        <p className="home-rail__eyebrow">For renters, not landlords</p>
        <h2 id="home-rail-heading" className="home-rail__title">
          You shouldn&apos;t need a lawyer to read a Craigslist ad.
        </h2>
        <p className="home-rail__lede">
          RentFlag turns messy listings into something you can act on: what&apos;s actually in the text, what&apos;s
          fuzzy, and what to ask before you wire money.
        </p>

        <ul className="home-rail__points">
          <li className="home-rail__point">
            <span className="home-rail__point-mark" aria-hidden />
            <div>
              <strong className="home-rail__point-title">Facts you can point to</strong>
              <p className="home-rail__point-text">Rent, fees, pets, laundry—pulled from your paste with confidence cues.</p>
            </div>
          </li>
          <li className="home-rail__point">
            <span className="home-rail__point-mark" aria-hidden />
            <div>
              <strong className="home-rail__point-title">A checklist, not a vibe check</strong>
              <p className="home-rail__point-text">Patterns worth clarifying—wording games, missing numbers, weird asks.</p>
            </div>
          </li>
          <li className="home-rail__point">
            <span className="home-rail__point-mark" aria-hidden />
            <div>
              <strong className="home-rail__point-title">Tour questions in plain English</strong>
              <p className="home-rail__point-text">Copy-ready lines for email or DM so you don&apos;t forget what to verify.</p>
            </div>
          </li>
        </ul>

        <blockquote className="home-rail__quote">
          <p>&ldquo;The ad looked fine until RentFlag showed what wasn&apos;t actually promised.&rdquo;</p>
          <footer>— the kind of note we hear from early renters testing the tool</footer>
        </blockquote>

        <div className="home-rail__mini-stat" role="status">
          <span className="home-rail__mini-stat-value">Your paste</span>
          <span className="home-rail__mini-stat-label">Stays the source of truth—we don&apos;t invent rent or deals.</span>
        </div>
      </div>
    </aside>
  );
}
