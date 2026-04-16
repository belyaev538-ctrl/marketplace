import Link from "next/link";
import type { ProductBreadcrumbItem } from "@/lib/product-breadcrumb";

function Chevron() {
  return (
    <svg
      className="mx-1 h-2 w-2 shrink-0 text-blueSteel"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 6 10"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="m1 9 4-4-4-4"
      />
    </svg>
  );
}

type Props = {
  items: ProductBreadcrumbItem[];
  className?: string;
};

export function CatalogBreadcrumb({ items, className = "" }: Props) {
  if (items.length === 0) return null;

  return (
    <nav className={`mb-2 flex ${className}`} aria-label="Хлебные крошки">
      <ol className="inline-flex flex-wrap items-center">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="inline-flex items-center">
            {index > 0 ? <Chevron /> : null}
            {item.href ? (
              <Link
                href={item.href}
                prefetch={false}
                className="text-[11px] font-normal text-blueSteel transition-colors hover:text-blue"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-[11px] font-semibold text-blueSteel2"
                aria-current="page"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
