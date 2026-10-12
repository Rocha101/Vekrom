import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, MoreHorizontal, Send, Camera, Flame, Phone, Video, Music2, X } from "lucide-react";
import { JESUS_BROWN_CHAT, SocialUser } from "../../lib/mockData";
import type { ChatAttachment } from "../../lib/api";
import { MAX_ATTACHMENTS, PendingAttachment, queueFiles, revokePendingAttachments, uploadPendingAttachments } from "./attachments";

interface Message {
  id: string;
  sender: "them" | "me";
  text: string;
  time: string;
  attachments?: ChatAttachment[];
}

interface DirectChatViewProps {
  user?: SocialUser;
  onBack?: () => void;
  onOpenVoiceCall?: (user: SocialUser) => void;
}

export function DirectChatView({
  user = JESUS_BROWN_CHAT.user,
  onBack,
  onOpenVoiceCall,
}: DirectChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(JESUS_BROWN_CHAT.messages);
  const [inputValue, setInputValue] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [sending, setSending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const result = queueFiles(files, pendingAttachments.length);
    setAttachmentError(result.error ?? "");
    setPendingAttachments((current) => [...current, ...result.queued]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !pendingAttachments.length) return;
    setSending(true);
    setAttachmentError("");
    let attachments: ChatAttachment[];
    try {
      attachments = await uploadPendingAttachments(pendingAttachments);
    } catch {
      setAttachmentError("Não foi possível anexar o arquivo. Tente novamente.");
      setSending(false);
      return;
    }

    const newMsg: Message = {
      id: "msg_" + Date.now(),
      sender: "me",
      text: inputValue.trim(),
      time: "Just now",
      attachments,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");
    revokePendingAttachments(pendingAttachments);
    setPendingAttachments([]);
    setSending(false);

    // Realistic simulated reply after 1.2s if talking to Jesus Brown
    if (user.id === "jesus_brown") {
      setTimeout(() => {
        const replyMsg: Message = {
          id: "msg_" + Date.now() + 1,
          sender: "them",
          text: "Awesome! Testing the latest build right now 🚀",
          time: "Just now",
        };
        setMessages((prev) => [...prev, replyMsg]);
      }, 1200);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d0e12] overflow-hidden">
      {/* Header aligned at 56px matching sidebar */}
      <header className="h-14 min-h-[56px] px-4 flex items-center justify-between border-b border-white/[0.06] bg-[#0d0e12]/90 backdrop-blur-md z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Back button only on mobile */}
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              aria-label="Voltar"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* User Details */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border border-white/10"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0d0e12]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-white tracking-wide leading-tight">
                  {user.name}
                </h1>
                {user.streak && (
                  <span title="Streak ativo">
                    <Flame size={13} className="text-amber-400 fill-amber-400" />
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-400 block leading-tight">
                {user.status === "online" ? "Online agora" : user.lastActive || "Ativo recentemente"}
              </span>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenVoiceCall?.(user)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Iniciar chamada de voz"
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => onOpenVoiceCall?.(user)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Iniciar chamada de vídeo"
          >
            <Video size={18} />
          </button>
          <button
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Mais opções"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-4 space-y-4 max-w-3xl mx-auto w-full">
        {/* Date separator */}
        <div className="flex items-center justify-center my-1">
          <span className="text-[11px] font-medium text-zinc-400 bg-[#161822] border border-white/[0.06] px-3.5 py-1 rounded-full shadow-sm">
            Hoje
          </span>
        </div>

        {/* Message Clusters */}
        {messages.map((msg, idx) => {
          const isThem = msg.sender === "them";
          const prevMsg = messages[idx - 1];
          const isFirstInCluster = !prevMsg || prevMsg.sender !== msg.sender;

          return (
            <div key={msg.id} className={`flex flex-col ${isFirstInCluster ? "mt-3" : "mt-1.5"}`}>
              {/* Header above their first message matching Screen 3 */}
              {isThem && isFirstInCluster && (
                <div className="flex items-center gap-2 mb-1.5 pl-1">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-6 h-6 rounded-full object-cover border border-white/10"
                  />
                  <span className="text-xs font-bold text-white">{user.name}</span>
                  <Flame size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-[11px] text-zinc-400">{msg.time}</span>
                </div>
              )}

              {/* Message Bubble */}
              <div className={`flex ${isThem ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[72%] px-4 py-2.5 text-xs sm:text-sm leading-relaxed transition-all shadow-md ${
                    isThem
                      ? "bg-[#21242d] text-zinc-100 rounded-2xl rounded-tl-sm border border-white/[0.05]"
                      : "bg-[#2563eb] text-white rounded-2xl rounded-tr-sm shadow-blue-600/25"
                  }`}
                >
                  {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                  {msg.attachments?.map((attachment) => attachment.contentType.startsWith("image/") ? <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 block"><img src={attachment.url} alt={attachment.name} className="max-h-72 max-w-full rounded-lg object-contain"/></a> : attachment.contentType.startsWith("audio/") ? <div key={attachment.url} className="mt-2 flex items-center gap-2 rounded-lg bg-black/20 p-2"><Music2 size={16} className="shrink-0"/><div className="min-w-0"><p className="truncate text-xs">{attachment.name}</p><audio controls preload="metadata" src={attachment.url} className="mt-1 h-8 max-w-full"/></div></div> : null)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Dock matching Screen 3 */}
      <div className="p-4 bg-[#0d0e12] border-t border-white/[0.06] pb-safe flex-shrink-0">
        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { handleFiles(event.target.files); event.currentTarget.value = ""; }}/>
        <input ref={audioInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={(event) => { handleFiles(event.target.files); event.currentTarget.value = ""; }}/>
        {(pendingAttachments.length > 0 || attachmentError) && <div className="mx-auto mb-2 flex max-w-3xl flex-wrap items-center gap-2">{pendingAttachments.map((attachment) => <div key={attachment.id} className="flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-[#161822] p-2">{attachment.file.type.startsWith("image/") ? <img src={attachment.previewUrl} alt="Prévia" className="h-9 w-9 rounded object-cover"/> : <Music2 size={17} className="text-indigo-300"/>}<span className="max-w-40 truncate text-xs text-zinc-300">{attachment.file.name}</span><button type="button" onClick={() => { URL.revokeObjectURL(attachment.previewUrl); setPendingAttachments((current) => current.filter((item) => item.id !== attachment.id)); }} aria-label={`Remover ${attachment.file.name}`} className="rounded p-1 text-zinc-400 hover:text-white"><X size={14}/></button></div>)}{attachmentError && <span role="alert" className="text-xs text-rose-300">{attachmentError}</span>}<span className="text-[10px] text-zinc-500">Máx. {MAX_ATTACHMENTS} arquivos · 1 MB cada</span></div>}
        <form
          onSubmit={handleSendMessage}
          className="max-w-3xl mx-auto flex items-center gap-2 bg-[#161822] border border-white/[0.09] focus-within:border-[#2563eb] rounded-full px-3 py-1.5 transition-all shadow-xl"
        >
          {/* Text Input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Write Message"
            className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-zinc-500 outline-none px-3 py-2"
          />

          {/* Action Button: Send */}
          <button
            type="submit"
            disabled={(!inputValue.trim() && !pendingAttachments.length) || sending}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              (inputValue.trim() || pendingAttachments.length) && !sending
                ? "bg-[#2563eb] hover:bg-blue-600 text-white shadow-md shadow-blue-500/40 active:scale-95"
                : "bg-[#2563eb]/70 text-white/80 cursor-default"
            }`}
            title="Enviar mensagem"
          >
            <Send size={15} className="-ml-0.5" />
          </button>

          {/* Action Button: Audio attachment */}
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            title="Anexar áudio"
            aria-label="Anexar áudio"
          >
            <Music2 size={17} />
          </button>

          {/* Action Button: Camera / Photo */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            title="Anexar imagem"
            aria-label="Anexar imagem"
          >
            <Camera size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
