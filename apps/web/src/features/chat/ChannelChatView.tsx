import React, { useRef, useState, useEffect } from "react";
import {
  Hash,
  Send,
  FileText,
  Camera,
  Smile,
  Users,
  Menu,
  Phone,
  Trash2,
  Paperclip,
  ImagePlus,
  Music2,
  X,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChatMessage, ChatAttachment } from "../../lib/api";
import { gateway } from "../../lib/ws";
import { MAX_ATTACHMENTS, PendingAttachment, queueFiles, revokePendingAttachments, uploadPendingAttachments } from "./attachments";

interface ChannelChatViewProps {
  channelId: string;
  channelName: string;
  messages: ChatMessage[];
  onToggleChannels?: () => void;
  onToggleMembers?: () => void;
  onSendMessage: (text: string, attachments?: ChatAttachment[]) => Promise<void>;
  onDeleteMessage?: (id: string) => Promise<void>;
  typingUsers?: string[];
  hasNextPage?: boolean;
  onFetchNextPage?: () => void;
}

function renderSafeMarkdown(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");
}

export function ChannelChatView({
  channelId,
  channelName,
  messages,
  onToggleChannels,
  onToggleMembers,
  onSendMessage,
  onDeleteMessage,
  typingUsers = [],
  hasNextPage,
  onFetchNextPage,
}: ChannelChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const tRef = useRef<number>(0);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  // Auto scroll on new message
  useEffect(() => {
    if (messages.length > 0 && parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !pendingAttachments.length) return;
    setSending(true);
    setAttachmentError("");
    try {
      const uploaded = await uploadPendingAttachments(pendingAttachments);
      await onSendMessage(inputText.trim(), uploaded);
      setInputText("");
      revokePendingAttachments(pendingAttachments);
      setPendingAttachments([]);
    } catch {
      setAttachmentError("Não foi possível enviar. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const result = queueFiles(files, pendingAttachments.length);
    setAttachmentError(result.error ?? "");
    setPendingAttachments((current) => [...current, ...result.queued]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0e12] overflow-hidden">
      {/* Channel Header */}
      <header className="h-14 min-h-[56px] px-4 flex items-center justify-between border-b border-white/[0.06] bg-[#0d0e12]/80 backdrop-blur-md z-10 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleChannels && (
            <button
              onClick={onToggleChannels}
              className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              aria-label="Abrir canais"
            >
              <Menu size={20} />
            </button>
          )}
          <Hash size={20} className="text-[#2563eb] flex-shrink-0" />
          <h2 className="font-extrabold text-sm sm:text-base text-white truncate">
            {channelName}
          </h2>
          <span className="hidden sm:inline-block text-xs text-zinc-500 pl-2 border-l border-white/10">
            Canal oficial da comunidade
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleMembers && (
            <button
              onClick={onToggleMembers}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Alternar lista de membros"
            >
              <Users size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div
          ref={parentRef}
          className="flex-1 overflow-y-auto scroll-thin p-4 space-y-1"
        >
          {hasNextPage && onFetchNextPage && (
            <div className="text-center py-2">
              <button
                onClick={onFetchNextPage}
                className="text-xs text-[#2563eb] hover:underline font-semibold"
              >
                Carregar mensagens anteriores
              </button>
            </div>
          )}

          <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
            {virtualizer.getVirtualItems().map((v) => {
              const m = messages[v.index];
              if (!m) return null;
              const authorName = m.author?.username || m.authorId || "Usuário";
              const timeString = new Date(m.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={m.id}
                  data-index={v.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${v.start}px)`,
                  }}
                  className="group py-2.5 px-4 rounded-2xl hover:bg-[#161822] transition-colors relative flex items-start gap-3.5"
                >
                  {/* Author Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#1e2230] border border-white/10 flex items-center justify-center font-bold text-xs text-zinc-300 flex-shrink-0 mt-0.5 shadow-sm">
                    {authorName.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Message Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-xs sm:text-sm text-white group-hover:text-blue-400 transition-colors">
                        {authorName}
                      </span>
                      <span className="text-[10px] text-zinc-500">{timeString}</span>
                    </div>

                    <div
                      className="text-xs sm:text-sm text-zinc-200 mt-1 leading-relaxed msg-markdown break-words"
                      dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(m.content) }}
                    />
                    {m.attachments?.map((attachment) => attachment.contentType.startsWith("image/") ? <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 block w-fit"><img src={attachment.url} alt={attachment.name} className="max-h-72 max-w-full rounded-xl border border-white/10 object-contain"/></a> : attachment.contentType.startsWith("audio/") ? <div key={attachment.url} className="mt-2 flex max-w-md items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"><Music2 size={18} className="shrink-0 text-indigo-300"/><div className="min-w-0 flex-1"><p className="truncate text-xs text-zinc-300">{attachment.name}</p><audio controls preload="metadata" src={attachment.url} className="mt-2 h-8 w-full"/></div></div> : null)}
                  </div>

                  {/* Quick delete / menu on hover */}
                  {onDeleteMessage && (
                    <button
                      onClick={() => {
                        if (confirm("Deseja apagar esta mensagem?")) {
                          onDeleteMessage(m.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Apagar mensagem"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-5 py-1 text-[11px] text-zinc-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            <span>{typingUsers.join(", ")} digitando...</span>
          </div>
        )}
      </div>

      {/* Message Input Bar */}
      <div className="p-3 bg-[#0d0e12] border-t border-white/[0.06] pb-safe flex-shrink-0">
        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { handleFiles(event.target.files); event.currentTarget.value = ""; }}/>
        <input ref={audioInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={(event) => { handleFiles(event.target.files); event.currentTarget.value = ""; }}/>
        {(pendingAttachments.length > 0 || attachmentError) && <div className="mx-auto mb-2 flex max-w-4xl flex-wrap items-center gap-2">{pendingAttachments.map((attachment) => <div key={attachment.id} className="flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-[#161821] p-2">{attachment.file.type.startsWith("image/") ? <img src={attachment.previewUrl} alt="Prévia" className="h-9 w-9 rounded object-cover"/> : <Music2 size={17} className="text-indigo-300"/>}<span className="max-w-40 truncate text-xs text-zinc-300">{attachment.file.name}</span><button type="button" onClick={() => { URL.revokeObjectURL(attachment.previewUrl); setPendingAttachments((current) => current.filter((item) => item.id !== attachment.id)); }} aria-label={`Remover ${attachment.file.name}`} className="rounded p-1 text-zinc-400 hover:text-white"><X size={14}/></button></div>)}{attachmentError && <span role="alert" className="text-xs text-rose-300">{attachmentError}</span>}</div>}
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto flex items-center gap-2 bg-[#161821] border border-white/[0.08] focus-within:border-[#2563eb]/60 rounded-2xl px-3 py-1.5 transition-all shadow-md"
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setAttachmentMenuOpen((open) => !open)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Adicionar anexo"
              aria-label="Anexar imagem ou áudio"
              aria-expanded={attachmentMenuOpen}
            >
              <Paperclip size={18} />
            </button>
            {attachmentMenuOpen && <div className="absolute bottom-11 left-0 z-20 w-44 rounded-xl border border-white/10 bg-[#20232d] p-1.5 shadow-xl"><button type="button" onClick={() => { setAttachmentMenuOpen(false); imageInputRef.current?.click(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/10"><ImagePlus size={15}/> Imagem</button><button type="button" onClick={() => { setAttachmentMenuOpen(false); audioInputRef.current?.click(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/10"><Music2 size={15}/> Áudio</button><span className="block px-3 pb-1 pt-1 text-[10px] text-zinc-500">Até {MAX_ATTACHMENTS} arquivos · 1 MB cada</span></div>}
          </div>

          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              const now = Date.now();
              if (now - tRef.current > 3000) {
                tRef.current = now;
                try {
                  gateway.send("TYPING_START", { channelId });
                } catch {
                  /* gateway optional */
                }
              }
            }}
            placeholder={`Conversar em #${channelName}...`}
            className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-zinc-500 outline-none px-2 py-1.5"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !pendingAttachments.length) || sending}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              (inputText.trim() || pendingAttachments.length) && !sending
                ? "bg-[#2563eb] hover:bg-blue-600 text-white shadow-md shadow-blue-500/40 active:scale-95"
                : "bg-white/[0.05] text-zinc-500 cursor-default"
            }`}
            title="Enviar mensagem"
          >
            <Send size={15} className="-ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
