import { useEffect, useState } from "react";
import { fetchStaticPage, type StaticPage } from "../../../api/staticPageApi";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#e2e8f0] ${className ?? ""}`} />;
}

function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <Skeleton className="mb-4 h-10 w-3/4" />
      <Skeleton className="mb-2 h-5 w-full" />
      <Skeleton className="mb-10 h-5 w-5/6" />
      <Skeleton className="mx-auto mb-8 h-80 w-full max-w-2xl rounded-2xl" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-8">
          <Skeleton className="mb-3 h-6 w-1/2" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  const [page, setPage] = useState<StaticPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaticPage("gioithieu")
      .then(setPage)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  if (!page) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[#64748b]">
        Không thể tải nội dung. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">

      {/* Tiêu đề */}
      <h1 className="text-[1.9rem] font-extrabold leading-tight text-(--color-primary) sm:text-[2.4rem]">
        {page.title}
      </h1>

      {/* Summary — in đậm */}
      {page.summary && (
        <p className="mt-5 text-[1.05rem] font-semibold leading-8 text-(--color-title)">
          {page.summary}
        </p>
      )}

      {/* Ảnh banner */}
      {page.images.length > 0 && (
        <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl">
          <img
            src={page.images[0]}
            alt={page.title}
            className="h-auto w-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://placehold.co/900x380/e2e8f0/94a3b8?text=KTX+STU";
            }}
          />
        </div>
      )}

      {/* Nội dung HTML */}
      {page.content && (
        <div
          className="
            mt-8
            text-[1rem] leading-8 text-[#3a465e]
            [&_h3]:mb-3 [&_h3]:mt-10 [&_h3]:text-[1.15rem] [&_h3]:font-bold [&_h3]:text-(--color-title)
            [&_p]:mb-5
            first:[&_h3]:mt-0
          "
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      )}
    </div>
  );
}
