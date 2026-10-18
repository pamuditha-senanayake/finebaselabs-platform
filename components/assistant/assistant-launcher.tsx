"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";

import { AssistantOverlay } from "@/components/assistant/assistant-overlay";
import { Button } from "@/components/ui/button";

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="icon"
        aria-label="Open assistant"
        onClick={() => setOpen(true)}
        className="fixed right-6 bottom-6 z-40 size-12 rounded-full bg-[#F97316] text-white shadow-lg shadow-orange-600/30 hover:bg-[#EA580C]"
      >
        <SparklesIcon className="size-5" />
      </Button>

      <AssistantOverlay open={open} onOpenChange={setOpen} />
    </>
  );
}
