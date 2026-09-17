"use client";

import { useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Point = { x: number; y: number };
type Stroke = Point[];

function stylePen(ctx: CanvasRenderingContext2D) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#D4FF4A";
  ctx.fillStyle = "#D4FF4A";
  ctx.lineWidth = 2.5;
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.length === 0) return;
  if (stroke.length === 1) {
    ctx.beginPath();
    ctx.arc(stroke[0].x, stroke[0].y, 1.25, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(stroke[0].x, stroke[0].y);
  for (let i = 1; i < stroke.length; i += 1) {
    ctx.lineTo(stroke[i].x, stroke[i].y);
  }
  ctx.stroke();
}

export function SignaturePad({
  onSubmit,
  busy,
}: {
  onSubmit: (dataUrl: string, method: "draw" | "type") => Promise<void> | void;
  busy?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const last = useRef<Point | null>(null);
  const currentStroke = useRef<Stroke>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const [strokeCount, setStrokeCount] = useState(0);
  const [typed, setTyped] = useState("");
  const [mode, setMode] = useState<"draw" | "type">("draw");

  const redrawRef = useRef(() => {});
  redrawRef.current = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    stylePen(ctx);
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }
  };

  useEffect(() => {
    if (mode !== "draw") return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const sync = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      if (width < 2 || height < 2) return;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stylePen(ctx);
      ctxRef.current = ctx;
      redrawRef.current();
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [mode]);

  function point(event: React.PointerEvent<HTMLDivElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function start(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const next = point(event);
    last.current = next;
    currentStroke.current = [next];
    const ctx = ctxRef.current;
    if (ctx) drawStroke(ctx, [next]);
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!drawing.current || !last.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const next = point(event);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    last.current = next;
    currentStroke.current.push(next);
  }

  function end(event: React.PointerEvent<HTMLDivElement>) {
    if (drawing.current && currentStroke.current.length > 0) {
      strokesRef.current = [...strokesRef.current, currentStroke.current];
      setStrokeCount(strokesRef.current.length);
    }
    drawing.current = false;
    last.current = null;
    currentStroke.current = [];
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function undo() {
    if (mode === "type") {
      setTyped((value) => value.slice(0, -1));
      return;
    }
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    redrawRef.current();
  }

  function typedToDataUrl() {
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 140;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#D4FF4A";
    ctx.font = "italic 42px Georgia";
    ctx.fillText(typed, 24, 84);
    return canvas.toDataURL("image/png");
  }

  async function submit() {
    if (mode === "type") {
      if (!typed.trim()) return;
      await onSubmit(typedToDataUrl(), "type");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas || strokeCount === 0) return;
    await onSubmit(canvas.toDataURL("image/png"), "draw");
  }

  const canUndo = mode === "draw" ? strokeCount > 0 : typed.length > 0;

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid min-w-0 grid-cols-2 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={mode === "draw" ? "default" : "outline"}
          className="min-w-0 px-2"
          onClick={() => setMode("draw")}
        >
          Draw
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "type" ? "default" : "outline"}
          className="min-w-0 px-2"
          onClick={() => setMode("type")}
        >
          Type
        </Button>
      </div>
      {mode === "draw" ? (
        <div
          ref={wrapRef}
          className="relative h-40 w-full min-w-0 touch-none overflow-hidden rounded-md border border-border bg-muted"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
      ) : (
        <div className="min-w-0 space-y-2">
          <Label>Type your full name</Label>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Full legal name" />
          <div className="overflow-hidden rounded-md border border-border px-4 py-6 font-[Georgia] text-2xl italic break-all text-foreground sm:text-3xl">
            {typed || "Signature preview"}
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-2">
        <Button type="button" variant="outline" disabled={!canUndo || busy} onClick={undo}>
          <Undo2 />
          Undo
        </Button>
        <Button type="button" disabled={busy} onClick={() => void submit()}>
          {busy ? "Saving…" : "Complete signature"}
        </Button>
      </div>
    </div>
  );
}
