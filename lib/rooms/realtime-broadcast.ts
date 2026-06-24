import type { ChatMessage } from "@/lib/rooms/message-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

async function broadcastRoomEvent(
  roomId: string,
  event: string,
  payload: Record<string, unknown> | ChatMessage,
): Promise<void> {
  const supabase = createAdminClient();
  const channel = supabase.channel(`room:${roomId}`);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      void supabase.removeChannel(channel);
      reject(new Error("Realtime broadcast timed out"));
    }, 5000);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event,
          payload,
        });
        clearTimeout(timeout);
        void supabase.removeChannel(channel);
        resolve();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        void supabase.removeChannel(channel);
        reject(new Error(`Realtime broadcast failed: ${status}`));
      }
    });
  });
}

export class RoomChannelBroadcaster {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel;
  private ready: Promise<void>;

  constructor(roomId: string) {
    this.supabase = createAdminClient();
    this.channel = this.supabase.channel(`room:${roomId}`);
    this.ready = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Realtime channel subscribe timed out"));
      }, 5000);

      this.channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timeout);
          reject(new Error(`Realtime channel failed: ${status}`));
        }
      });
    });
  }

  async send(event: string, payload: Record<string, unknown>) {
    await this.ready;
    this.channel.send({
      type: "broadcast",
      event,
      payload,
    });
  }

  async close() {
    await this.supabase.removeChannel(this.channel);
  }
}

export async function broadcastRoomMessage(
  roomId: string,
  message: ChatMessage,
): Promise<void> {
  try {
    await broadcastRoomEvent(roomId, "message", message);
  } catch (error) {
    console.error("[realtime] message broadcast failed", error);
  }
}

export async function broadcastParticipantsChanged(
  roomId: string,
  userId: string,
): Promise<void> {
  try {
    await broadcastRoomEvent(roomId, "participants_changed", { userId });
  } catch (error) {
    console.error("[realtime] participants broadcast failed", error);
  }
}

export async function broadcastParticipantKicked(
  roomId: string,
  userId: string,
): Promise<void> {
  try {
    await broadcastRoomEvent(roomId, "participant_kicked", { userId });
  } catch (error) {
    console.error("[realtime] participant kick broadcast failed", error);
  }
}
