import { Fragment } from "react";

/** Renders only plain text, line breaks, bullets and bold. React escapes all content. */
export function PuriMessageText({ content }: { content: string }) {
  return <div className="space-y-1.5">{content.split(/\r?\n/).map((line, lineIndex) => {
    const bullet = /^\s*[-*•]\s+/.test(line);
    const clean = bullet ? line.replace(/^\s*[-*•]\s+/, "") : line;
    return <p key={lineIndex} className={bullet ? "pl-4 -indent-4" : undefined}>
      {bullet && <span aria-hidden="true">• </span>}
      {clean.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => part.startsWith("**") && part.endsWith("**")
        ? <strong key={partIndex} className="font-black">{part.slice(2, -2)}</strong>
        : <Fragment key={partIndex}>{part.replace(/\*\*/g, "")}</Fragment>)}
      {!clean && "\u00a0"}
    </p>;
  })}</div>;
}
