export type AiStreamStart = {
  type: "start";
  streamId: string;
  roomId: string;
  model: string;
  promptMessageId: string;
};

export type AiStreamDelta = {
  type: "delta";
  streamId: string;
  text: string;
};

export type AiStreamEnd = {
  type: "end";
  streamId: string;
};

export type AiStreamEvent = AiStreamStart | AiStreamDelta | AiStreamEnd;

export type PendingAiMessage = {
  streamId: string;
  model: string;
  content: string;
  replyToId: string;
};
