import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { HandData } from '@/types/madox';
import { PINCH_THRESHOLD, SMOOTHING_FACTOR } from '@/types/madox';

export function useHandTracking() {
  const [hands, setHands] = useState<HandData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Réfs pour éviter les rerenders constants
  const handsRef = useRef<HandData[]>([]);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const prevHandsRef = useRef<HandData[]>([]);
  const lastUpdateRef = useRef<number>(0);
  
  // Config
  const UI_UPDATE_RATE = 50; // ms - limiter les updates React
  const USE_GPU = false; // TEST: passer à CPU si problèmes

  const smoothValue = useCallback((current: number, previous: number) => {
    return previous + (current - previous) * SMOOTHING_FACTOR;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let lastUpdate = 0;

    async function init() {
      try {
        console.log('🔄 Initializing hand tracking...');
        
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: USE_GPU ? 'GPU' : 'CPU', // TEST CPU vs GPU
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (cancelled) {
          handLandmarker.close();
          return;
        }
        
        handLandmarkerRef.current = handLandmarker;
        console.log('✅ HandLandmarker initialized');

        // TEST: Vérifier la caméra
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        console.log('📷 Available cameras:', videoDevices);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            frameRate: { ideal: 30, max: 60 }
          },
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          handLandmarker.close();
          return;
        }

        console.log('📹 Camera stream obtained');

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.style.display = 'none';
        video.style.position = 'fixed';
        video.style.top = '-9999px';
        video.style.left = '-9999px';
        document.body.appendChild(video);
        videoRef.current = video;

        // Attendre que la vidéo soit prête
        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => {
            video.removeEventListener('loadeddata', onLoaded);
            video.removeEventListener('error', onError);
            console.log('🎬 Video metadata loaded:', {
              width: video.videoWidth,
              height: video.videoHeight,
              readyState: video.readyState
            });
            resolve();
          };
          
          const onError = () => {
            video.removeEventListener('loadeddata', onLoaded);
            video.removeEventListener('error', onError);
            reject(new Error('Failed to load camera stream'));
          };
          
          video.addEventListener('loadeddata', onLoaded);
          video.addEventListener('error', onError);
          
          // Timeout fallback
          setTimeout(() => {
            if (video.readyState >= 2) {
              resolve();
            }
          }, 2000);
        });

        try {
          await video.play();
          console.log('▶️ Video playback started');
        } catch (playError) {
          console.error('❌ Playback error:', playError);
          throw new Error('Camera playback was blocked. Please allow autoplay or interact with the page.');
        }

        // Petit délai pour laisser la caméra se stabiliser
        await new Promise(resolve => setTimeout(resolve, 100));

        setIsLoading(false);
        startDetection();
      } catch (err) {
        console.error('💥 Initialization error:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize hand tracking');
          setIsLoading(false);
        }
      }
    }

    function startDetection() {
      console.log('🚀 Starting detection loop');
      
      const detect = () => {
        if (cancelled || !handLandmarkerRef.current || !videoRef.current) {
          console.log('🛑 Detection cancelled');
          return;
        }

        const video = videoRef.current;
        
        // CRITIQUE: Vérifier que la vidéo a avancé
        if (video.readyState >= 2 && video.currentTime > 0) {
          try {
            const result = handLandmarkerRef.current.detectForVideo(
              video, 
              performance.now()
            );

            const newHands: HandData[] = (result.landmarks || []).map((landmarks, i) => {
              if (!landmarks || landmarks.length < 21) {
                // Retourner main vide si données incomplètes
                const prev = prevHandsRef.current[i];
                return prev || {
                  landmarks: [],
                  indexTip: { x: 0, y: 0 },
                  thumbTip: { x: 0, y: 0 },
                  pinchDistance: 100,
                  isPinching: false,
                  grabbedObjectId: null,
                };
              }

              const indexTip = landmarks[8];
              const thumbTip = landmarks[4];
              const dx = indexTip.x - thumbTip.x;
              const dy = indexTip.y - thumbTip.y;
              const pinchDistance = Math.sqrt(dx * dx + dy * dy);

              const prev = prevHandsRef.current[i];
              const smoothedIndex = prev
                ? { 
                    x: smoothValue(1 - indexTip.x, prev.indexTip.x), 
                    y: smoothValue(indexTip.y, prev.indexTip.y) 
                  }
                : { x: 1 - indexTip.x, y: indexTip.y };
              
              const smoothedThumb = prev
                ? { 
                    x: smoothValue(1 - thumbTip.x, prev.thumbTip.x), 
                    y: smoothValue(thumbTip.y, prev.thumbTip.y) 
                  }
                : { x: 1 - thumbTip.x, y: thumbTip.y };

              return {
                landmarks: landmarks.map(l => ({ 
                  x: 1 - l.x, // Mirror for user perspective
                  y: l.y, 
                  z: l.z 
                })),
                indexTip: smoothedIndex,
                thumbTip: smoothedThumb,
                pinchDistance,
                isPinching: pinchDistance < PINCH_THRESHOLD,
                grabbedObjectId: prev?.grabbedObjectId ?? null,
              };
            });

            // Mettre à jour la ref immédiatement (temps réel)
            handsRef.current = newHands;
            prevHandsRef.current = newHands;

            // Mettre à jour React seulement toutes les X ms
            const now = performance.now();
            if (now - lastUpdate > UI_UPDATE_RATE) {
              setHands([...newHands]);
              lastUpdate = now;
            }
          } catch (detectError) {
            console.error('⚠️ Detection error:', detectError);
            // Continuer le loop malgré l'erreur
          }
        }

        // Continuer la boucle
        animFrameRef.current = requestAnimationFrame(detect);
      };

      animFrameRef.current = requestAnimationFrame(detect);
    }

    init();

    return () => {
      console.log('🧹 Cleaning up hand tracking');
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('🛑 Track stopped:', track.kind);
          });
        }
        videoRef.current.remove();
        videoRef.current = null;
      }
      
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [smoothValue, USE_GPU]);

  return { 
    hands, 
    isLoading, 
    error, 
    // Exposer la ref pour les composants qui ont besoin d'accès temps réel
    handsRef 
  };
}