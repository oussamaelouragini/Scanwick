import type { ViewportShot } from "../types";

type ResponsivePreviewProps = {
  shots: ViewportShot[] | null;
  loading: boolean;
  error: string | null;
};

function deviceIcon(width: number) {
  if (width <= 480) return "smartphone";
  if (width <= 1024) return "tablet_mac";
  return "desktop_windows";
}

export default function ResponsivePreview({
  shots,
  loading,
  error,
}: ResponsivePreviewProps) {
  const widths = shots?.map((shot) => `${shot.width} px`).join(", ");

  return (
    <section
      aria-labelledby="preview-heading"
      className="flex flex-col gap-gutter-md"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-gutter-sm">
        <h2
          id="preview-heading"
          className="font-headline text-headline-md text-on-surface"
        >
          Responsive preview
        </h2>
        <p className="font-body text-body-sm text-on-surface-variant">
          Captured across {widths || "375 px, 768 px, and 1280 px"} viewports
        </p>
      </div>

      {loading && (
        <div className="animate-pulse">
          <div className="grid items-stretch gap-gutter-md md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-md bg-surface-container-high" />
            ))}
          </div>
          <p className="mt-gutter-md text-center font-body text-body-sm text-on-surface-variant">
            Opening the site at 3 screen sizes...
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-error-container bg-error-container/30 p-gutter-md font-body text-body-md text-on-error-container">
          {error}
        </p>
      )}

      {shots && (
        <div className="grid items-stretch gap-gutter-md md:grid-cols-3">
          {shots.map((shot) => {
            const minorOverflow =
              shot.overflowing &&
              shot.pageWidth !== null &&
              shot.pageWidth - shot.width <= 10;

            return (
              <figure
                key={shot.label}
                className="flex flex-col overflow-hidden rounded-md border border-outline-variant/70 bg-surface-container-lowest shadow-sm"
              >
                <figcaption className="flex items-center justify-between gap-gutter-sm border-b border-outline-variant/50 p-gutter-md">
                  <div className="flex items-center gap-gutter-sm">
                    <span
                      className="material-symbols-outlined text-[18px] text-on-surface-variant"
                      aria-hidden="true"
                    >
                      {deviceIcon(shot.width)}
                    </span>
                    <div>
                      <p className="font-label text-label-lg text-on-surface">
                        {shot.label}
                      </p>
                      <p className="font-mono text-mono-sm text-on-surface-variant">
                        {shot.width} px wide
                      </p>
                    </div>
                  </div>

                  {shot.image &&
                    (shot.overflowing ? (
                      minorOverflow ? (
                        <span className="rounded-full bg-warning-container px-2.5 py-0.5 font-label text-label-sm text-on-warning-container">
                          Minor overflow
                        </span>
                      ) : (
                        <span className="rounded-full bg-error-container px-2.5 py-0.5 font-label text-label-sm text-on-error-container">
                          Horizontal scroll
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-success-container px-2.5 py-0.5 font-label text-label-sm text-on-success-container">
                        Fits screen
                      </span>
                    ))}
                </figcaption>

                <div className="flex flex-1 items-center justify-center bg-surface-container-low p-gutter-md">
                  {shot.image ? (
                    <img
                      src={shot.image}
                      alt={`${shot.label} screenshot at ${shot.width} pixels`}
                      className="h-64 w-auto max-w-full rounded-sm border border-outline-variant/60 object-cover object-top shadow-sm"
                    />
                  ) : (
                    <p className="text-center font-body text-body-sm text-on-surface-variant">
                      Could not capture this size
                      {shot.error ? `: ${shot.error}` : "."}
                    </p>
                  )}
                </div>

                {shot.overflowing && shot.pageWidth && (
                  <p className="border-t border-outline-variant/50 p-gutter-md font-body text-body-sm text-error">
                    Content is {shot.pageWidth} px wide,{" "}
                    {shot.pageWidth - shot.width} px more than the screen.
                  </p>
                )}
              </figure>
            );
          })}
        </div>
      )}
    </section>
  );
}
