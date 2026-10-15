"use client";

import { ChatWindow } from "./ChatWindow";

type Props = Omit<React.ComponentProps<typeof ChatWindow>, "onClose" | "source">;

export function EmbedChat(props: Props) {
  // Ask the host page's widget.js to collapse the iframe.
  const close = () => window.parent.postMessage({ type: "chatbot:close", botId: props.botId }, "*");
  return (
    <div className="h-dvh">
      <ChatWindow {...props} source="widget" onClose={close} />
    </div>
  );
}
