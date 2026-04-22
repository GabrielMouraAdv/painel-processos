import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  total,
  searchParams,
}: {
  page: number;
  totalPages: number;
  total: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (totalPages <= 1) {
    return (
      <div className="text-sm text-muted-foreground">
        {total} processo{total === 1 ? "" : "s"}
      </div>
    );
  }

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === "string") params.set(k, v);
    }
    params.set("page", String(p));
    return `/app/processos?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Pagina {page} de {totalPages} — {total} processo{total === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        <Button
          asChild={page > 1}
          variant="outline"
          size="sm"
          disabled={page <= 1}
          className={cn(page <= 1 && "pointer-events-none opacity-50")}
        >
          {page > 1 ? (
            <Link href={hrefFor(page - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Link>
          ) : (
            <span>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </span>
          )}
        </Button>
        <Button
          asChild={page < totalPages}
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          className={cn(page >= totalPages && "pointer-events-none opacity-50")}
        >
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)}>
              Proxima
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          ) : (
            <span>
              Proxima
              <ChevronRight className="ml-1 h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
