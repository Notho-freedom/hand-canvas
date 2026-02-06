import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { HandData } from '@/types/madox';
import { PINCH_THRESHOLD, SMOOTHING_FACTOR } from '@/types/madox';

export function useHandTracking() {
  const [hands, setHands] = useState<HandData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const videoFrameRef = useRef<number | null>(null);
  const prevHandsRef = useRef<HandData[]>([]);
  const lastVideoTimeRef = useRef<number>(-1);
  const staleFrameCountRef = useRef<number>(0);

  const smoothValue = useCallback((current: number, previous: number) => {
    return previous + (current - previous) * SMOOTHING_FACTOR;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (cancelled) return;
        handLandmarkerRef.current = handLandmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.style.display = 'none';
        document.body.appendChild(video);
        videoRef.current = video;

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error('Failed to load camera stream'));
        });

        try {
          await video.play();
        } catch (playError) {
          throw new Error('Camera playback was blocked. Please allow autoplay or interact with the page.');
        }

        setIsLoading(false);
        startDetection();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize hand tracking');
          setIsLoading(false);
        }
      }
    }

    function startDetection() {
      const scheduleNext = () => {
        const video = videoRef.current;
        if (!video) return;

        if ('requestVideoFrameCallback' in video) {
          const videoWithCallback = video as HTMLVideoElement & {
            requestVideoFrameCallback?: (callback: () => void) => number;
          };
          videoFrameRef.current = videoWithCallback.requestVideoFrameCallback?.(() => {
            detect();
          }) ?? null;
        } else {
          animFrameRef.current = requestAnimationFrame(detect);
        }
      };

      const detect = () => {
        if (cancelled || !handLandmarkerRef.current || !videoRef.current) return;

        const video = videoRef.current;
        if (video.readyState >= 2) {
          if (video.paused || video.ended) {
            video.play().catch(() => null);
          }

          if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            staleFrameCountRef.current = 0;
            const result = handLandmarkerRef.current.detectForVideo(
              video,
              video.currentTime * 1000
            );

            const newHands: HandData[] = (result.landmarks || []).map((landmarks, i) => {
              const indexTip = landmarks[8];
              const thumbTip = landmarks[4];
              const dx = indexTip.x - thumbTip.x;
              const dy = indexTip.y - thumbTip.y;
              const pinchDistance = Math.sqrt(dx * dx + dy * dy);

              const prev = prevHandsRef.current[i];
              const smoothedIndex = prev
                ? { x: smoothValue(1 - indexTip.x, prev.indexTip.x), y: smoothValue(indexTip.y, prev.indexTip.y) }
                : { x: 1 - indexTip.x, y: indexTip.y };
              const smoothedThumb = prev
                ? { x: smoothValue(1 - thumbTip.x, prev.thumbTip.x), y: smoothValue(thumbTip.y, prev.thumbTip.y) }
                : { x: 1 - thumbTip.x, y: thumbTip.y };

              return {
                landmarks: landmarks.map(l => ({ x: 1 - l.x, y: l.y, z: l.z })),
                indexTip: smoothedIndex,
                thumbTip: smoothedThumb,
                pinchDistance,
                isPinching: pinchDistance < PINCH_THRESHOLD,
                grabbedObjectId: prev?.grabbedObjectId ?? null,
              };
            });

            prevHandsRef.current = newHands;
            setHands(newHands);
          } else {
            staleFrameCountRef.current += 1;
            if (staleFrameCountRef.current > 30) {
              staleFrameCountRef.current = 0;
              video.play().catch(() => null);
            }
          }
        }

        scheduleNext();
      };

      scheduleNext();
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      if (videoFrameRef.current !== null && videoRef.current?.cancelVideoFrameCallback) {
        videoRef.current.cancelVideoFrameCallback(videoFrameRef.current);
      }
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
        videoRef.current.remove();
      }
      handLandmarkerRef.current?.close();
    };
  }, [smoothValue]);

  return { hands, isLoading, error, setHands };
}
