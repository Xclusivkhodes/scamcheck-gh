"use client";

import { useMemo, useState } from "react";
import { cardSvg } from "@/lib/card";
import { verdictWord } from "@/lib/copy";
import type { Lang, Verdict } from "@/lib/types";

export function VerdictCard({
  verdict,
  headline,
  pattern,
  lang,
}: {
  verdict: Verdict;
  headline: string;
  pattern: string;
  lang: Lang;
}) {
  const svg = useMemo(() => cardSvg({ verdict, headline, pattern, lang }), [verdict, headline, pattern, lang]);
  const [note, setNote] = useState("");
  const word = verdictWord(verdict, lang);

  async function download() {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0);
      canvas.toBlob((png) => {
        if (!png) return;
        const fileUrl = URL.createObjectURL(png);
        const anchor = document.createElement("a");
        anchor.href = fileUrl;
        anchor.download = "scamcheck-card.png";
        anchor.click();
        URL.revokeObjectURL(fileUrl);
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.onerror = () => {
      setNote("The card image could not be drawn. You can still copy the link.");
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  async function share() {
    const link = window.location.href;
    const text = `ScamCheck GH: ${word}. ${headline} Do not send money or share your PIN.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `ScamCheck GH · ${word}`, text, url: link });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(`${text} ${link}`);
    setNote("Link copied.");
  }

  return (
    <article className="prose">
      <p className="t-overline t-muted">Check for family</p>
      <h1 className="t-h1">{word}</h1>
      <p>{headline}</p>
      <p className="t-muted">{pattern}. The full message is not on this card.</p>
      <div className="card overflow-hidden" dangerouslySetInnerHTML={{ __html: svg.replace(/<\?xml[^>]*>/, "") }} />
      <div className="cluster">
        <button type="button" className="btn btn-primary btn-md" onClick={() => void download()}>
          Download card
        </button>
        <button type="button" className="btn btn-secondary btn-md" onClick={() => void share()}>
          Share card
        </button>
      </div>
      {note ? <p role="status">{note}</p> : null}
      <p className="t-small t-muted">Twi on a card is beta and has not been checked by a native speaker.</p>
    </article>
  );
}
