"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2Icon, PaperclipIcon, TriangleAlertIcon, UploadIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { getProduct } from "@/lib/api/products";
import { getRefundEligibility, submitRefund } from "@/lib/api/requests";
import { RefundError } from "@/lib/errors";
import { formatCurrency, formatDate } from "@/lib/format";
import { useSession } from "@/hooks/use-session";
import type { Product, Transaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ProductTypeBadge } from "@/components/store/product-badges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const REASON_CATEGORIES = [
  "Duplicate Charge",
  "Service Issue",
  "Accidental Purchase",
  "Other",
] as const;

const refundFormSchema = z.object({
  reasonCategory: z.enum(REASON_CATEGORIES, {
    message: "Select a reason category.",
  }),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters."),
});

type RefundFormValues = z.infer<typeof refundFormSchema>;

export interface RefundModalProps {
  open: boolean;
  transaction: Transaction | null;
  onOpenChange: (open: boolean) => void;
}

function AttachmentDropzone({
  value,
  onChange,
}: {
  value: string[];
  onChange: (names: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const names = Array.from(files).map((file) => file.name);
    onChange(Array.from(new Set([...value, ...names])));
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground transition-colors",
          dragActive
            ? "border-[#3B82F6] bg-[#3B82F6]/5"
            : "border-slate-800/60",
        )}
      >
        <UploadIcon className="size-5" />
        <p>
          Drag &amp; drop files here, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded font-medium text-[#3B82F6] underline underline-offset-2 outline-none transition-colors hover:text-[#60A5FA] focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            browse
          </button>
        </p>
        <p className="text-[0.7rem]">
          File names are noted only — uploads aren&apos;t wired up yet.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {value.length > 0 && (
        <ul className="flex flex-col gap-1">
          {value.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-800/60 px-2 py-1 text-xs"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{name}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${name}`}
                className="rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                onClick={() =>
                  onChange(value.filter((item) => item !== name))
                }
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RefundModal({
  open,
  transaction,
  onOpenChange,
}: RefundModalProps) {
  const { currentUser } = useSession();
  const [attachments, setAttachments] = useState<string[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const submittingRef = useRef(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: { description: "" },
  });

  useEffect(() => {
    if (open) {
      reset();
      setAttachments([]);
    }
  }, [open, transaction?.id, reset]);

  useEffect(() => {
    let active = true;
    const productId = transaction?.productId;

    if (!open || !productId) {
      setProduct(null);
      return;
    }

    getProduct(productId).then((next) => {
      if (active) setProduct(next);
    });

    return () => {
      active = false;
    };
  }, [open, transaction?.productId]);

  const isOpen = open && transaction !== null;
  const eligibility = transaction ? getRefundEligibility(transaction) : null;
  const ineligible = eligibility !== null && !eligibility.eligible;

  async function onSubmit(values: RefundFormValues) {
    if (!transaction || !currentUser || ineligible) return;
    if (submittingRef.current) return;

    submittingRef.current = true;

    try {
      const request = await submitRefund({
        transactionId: transaction.id,
        userId: currentUser.id,
        reason: `${values.reasonCategory} — ${values.description}`,
        amount: transaction.amount,
        currency: transaction.currency,
      });

      reset();
      setAttachments([]);
      onOpenChange(false);

      toast.success("Refund request submitted", {
        description: (
          <Link
            href={`/dashboard/requests/${request.id}`}
            className="font-medium text-[#3B82F6] underline underline-offset-2"
          >
            View request
          </Link>
        ),
      });
    } catch (error) {
      if (error instanceof RefundError) {
        toast.error(error.message);
      } else {
        toast.error("Couldn't submit your request", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    } finally {
      submittingRef.current = false;
    }
  }

  const submitDisabled =
    isSubmitting || !transaction || !currentUser || ineligible;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a refund</DialogTitle>
          <DialogDescription>
            Tell us why you&apos;d like this transaction refunded.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="refund-transaction-id">Transaction ID</Label>
              <Input
                id="refund-transaction-id"
                readOnly
                value={transaction?.reference ?? ""}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="refund-transaction-amount">Amount</Label>
              <Input
                id="refund-transaction-amount"
                readOnly
                value={
                  transaction
                    ? formatCurrency(transaction.amount, transaction.currency)
                    : ""
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-slate-800/60 p-4">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Product &amp; policy
            </span>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs tracking-wide text-muted-foreground uppercase">
                  Product
                </span>
                {product ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <ProductTypeBadge type={product.type} />
                    <Link
                      href={`/dashboard/store/${product.slug}`}
                      className="text-sm font-medium outline-none transition-colors hover:text-[#3B82F6] focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      {product.name}
                    </Link>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Direct charge
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs tracking-wide text-muted-foreground uppercase">
                  Purchase date
                </span>
                <span className="text-sm">
                  {transaction ? formatDate(transaction.createdAt) : "—"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs tracking-wide text-muted-foreground uppercase">
                  Refund window
                </span>
                <span className="text-sm">
                  {product
                    ? product.refundable
                      ? `${product.refundWindowDays} days`
                      : "Non-refundable"
                    : "—"}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs tracking-wide text-muted-foreground uppercase">
                  Days left
                </span>
                <span className="text-sm">
                  {eligibility?.daysLeft !== null &&
                  eligibility?.daysLeft !== undefined
                    ? `${eligibility.daysLeft} ${
                        eligibility.daysLeft === 1 ? "day" : "days"
                      }`
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {ineligible ? (
            <p className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
              {eligibility?.reason ??
                "This transaction isn't eligible for a refund."}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="refund-reason-category">Reason Category</Label>
            <Controller
              control={control}
              name="reasonCategory"
              render={({ field }) => (
                <Select
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="refund-reason-category"
                    className="w-full"
                    aria-invalid={errors.reasonCategory ? true : undefined}
                  >
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {REASON_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.reasonCategory && (
              <p className="text-xs text-destructive">
                {errors.reasonCategory.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="refund-description">Description</Label>
            <Textarea
              id="refund-description"
              placeholder="Provide details about why you're requesting this refund."
              aria-invalid={errors.description ? true : undefined}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Attachments (optional)</Label>
            <AttachmentDropzone
              value={attachments}
              onChange={setAttachments}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
