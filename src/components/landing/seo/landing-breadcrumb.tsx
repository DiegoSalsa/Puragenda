import Link from "next/link";
import { seo } from "./styles";

export type LandingCrumb = { href?: string; label: string };

export function LandingBreadcrumb({ items }: { items: LandingCrumb[] }) {
  return (
    <nav aria-label="Miga de pan" className={seo.breadcrumb}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href && !last ? (
                <Link href={item.href} className={seo.breadcrumbLink}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
