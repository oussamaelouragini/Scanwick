import type { ViewportShot } from "../types";

type ResponsivePreviewProps = {
  shots: ViewportShot[] | null;
  loading: boolean;
  error: string | null;
};

export default function ResponsivePreview({
  shots,
  loading,
  error,
}: ResponsivePreviewProps) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Responsive preview
      </h2>

      {loading && (
        <div className="animate-pulse">
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-xl bg-slate-200" />
            ))}
          </div>
          <p className="mt-3 text-center text-sm text-slate-500">
            Opening the site at 3 screen sizes...
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {shots && (
        <div className="grid items-start gap-4 sm:grid-cols-3">
          {shots.map((shot) => (
            <figure
              key={shot.label}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <figcaption className="flex items-center justify-between gap-2 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {shot.label}
                  </p>
                  <p className="text-xs text-slate-400">{shot.width} px wide</p>
                </div>

                {shot.image &&
                  (shot.overflowing ? (
                    shot.pageWidth && shot.pageWidth - shot.width <= 10 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Minor overflow
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Horizontal scroll
                      </span>
                    )
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Fits screen
                    </span>
                  ))}
              </figcaption>

              {shot.image ? (
                <img
                  src={shot.image}
                  alt={`${shot.label} screenshot at ${shot.width} pixels`}
                  className="w-full border-t border-slate-200"
                />
              ) : (
                <p className="border-t border-slate-200 p-3 text-xs text-slate-500">
                  Could not capture this size
                  {shot.error ? `: ${shot.error}` : "."}
                </p>
              )}

              {shot.overflowing && shot.pageWidth && (
                <p className="border-t border-slate-200 p-3 text-xs text-red-600">
                  Content is {shot.pageWidth} px wide,{" "}
                  {shot.pageWidth - shot.width} px more than the screen.
                </p>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
