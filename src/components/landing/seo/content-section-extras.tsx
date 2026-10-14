import Link from "next/link";
import type { ContentSection } from "@/lib/data/seo-expansion";
import { seo } from "./styles";

export function ContentSectionExtras({ section }: { section: ContentSection }) {
  return <>
    {section.table ? (
      <div className="mt-7 min-w-0 overflow-x-auto rounded-2xl border-2 border-black/20 dark:border-white/25" role="region" aria-label={section.table.caption} tabIndex={0}>
        <table className="w-full min-w-[640px] border-collapse text-left text-sm leading-6">
          <caption className="border-b-2 border-black/15 bg-[#F3E8FF] p-4 text-left font-semibold text-black dark:border-white/20">{section.table.caption}</caption>
          <thead className="bg-[#FFF5BA] text-black">
            <tr>{section.table.columns.map((column) => <th key={column} scope="col" className="p-4 align-top font-black">{column}</th>)}</tr>
          </thead>
          <tbody>{section.table.rows.map((row) => <tr key={row[0]} className="border-t border-black/15 dark:border-white/20">
            <th scope="row" className="p-4 align-top font-black">{row[0]}</th>
            {row.slice(1).map((cell, index) => <td key={index} className="p-4 align-top font-medium">{cell}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    ) : null}
    {section.links ? <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
      {section.links.map((link) => <li key={link.href}>
        {link.href.startsWith("https://") ? <a href={link.href} className={seo.link}>{link.label}</a> : <Link href={link.href} className={seo.link}>{link.label}</Link>}
        {link.description ? <p className="mt-1 leading-6 opacity-75">{link.description}</p> : null}
      </li>)}
    </ul> : null}
  </>;
}
