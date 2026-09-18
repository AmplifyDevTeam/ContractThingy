"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { StepTransition } from "@/components/motion/step-transition";
import { SignaturePad } from "@/components/signing/signature-pad";
import {
  consentSigningAction,
  openSigningAction,
  recipientSignAction,
  sendSigningOtpAction,
  verifySigningOtpAction,
} from "@/lib/actions/signing";
import { broadcastSigningEvent } from "@/components/documents/document-live-sync";
import { publicApiBase, workspaceLogoUrl } from "@/lib/branding/public-api";

type Payload = Awaited<ReturnType<typeof openSigningAction>>;
type Stage = "otp" | "review" | "sign" | "done";

export default function SignPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<Payload | undefined>(undefined);
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<Stage>("review");
  const [busy, setBusy] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [brand, setBrand] = useState({
    name: "Amplify",
    product: "ContractOS",
    logoSrc: workspaceLogoUrl("dark"),
    logoIsWordmark: true,
    logoScale: 3,
  });

  useEffect(() => {
    void fetch(`${publicApiBase()}/workspace/branding`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          payload: {
            displayName?: string;
            productName?: string;
            slug?: string;
            logoDark?: string;
            usesCustomLogo?: boolean;
            shellLogoScale?: number;
          } | null,
        ) => {
          if (!payload) return;
          setBrand({
            name: payload.displayName || "Amplify",
            product: payload.productName || "ContractOS",
            logoSrc: workspaceLogoUrl("dark", `${payload.slug ?? ""}-${payload.logoDark ?? ""}`),
            logoIsWordmark: !payload.usesCustomLogo,
            logoScale: payload.shellLogoScale ?? 3,
          });
        },
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void openSigningAction(token).then((payload) => {
      setData(payload);
      if (payload?.finalized || payload?.recipientSignedAt) {
        setStage("done");
      } else if (payload?.requireOtp && !payload.otpVerified) {
        setStage("otp");
        void sendSigningOtpAction(token).catch(() => {
          /* code may already have been emailed on send */
        });
      } else {
        setStage("review");
      }
    });
  }, [token]);

  async function reload() {
    const payload = await openSigningAction(token);
    setData(payload);
    return payload;
  }

  if (data === undefined) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <p className="text-muted-foreground">Loading agreement…</p>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
        <p className="text-muted-foreground">This signing link is invalid, expired, or revoked.</p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <StepTransition stepKey="done">
        <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
          <BrandMark
            stacked
            name={brand.name}
            product={brand.product}
            logoSrc={brand.logoSrc}
            logoIsWordmark={brand.logoIsWordmark}
            logoScale={brand.logoScale}
          />
          <h1 className="font-display mt-8 text-[2.4rem] leading-tight tracking-tight">Agreement completed</h1>
          <p className="mt-4 text-muted-foreground">
            {data.documentName}
            <br />
            Amplify Media Technologies
            <br />
            {data.partyName}
          </p>
          {data.signedAt ? (
            <p className="mt-4 text-sm">Signed {data.signedAt.slice(0, 10)}</p>
          ) : (
            <p className="mt-4 text-sm">Your signature has been recorded. Amplify will countersign to finalize.</p>
          )}
          {data.sha256 ? (
            <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">{data.sha256}</p>
          ) : null}
        </div>
      </StepTransition>
    );
  }

  if (stage === "otp") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <BrandMark
          stacked
          name={brand.name}
          product={brand.product}
          logoSrc={brand.logoSrc}
          logoIsWordmark={brand.logoIsWordmark}
          logoScale={brand.logoScale}
        />
        <h1 className="font-display mt-8 text-[2rem] tracking-tight">Verify your email</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter the 6-digit code sent to confirm you can access {data.documentName}.
        </p>
        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification code</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="tracking-[0.3em]"
            />
          </div>
          <Button
            className="w-full"
            disabled={otpCode.length < 6 || busy}
            onClick={() => {
              setBusy(true);
              void verifySigningOtpAction(token, otpCode)
                .then(() => reload())
                .then((payload) => {
                  if (payload?.otpVerified || !payload?.requireOtp) setStage("review");
                })
                .catch((error: Error) => toast.error(error.message))
                .finally(() => setBusy(false));
            }}
          >
            Verify and continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void sendSigningOtpAction(token)
                .then(() => toast.success("Code sent"))
                .catch((error: Error) => toast.error(error.message))
                .finally(() => setBusy(false));
            }}
          >
            Resend code
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <BrandMark
            name={brand.name}
            product={brand.product}
            logoSrc={brand.logoSrc}
            logoIsWordmark={brand.logoIsWordmark}
            logoScale={brand.logoScale}
          />
          <p className="mt-8 text-[13px] text-muted-foreground">{data.readableId}</p>
          <h1 className="font-display mt-2 text-[2.15rem] leading-tight tracking-tight">{data.documentName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{data.recipientName}</p>
        </div>
        <ThemeToggle compact />
      </div>
      {data.html ? (
        <iframe title="Agreement" className="mb-6 h-[70vh] w-full rounded-md border border-border bg-muted" srcDoc={data.html} />
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">Agreement content unlocks after verification.</p>
      )}
      <StepTransition stepKey={stage}>
        {stage === "review" ? (
          <div className="space-y-4 rounded-md border border-border p-5">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={consent} onCheckedChange={(value) => setConsent(Boolean(value))} />
              <span>I confirm that I have reviewed this agreement and consent to signing it electronically.</span>
            </label>
            <Button
              disabled={!consent || busy}
              onClick={() => {
                setBusy(true);
                void consentSigningAction(token)
                  .then(() => setStage("sign"))
                  .catch((error: Error) => toast.error(error.message))
                  .finally(() => setBusy(false));
              }}
            >
              Continue to sign
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-border p-5">
            <SignaturePad
              busy={busy}
              onSubmit={async (dataUrl, method) => {
                setBusy(true);
                try {
                  const result = await recipientSignAction(token, dataUrl, method);
                  broadcastSigningEvent({
                    documentId: result.documentId,
                    type: "recipient_signed",
                  });
                  setStage("done");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not sign");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
        )}
      </StepTransition>
    </div>
  );
}
