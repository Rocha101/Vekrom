import { api, type ChatAttachment } from "../../lib/api";

export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
}

export const MAX_ATTACHMENT_SIZE = 1024 * 1024;
export const MAX_ATTACHMENTS = 3;

export function queueFiles(files: FileList | File[], existingCount: number): { queued: PendingAttachment[]; error?: string } {
  const queued: PendingAttachment[] = [];
  for (const file of Array.from(files)) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("audio/")) return { queued, error: "Escolha uma imagem ou um áudio." };
    if (file.size > MAX_ATTACHMENT_SIZE) return { queued, error: "Cada anexo deve ter até 1 MB." };
    if (existingCount + queued.length >= MAX_ATTACHMENTS) return { queued, error: "Você pode enviar até 3 anexos por mensagem." };
    queued.push({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file) });
  }
  return { queued };
}

export async function uploadPendingAttachments(pending: PendingAttachment[]): Promise<ChatAttachment[]> {
  return Promise.all(pending.map(async ({ file }) => {
    const uploaded = await api.uploadFile(file);
    return { url: uploaded.url, name: file.name, contentType: uploaded.contentType, sizeBytes: uploaded.sizeBytes };
  }));
}

export function revokePendingAttachments(pending: PendingAttachment[]) {
  pending.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
}
