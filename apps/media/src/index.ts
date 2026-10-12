import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const port = Number(process.env.MEDIA_PORT ?? 3003);
// Stub SFU: health + placeholder para plugar LiveKit/mediasoup.
// O gateway já faz sinalização; este serviço reserva o slot de mídia.
createServer((_req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "media-stub", sfu: "bring-your-own-livekit", port }));
}).listen(port, () => console.log(`[media] stub listening on :${port}`));
