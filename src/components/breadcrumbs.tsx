import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: (BreadcrumbItem | undefined)[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  // Filter out undefined items
  const validItems = items.filter((item): item is BreadcrumbItem => !!item);

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4">
      {validItems.map((item, index) => (
        <React.Fragment key={item.href}>
          {index > 0 && (
            <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground/50" />
          )}
          {index === validItems.length - 1 ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;