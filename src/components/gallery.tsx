import { Copy, Dices, Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconDetail } from "@/components/icon-detail";
import { IconMark } from "@/components/icon-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { harmonyLabel, padIndex, type RenderedIcon } from "@/lib/icons";
import {
  COUNT_LIMIT,
  DEFAULT_SIZE,
  HARMONIES,
  SEED_LIMIT,
  downloadSprite,
  getSprite,
  randomSeed,
  type SpriteOptions,
} from "@/lib/sprite";
import { copyText, cn } from "@/lib/utils";

type GalleryProps = {
  options: SpriteOptions;
  onOptionsChange: (patch: Partial<SpriteOptions>) => void;
};

export function Gallery({ options, onOptionsChange }: GalleryProps) {
  const { seed, count, size, harmonies } = options;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RenderedIcon | null>(null);
  const [rebuildMs, setRebuildMs] = useState<number | null>(null);

  // getSprite is cached by settings, so this is a lookup — and the reference
  // stays stable, which keeps the grid's useMemo below from re-running.
  const {
    sprite,
    manifest,
    icons: allIcons,
  } = getSprite({
    seed,
    count,
    size,
    harmonies,
  });

  const icons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allIcons;
    return allIcons.filter(
      (icon) =>
        icon.id.includes(q) ||
        icon.style.includes(q) ||
        icon.harmony.includes(q) ||
        icon.plate.includes(q) ||
        padIndex(icon.index).includes(q),
    );
  }, [allIcons, query]);

  /** Apply a change and measure what the browser needed to rebuild the set. */
  const apply = (patch: Partial<SpriteOptions>) => {
    const started = performance.now();
    getSprite({ seed, count, size, harmonies, ...patch }); // happens right here
    setRebuildMs(performance.now() - started);
    setSelected(null);
    onOptionsChange(patch);
  };

  const handleDownload = () => {
    downloadSprite(sprite, `atelier64-seed${seed}.svg`);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-12">
      {/* The sprite lives in the document, so `#icon-001` references resolve. */}
      <div
        aria-hidden
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        dangerouslySetInnerHTML={{ __html: sprite }}
      />

      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="font-mono text-micro uppercase tracking-[0.22em] text-muted">
              SVG symbol sprite
            </p>
            <h1 className="mt-3 font-display text-3xl leading-tight font-medium tracking-tight text-fg">
              Atelier 64
            </h1>
            <p className="mt-3 max-w-prose text-base text-muted">
              Marks painted with a classical color-harmony palette and packed as a{" "}
              <code className="font-mono text-sm text-fg">{"<symbol>"}</code> in one sprite. Every
              setting below goes straight to the generator in your browser — and into the address
              bar, so the result keeps.
            </p>
          </div>
          <Button onClick={handleDownload}>
            <Download className="size-4" />
            Download sprite
          </Button>
        </div>

        <Settings options={options} onApply={apply} rebuildMs={rebuildMs} />

        <UsageCard size={size} />
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search id, style, harmony"
              aria-label="Search icons"
              className="pl-10"
            />
          </div>
          <p className="font-mono text-xs tabular-nums text-muted">
            {icons.length} / {manifest.count}
          </p>
        </div>
      </section>

      {icons.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">No marks match that search.</p>
      ) : (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {icons.map((icon) => (
            <li key={icon.id}>
              <button
                type="button"
                onClick={() => setSelected(icon)}
                className="flex min-h-11 w-full flex-col items-center gap-2 rounded-lg p-2 hover:bg-surface transition-[background-color] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:outline-none"
              >
                <IconMark id={icon.id} className="size-10 sm:size-12" />
                <span className="font-mono text-micro tabular-nums text-subtle">
                  {padIndex(icon.index)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Footer seed={seed} count={manifest.count} />

      <IconDetail
        icon={selected}
        size={size}
        onOpenChange={(open) => !open && setSelected(null)}
        onDownloadSprite={handleDownload}
      />
    </div>
  );
}

// --- settings --------------------------------------------------------------

type SettingsProps = {
  options: SpriteOptions;
  onApply: (patch: Partial<SpriteOptions>) => void;
  rebuildMs: number | null;
};

function Settings({ options, onApply, rebuildMs }: SettingsProps) {
  const { seed, count, size, harmonies } = options;

  const [seedDraft, onSeedDraft] = useDraft(seed, (n) => onApply({ seed: n }), 1, SEED_LIMIT);
  const [countDraft, onCountDraft] = useDraft(count, (n) => onApply({ count: n }), 1, COUNT_LIMIT);
  const [sizeDraft, onSizeDraft] = useDraft(size, (n) => onApply({ size: n }), 8, 1024);

  const selected = harmonies ?? [...HARMONIES];
  const isAll = selected.length === HARMONIES.length;

  const toggleHarmony = (harmony: string) => {
    const next = selected.includes(harmony as never)
      ? selected.filter((h) => h !== harmony)
      : [...selected, harmony as never];
    if (next.length === 0) {
      toast("At least one harmony has to stay selected");
      return;
    }
    onApply({ harmonies: next.length === HARMONIES.length ? undefined : next });
  };

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Icons">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={COUNT_LIMIT}
            value={countDraft}
            onChange={(e) => onCountDraft(e.target.value)}
            aria-label="Icon count"
            className="h-9 font-mono text-sm"
          />
        </Field>

        <Field label="Size" hint="coordinate space">
          <Input
            type="number"
            inputMode="numeric"
            min={8}
            max={1024}
            value={sizeDraft}
            onChange={(e) => onSizeDraft(e.target.value)}
            aria-label="Size"
            className="h-9 font-mono text-sm"
          />
        </Field>

        <Field label="Seed">
          <div className="flex items-stretch gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={SEED_LIMIT}
              value={seedDraft}
              onChange={(e) => onSeedDraft(e.target.value)}
              aria-label="Seed"
              className="h-9 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-label="Random seed"
              onClick={() => onApply({ seed: randomSeed(SEED_LIMIT) })}
            >
              <Dices className="size-4" />
            </Button>
          </div>
        </Field>
      </dl>

      <div className="rounded-lg bg-elevated px-4 py-3 shadow-[var(--shadow-border)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-micro uppercase tracking-wider text-subtle">Harmonies</p>
          <p className="font-mono text-micro text-subtle">
            {isAll ? "all eight" : `drawn from ${selected.length} of ${HARMONIES.length}`}
          </p>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Chip label="All" active={isAll} onClick={() => onApply({ harmonies: undefined })} />
          {HARMONIES.map((harmony) => (
            <Chip
              key={harmony}
              label={harmonyLabel(harmony)}
              active={selected.includes(harmony)}
              onClick={() => toggleHarmony(harmony)}
            />
          ))}
        </div>
      </div>

      <p className="font-mono text-micro text-subtle" aria-live="polite">
        {rebuildMs === null
          ? "Deterministic — the same settings always paint the same sprite."
          : `Rebuilt in this browser in ${rebuildMs.toFixed(1)} ms`}
      </p>
    </div>
  );
}

/**
 * A number field the user can type into freely. Valid input is applied right
 * away; the draft follows the value again when it changes from outside (a
 * shared link, the back button, the dice).
 */
function useDraft(value: number, apply: (value: number) => void, min: number, max: number) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const change = (raw: string) => {
    setDraft(raw);
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
      apply(parsed);
    }
  };

  return [draft, change] as const;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-elevated px-4 py-3 shadow-[var(--shadow-border)]">
      <dt className="flex items-baseline justify-between gap-2 font-mono text-micro uppercase tracking-wider text-subtle">
        {label}
        {hint ? <span className="normal-case tracking-normal">{hint}</span> : null}
      </dt>
      <dd className="mt-2">{children}</dd>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-full px-3 font-mono text-xs tracking-wide whitespace-nowrap",
        "transition-[background-color,color,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
        active
          ? "bg-accent text-accent-fg"
          : "bg-transparent text-muted shadow-[var(--shadow-border)] hover:text-fg hover:shadow-[var(--shadow-border-hover)]",
      )}
    >
      {label}
    </button>
  );
}

