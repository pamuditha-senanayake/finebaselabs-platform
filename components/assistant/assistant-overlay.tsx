"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  KeyboardIcon,
  MicIcon,
  SendIcon,
  SquareIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "lucide-react";

import { askAssistant } from "@/lib/api/assistant";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AssistantOrb, type AssistantOrbState } from "@/components/assistant/orb";

const SUGGESTIONS = [
  "What is the refund window?",
  "Where is my order?",
  "What are support hours?",
  "How do I request a refund?",
] as const;

type ViewMode = "voice" | "text";
type VoiceState = AssistantOrbState;

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-[#F97316] text-white"
            : "border border-slate-700/60 bg-slate-800/70 text-slate-100",
        )}
      >
        <p className="whitespace-pre-line">{message.text}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="rounded-2xl border border-slate-700/60 bg-slate-800/70 px-4 py-3"
        aria-label="Assistant is typing"
      >
        <span className="flex gap-1">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="size-1.5 animate-bounce rounded-full bg-orange-300"
              style={{ animationDelay: `${index * 120}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

export function AssistantOverlay({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { currentUser } = useSession();
  const [view, setView] = useState<ViewMode>("voice");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [muted, setMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const timersRef = useRef<number[]>([]);
  const voiceTokenRef = useRef(0);
  const suggestionIndexRef = useRef(0);
  const nextIdRef = useRef(0);
  const threadRef = useRef<HTMLDivElement>(null);

  const firstName = currentUser?.name?.split(" ")[0]?.trim() || "there";
  const greeting = `Hi ${firstName}, I'm the FineBase assistant. I can help with your purchases and refunds.`;
  const lastAssistantText =
    [...messages].reverse().find((message) => message.role === "assistant")
      ?.text ?? "";

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  function schedule(callback: () => void, ms: number) {
    timersRef.current.push(window.setTimeout(callback, ms));
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      voiceTokenRef.current += 1;
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current = [];
      setVoiceState("idle");
      setView("voice");
      setMessages([]);
      setPending(false);
      setInput("");
    }
    onOpenChange(next);
  }

  function addMessage(role: Message["role"], text: string) {
    nextIdRef.current += 1;
    const message: Message = { id: `msg-${nextIdRef.current}`, role, text };
    setMessages((current) => [...current, message]);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setInput("");
    setView("text");
    addMessage("user", trimmed);
    setPending(true);

    try {
      const reply = await askAssistant(currentUser?.id ?? "", trimmed);
      addMessage("assistant", reply);
    } finally {
      setPending(false);
    }
  }

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleMicPress() {
    if (voiceState !== "idle") {
      voiceTokenRef.current += 1;
      setVoiceState("idle");
      return;
    }

    setView("voice");
    const token = ++voiceTokenRef.current;
    setVoiceState("listening");

    schedule(() => {
      if (token !== voiceTokenRef.current) return;
      void runVoiceTurn(token);
    }, 2000);
  }

  async function runVoiceTurn(token: number) {
    const question = SUGGESTIONS[suggestionIndexRef.current % SUGGESTIONS.length];
    suggestionIndexRef.current += 1;

    addMessage("user", question);
    setVoiceState("thinking");

    try {
      const reply = await askAssistant(currentUser?.id ?? "", question);
      if (token !== voiceTokenRef.current) return;

      addMessage("assistant", reply);
      setVoiceState("speaking");

      const speakMs = Math.min(4000, 1500 + reply.length * 25);
      schedule(() => {
        if (token === voiceTokenRef.current) setVoiceState("idle");
      }, speakMs);
    } catch {
      if (token === voiceTokenRef.current) setVoiceState("idle");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 top-0 left-0 z-50 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-0 bg-[#0d0906] p-0 ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">FineBase assistant</DialogTitle>
        <DialogDescription className="sr-only">{greeting}</DialogDescription>

        <div
          className="relative flex h-full flex-col bg-[radial-gradient(120%_80%_at_50%_0%,#241610_0%,#140e0a_50%,#0d0906_100%)]"
          style={{ colorScheme: "dark" }}
        >
          <div className="flex items-center justify-end gap-2 p-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={
                muted ? "Unmute assistant audio" : "Mute assistant audio"
              }
              aria-pressed={muted}
              onClick={() => setMuted((current) => !current)}
            >
              {muted ? (
                <VolumeXIcon className="size-5 text-orange-200" />
              ) : (
                <Volume2Icon className="size-5 text-orange-200" />
              )}
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close assistant"
              >
                <XIcon className="size-5 text-orange-200" />
              </Button>
            </DialogClose>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-4">
            {view === "voice" ? (
              <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 text-center">
                <AssistantOrb
                  state={voiceState}
                  className="scale-90 sm:scale-100"
                />
                <span className="text-xs font-semibold tracking-[0.25em] text-orange-300/80 uppercase">
                  Tap to talk
                </span>
                <p className="max-w-md text-sm text-slate-400">{greeting}</p>
                <h2 className="text-2xl font-semibold tracking-tight text-amber-50">
                  What do you need to know?
                </h2>

                {voiceState === "idle" ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        disabled={pending}
                        onClick={() => void sendMessage(suggestion)}
                        className="rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-sm text-orange-100 outline-none transition-colors hover:bg-orange-500/20 focus-visible:ring-2 focus-visible:ring-orange-400/60 disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p
                    aria-live="polite"
                    className="min-h-12 max-w-md text-sm whitespace-pre-line text-orange-100/90"
                  >
                    {voiceState === "listening" ? "Listening…" : null}
                    {voiceState === "thinking" ? "Thinking…" : null}
                    {voiceState === "speaking" ? lastAssistantText : null}
                  </p>
                )}
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4">
                <div
                  ref={threadRef}
                  role="log"
                  aria-live="polite"
                  aria-label="Assistant conversation"
                  className="flex flex-1 flex-col gap-3 overflow-y-auto py-2"
                >
                  {messages.length === 0 && !pending ? (
                    <p className="py-8 text-center text-sm text-slate-400">
                      Ask about your purchases or refunds — or switch back to
                      voice mode.
                    </p>
                  ) : null}
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {pending ? <TypingIndicator /> : null}
                </div>

                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about purchases or refunds…"
                    aria-label="Message the assistant"
                    className="h-10 flex-1 rounded-full border-orange-400/25 bg-slate-900/60 px-4 text-slate-100"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || pending}
                    aria-label="Send message"
                    className="size-10 rounded-full bg-[#F97316] text-white hover:bg-[#EA580C]"
                  >
                    <SendIcon className="size-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pb-8">
            <Button
              type="button"
              size="icon"
              aria-label={
                voiceState === "idle" ? "Start listening" : "Stop listening"
              }
              onClick={handleMicPress}
              className={cn(
                "size-16 rounded-full bg-[#F97316] text-white shadow-lg shadow-orange-600/30 hover:bg-[#EA580C]",
                voiceState !== "idle" ? "ring-2 ring-orange-300/70" : undefined,
              )}
            >
              {voiceState === "idle" ? (
                <MicIcon className="size-6" />
              ) : (
                <SquareIcon className="size-5" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={
                view === "voice"
                  ? "Switch to keyboard input"
                  : "Switch to voice mode"
              }
              aria-pressed={view === "text"}
              onClick={() =>
                setView((current) => (current === "voice" ? "text" : "voice"))
              }
              className="size-10 rounded-full border border-orange-400/25 text-orange-200 hover:bg-orange-500/10 hover:text-orange-100"
            >
              <KeyboardIcon className="size-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
