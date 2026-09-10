'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2 } from 'lucide-react';
import type { PetCue } from '@/lib/client/companion-motion';
export default function CompanionVoice({
  name,
  onCue,
}: {
  name: string;
  onCue: (cue: PetCue) => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'playing'>('idle');
  const [message, setMessage] = useState('Say something. I’ll say it back!');
  const active = useRef(false),
    disposed = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const objectUrl = useRef('');
  const onCueRef = useRef(onCue);
  onCueRef.current = onCue;
  const release = () => {
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    player.current?.pause();
    player.current = null;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = '';
  };
  const stop = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  };
  useEffect(() => {
    disposed.current = false;
    const hide = () => {
      if (document.hidden) {
        active.current = false;
        stop();
        release();
        setPhase('idle');
        onCueRef.current({ kind: 'idle', id: Date.now() });
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      disposed.current = true;
      active.current = false;
      stop();
      release();
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);
  const begin = async () => {
    if (active.current) return;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setMessage(
        'Voice play isn’t supported in this browser. Try Chrome, Edge, or Safari.',
      );
      return;
    }
    active.current = true;
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (disposed.current || !active.current) {
        input.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = input;
      const recording = new MediaRecorder(input);
      recorder.current = recording;
      const chunks: BlobPart[] = [];
      let size = 0;
      recording.ondataavailable = (event) => {
        if (event.data.size) {
          size += event.data.size;
          chunks.push(event.data);
          if (size > 2 * 1024 * 1024) stop();
        }
      };
      recording.onerror = () => {
        active.current = false;
        release();
        if (!disposed.current) {
          setPhase('idle');
          setMessage('The microphone stopped. Tap to try again.');
        }
      };
      recording.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        if (disposed.current || !active.current) return;
        objectUrl.current = URL.createObjectURL(
          new Blob(chunks, { type: recording.mimeType }),
        );
        const playback = new Audio(objectUrl.current);
        player.current = playback;
        playback.playbackRate = 1.3;
        playback.preservesPitch = false;
        playback.volume = 0.8;
        const finish = () => {
          active.current = false;
          release();
          if (!disposed.current) {
            setPhase('idle');
            setMessage('Hehe! Again?');
            onCueRef.current({ kind: 'idle', id: Date.now() });
          }
        };
        playback.onended = finish;
        playback.onerror = finish;
        setPhase('playing');
        setMessage(name + ' is copying you…');
        onCueRef.current({ kind: 'talk', id: Date.now() });
        void playback.play().catch(() => {
          finish();
          if (!disposed.current)
            setMessage('Tap again to allow voice playback.');
        });
      };
      setPhase('recording');
      setMessage('Listening… say a little hello!');
      onCueRef.current({ kind: 'listen', id: Date.now() });
      recording.start(200);
      timer.current = setTimeout(stop, 6500);
    } catch {
      active.current = false;
      release();
      if (!disposed.current) {
        setPhase('idle');
        setMessage('Allow microphone access to play, then try again.');
      }
    }
  };
  return (
    <section className="panel voice-play">
      <div className="panel-heading">
        <h3>Say it back!</h3>
        <Volume2 size={20} />
      </div>
      <p aria-live="polite">{message}</p>
      <button
        className={phase === 'recording' ? 'primary recording' : 'primary'}
        disabled={phase === 'playing'}
        onClick={() => (phase === 'recording' ? stop() : void begin())}
      >
        {phase === 'recording' ? <Square size={18} /> : <Mic size={18} />}
        {phase === 'recording'
          ? 'Done talking'
          : phase === 'playing'
            ? 'Your companion is talking…'
            : 'Talk to ' + name}
      </button>
      <small>
        Up to 6 seconds. Voice stays on this device and is discarded after
        playback.
      </small>
    </section>
  );
}
