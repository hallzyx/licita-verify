"use client";

import type { ReactNode, TableHTMLAttributes } from "react";

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
  children: ReactNode;
}

export function Table({ headers, children, className = "", ...props }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className={`min-w-full divide-y divide-gray-200 ${className}`} {...props}>
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>
      </table>
    </div>
  );
}

interface TableRowProps {
  children: ReactNode;
  href?: string;
  className?: string;
}

export function TableRow({ children, href, className = "" }: TableRowProps) {
  const baseClasses = `transition-colors hover:bg-gray-50 ${className}`;

  if (href) {
    return (
      <tr
        className={`${baseClasses} cursor-pointer`}
        onClick={() => {
          window.location.href = href;
        }}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            window.location.href = href;
          }
        }}
      >
        {children}
      </tr>
    );
  }

  return <tr className={baseClasses}>{children}</tr>;
}

export function TableCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${className}`}>
      {children}
    </td>
  );
}
