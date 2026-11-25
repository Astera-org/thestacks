import { MyST } from "myst-to-react";
import { useMystmdContext } from "./MystmdContext";

/** The footnotes, after the body, styled like the other backmatter. */
export default function MystmdFootnotes() {
  const { definitions, firstReferenceKey } = useMystmdContext().footnotes;
  if (definitions.length === 0) return null;
  return (
    <section className="backmatter mystmd-footnotes">
      <div className="backmatter-item">
        <h1>Footnotes</h1>
        <ol>
          {definitions.map((definition) => {
            const identifier = String(definition.identifier);
            const referenceKey = firstReferenceKey.get(identifier);
            return (
              <li
                key={definition.key}
                id={`fn-${identifier}`}
                value={Number(definition.enumerator)}
              >
                <MyST ast={definition.children} />
                {referenceKey && (
                  <a
                    aria-label="Back to the text"
                    className="footnote-backref"
                    href={`#fnref-${referenceKey}`}
                  >
                    ↩
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
