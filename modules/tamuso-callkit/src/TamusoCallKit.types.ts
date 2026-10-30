export type CallKitEventType =
  | 'incoming'
  | 'outgoing'
  | 'answered'
  | 'declined_or_ended'
  | 'connected'
  | 'connecting'
  | 'ended'
  | 'failed'
  | 'muted'
  | 'duplicate'
  | 'reset'
  | 'start_action'
  | 'audio_activated'
  | 'audio_deactivated';

export type VoipEventType =
  | 'voip_token'
  | 'voip_token_invalidated'
  | 'voip_push'
  | 'voip_push_failed';

export type CallKitEventPayload = {
  type: CallKitEventType;
  callId?: string;
  uuid?: string;
  callerName?: string;
  hasVideo?: boolean;
  muted?: boolean;
  error?: string;
};

export type VoipEventPayload = {
  type: VoipEventType;
  token?: string;
  callId?: string;
  callerName?: string;
  hasVideo?: boolean;
  error?: string;
  payload?: Record<string, unknown>;
};

export type TamusoCallKitModuleEvents = {
  onCallEvent: (event: CallKitEventPayload) => void;
  onVoipEvent: (event: VoipEventPayload) => void;
};
