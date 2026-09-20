import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { IconMark } from "@/components/icon-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { fragmentHref, harmonyLabel, styleLabel, useSnippet, type RenderedIcon } from "@/lib/icons";
import { standaloneIcon } from "@/lib/sprite";
import { copyText } from "@/lib/utils";

type IconDetailProps = {
  icon: RenderedIcon | null;
  /** Coordinate space the sprite was generated in. */
  size: number;
  onOpenChange: (open: boolean) => void;
  onDownloadSprite?: () => void;
};

export function IconDetail({ icon, size, onOpenChange, onDownloadSprite }: IconDetailProps) {
  return (
    <Dialog open={Boolean(icon)} onOpenChange={onOpenChange}>
      <DialogContent className="grid gap-5 sm:p-6">
        {icon ? <DetailBody icon={icon} size={size} onDownloadSprite={onDownloadSprite} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({
  icon,
  size,
  onDownloadSprite,
}: {
  icon: RenderedIcon;
  size: number;
  onDownloadSprite?: () => void;
}) {
  const snippet = useSnippet(icon.id, size);
  const fragment = fragmentHref(icon.id);
  const standalone = standaloneIcon(icon, size);

  return (
    <>
      <div className="flex flex-col gap-3 pr-10">
        <Badge>{harmonyLabel(icon.harmony)}</Badge>
        <DialogTitle className="font-mono text-lg tracking-tight">{icon.id}</DialogTitle>
        <DialogDescription>
          {styleLabel(icon.style)} on {platePhrase(icon.plate)}. Hue {Math.round(icon.hue)}°.
          Reference it as an SVG fragment from the sprite.
        </DialogDescription>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="flex items-center justify-center rounded-lg bg-bg p-6 shadow-[var(--shadow-border)]">
          <IconMark id={icon.id} className="size-32" title={icon.id} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <ScalePreview id={icon.id} box="size-16" label="64" />
          <ScalePreview id={icon.id} box="size-8" label="32" />
          <ScalePreview id={icon.id} box="size-4" label="16" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {icon.colors.map((hex) => (
          <ColorSwatch key={hex} hex={hex} />
        ))}
      </div>

      <Separator />

      <div className="grid gap-2">
        <p className="font-mono text-micro uppercase tracking-wider text-subtle">Fragment</p>
        <CopyRow value={fragment} label="Fragment copied" />
        <p className="mt-2 font-mono text-micro uppercase tracking-wider text-subtle">Usage</p>
        <pre className="overflow-x-auto rounded-md bg-bg p-3 font-mono text-xs leading-relaxed text-muted shadow-[var(--shadow-border)]">
          {snippet}
        </pre>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void copyAndToast(snippet, "Usage snippet copied")}>
            <Copy className="size-3.5" />
            Copy snippet
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void copyAndToast(standalone, "Standalone SVG copied")}
          >
            <Copy className="size-3.5" />
            Copy standalone SVG
          </Button>
          {onDownloadSprite ? (
            <Button size="sm" variant="outline" onClick={onDownloadSprite}>
              <Download className="size-3.5" />
              Sprite
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ScalePreview({ id, box, label }: { id: string; box: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center rounded-sm bg-bg p-1.5 shadow-[var(--shadow-border)]">
        <IconMark id={id} className={box} />
      </div>
      <span className="font-mono text-micro tabular-nums text-subtle">{label}</span>
    </div>
  );
}

function ColorSwatch({ hex }: { hex: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void copyAndToast(hex, `${hex} copied`).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="flex h-11 items-center gap-2 rounded-md bg-surface pr-3 pl-1.5 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-border-hover)]"
    >
      <span
        className="size-7 rounded-sm shadow-[var(--shadow-border)]"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
      <span className="font-mono text-micro text-muted">{hex}</span>
      {copied ? <Check className="size-3 text-fg" /> : <Copy className="size-3 text-subtle" />}
    </button>
  );
}

function CopyRow({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-stretch gap-2">
      <code className="flex min-h-11 min-w-0 flex-1 items-center overflow-x-auto rounded-md bg-bg px-3 font-mono text-xs text-fg shadow-[var(--shadow-border)]">
        {value}
      </code>
      <Button
        variant="outline"
        size="icon"
        aria-label="Copy"
        onClick={() => void copyAndToast(value, label)}
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

async function copyAndToast(text: string, message: string) {
  await copyText(text);
  toast(message);
}

function platePhrase(plate: string) {
  if (plate === "none") return "no plate";
  const article = /^[aeiou]/i.test(plate) ? "an" : "a";
  return `${article} ${plate} plate`;
}
