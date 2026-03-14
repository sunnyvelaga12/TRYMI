import { useState, useEffect, useCallback } from 'react';
import { initializePoseLandmarker, processBodyLandmarks, mapLandmarksToBones } from '../Utility Functions/bodyLandmarkProcessor';
import usePoseStore from '../State Management/poseStore';

const usePoseDetection = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);
  const { updateDetectedLandmarks, detectedLandmarks } = usePoseStore();

  const startDetection = useCallback(async (videoElement) => {
    try {
      await initializePoseLandmarker();
      setIsDetecting(true);
      setError(null);

      const detectPose = async (timestamp) => {
        if (!isDetecting) return;

        try {
          const results = await processBodyLandmarks(videoElement, timestamp);
          
          if (results && results.landmarks) {
            updateDetectedLandmarks(results.landmarks);
          }

          requestAnimationFrame(detectPose);
        } catch (err) {
          console.error('Pose detection error:', err);
        }
      };

      requestAnimationFrame(detectPose);
    } catch (err) {
      setError(err.message);
      console.error('Failed to start pose detection:', err);
    }
  }, [isDetecting, updateDetectedLandmarks]);

  const stopDetection = useCallback(() => {
    setIsDetecting(false);
  }, []);

  const getBonePositions = useCallback(() => {
    if (detectedLandmarks.length > 0) {
      return mapLandmarksToBones(detectedLandmarks);
    }
    return null;
  }, [detectedLandmarks]);

  return {
    isDetecting,
    startDetection,
    stopDetection,
    landmarks: detectedLandmarks,
    bonePositions: getBonePositions(),
    error,
  };
};

export default usePoseDetection;
