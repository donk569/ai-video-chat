import type { AudioChunk, CostStats, Message, VLMQuery, CompressedFrame, ConversationTurn } from '../shared/types';

export interface PipelineDeps {
  asr: { recognize(chunk: AudioChunk): Promise<{ text: string; source: string; confidence?: number; latencyMs: number }> };
  vlm: { query(input: VLMQuery): Promise<{ answer: string; source: string; tokensUsed?: number }> };
  tts: { speak(text: string): Promise<{ source: string }> };
}

export interface PipelineResult {
  message: Message;
  costDelta: Partial<CostStats>;
}

export async function runPipeline(
  deps: PipelineDeps,
  chunk: AudioChunk,
  frame: CompressedFrame,
  history: ConversationTurn[],
): Promise<PipelineResult> {
  const costDelta: Partial<CostStats> = { cloudCalls: 0, tokensUsed: 0, estimatedCostRMB: 0 };

  // Step 1: ASR
  const asrResult = await deps.asr.recognize(chunk);
  if (asrResult.source === 'qiniu') {
    costDelta.cloudCalls = (costDelta.cloudCalls ?? 0) + 1;
  }

  // Step 2: VLM
  const vlmResult = await deps.vlm.query({
    image: frame.dataUrl,
    question: asrResult.text,
    history: history.length > 0 ? history : undefined,
  });

  if (vlmResult.source === 'qiniu') {
    costDelta.cloudCalls = (costDelta.cloudCalls ?? 0) + 1;
    costDelta.tokensUsed = (costDelta.tokensUsed ?? 0) + (vlmResult.tokensUsed ?? 0);
  }

  // Step 3: TTS
  const ttsResult = await deps.tts.speak(vlmResult.answer);
  if (ttsResult.source === 'qiniu') {
    costDelta.cloudCalls = (costDelta.cloudCalls ?? 0) + 1;
  }

  // Estimate cost in RMB
  costDelta.estimatedCostRMB = (costDelta.cloudCalls ?? 0) * 0.01 + (costDelta.tokensUsed ?? 0) * 0.0001;

  const message: Message = {
    id: crypto.randomUUID(),
    role: 'assistant',
    text: vlmResult.answer,
    frameDataUrl: frame.dataUrl,
    timestamp: Date.now(),
    source: vlmResult.source,
  };

  return { message, costDelta };
}