/**
 * The snippet is live: the viewBox is the size the sprite was actually built
 * with, and the display size is yours to choose.
 */
function UsageCard({ size }: { size: number }) {
  const [draft, setDraft] = useState("64");
  const parsed = Number.parseInt(draft, 10);
  const display = Number.isFinite(parsed) && parsed >= 8 && parsed <= 1024 ? parsed : DEFAULT_SIZE;

  const markup = `<svg width="${display}" height="${display}" viewBox="0 0 ${size} ${size}">
  <use href="#icon-001" />
</svg>`;

  return (
    <aside className="rounded-xl bg-elevated p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-micro uppercase tracking-wider text-subtle">
          Fragment reference
        </p>
        <div className="flex items-center gap-2">
          <label className="font-mono text-micro text-subtle" htmlFor="usage-display">
            display px
          </label>
          <Input
            id="usage-display"
            type="number"
            inputMode="numeric"
            min={8}
            max={1024}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Display size"
            className="h-9 w-20 font-mono text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void copyAndToast(markup, "Markup copied")}
          >
            <Copy className="size-3.5" />
            Copy
          </Button>
        </div>
      </div>
      <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-muted">
        {markup}
      </pre>
    </aside>
  );
}

async function copyAndToast(text: string, message: string) {
  await copyText(text);
  toast(message);
}

function Footer({ seed, count }: { seed: number; count: number }) {
  return (
    <footer className="mt-auto flex flex-col gap-2 border-t border-border pt-6 pb-[env(safe-area-inset-bottom)] text-sm text-subtle">
      <p>
        Palettes from complementary, analogous, triadic, split-complementary, tetradic, square,
        monochromatic, and compound harmonies.
      </p>
      <p className="font-mono text-micro">
        {count} icons from seed {seed} · generated by @svgforge/generative-icons
      </p>
    </footer>
  );
}
