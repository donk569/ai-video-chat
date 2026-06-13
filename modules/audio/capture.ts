import {
  MicPermissionDeniedError,
  NoMicrophoneError,
  AudioContextError,
} from '@/modules/shared/errors';

export async function requestMicrophone(
  constraints?: MediaTrackConstraints,
): Promise<{ stream: MediaStream; context: AudioContext }> {
  let stream: MediaStream;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: constraints ?? {},
    });
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        throw new MicPermissionDeniedError();
      }
      if (error.name === 'NotFoundError') {
        throw new NoMicrophoneError();
      }
    }
    throw error;
  }

  try {
    const context = new AudioContext();
    return { stream, context };
  } catch {
    throw new AudioContextError();
  }
}

export function startRecording(
  context: AudioContext,
  stream: MediaStream,
  onData: (data: Float32Array) => void,
): () => void {
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (event: AudioProcessingEvent) => {
    const channelData = event.inputBuffer.getChannelData(0);
    onData(new Float32Array(channelData));
  };

  source.connect(processor);
  processor.connect(context.destination);

  return () => {
    processor.onaudioprocess = null;
    processor.disconnect();
    source.disconnect();
  };
}

export function stopAll(stream: MediaStream, context: AudioContext): void {
  stream.getTracks().forEach((track) => track.stop());
  try {
    context.close();
  } catch {
    // context may already be closed
  }
}
