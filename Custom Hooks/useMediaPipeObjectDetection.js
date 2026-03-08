import { useState, useEffect, useRef } from 'react';
import { initializePoseLandmarker, processBodyLandmarks, calculateBodyMeasurements } from '../Utility Functions/bodyLandmarkProcessor';
import { initializeObjectDetector, detectObjects } from '../Utility Functions/initializeObjectDetector';
import usePoseStore from '../State Management/poseStore';

export const useMediaPipeObjectDetection = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [bodyMeasurements, setBodyMeasurements] = useState(null);
  const [detections, setDetections] = useState([]);
  
  const poseLandmarkerRef = useRef(null);
  const objectDetectorRef = useRef(null);
  const lastProcessTimeRef = useRef(0);
  
  const { updateDetectedLandmarks } = usePoseStore();

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize MediaPipe Pose Landmarker
        poseLandmarkerRef.current = await initializePoseLandmarker();
        
        // Initialize Object Detector
        objectDetectorRef.current = await initializeObjectDetector();
        
        setIsInitialized(true);
        console.log('✅ MediaPipe and Object Detection initialized');
      } catch (error) {
        console.error('❌ Initialization error:', error);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close?.();
        poseLandmarkerRef.current = null;
      }
      if (objectDetectorRef.current) {
        objectDetectorRef.current.close?.();
        objectDetectorRef.current = null;
      }
      console.log('🧹 MediaPipe resources cleaned up');
    };
  }, []);

  const processFrame = async (videoElement, timestamp) => {
    if (!isInitialized || !poseLandmarkerRef.current) return null;

    try {
      // CRITICAL FIX: Convert timestamp to integer milliseconds
      const timestampMs = Math.floor(timestamp);
      
      // Throttle processing to avoid overwhelming MediaPipe
      const now = Date.now();
      if (now - lastProcessTimeRef.current < 100) {
        return null; // Skip frame if processed recently (100ms throttle)
      }
      lastProcessTimeRef.current = now;

      // Process pose landmarks
      const poseResults = processBodyLandmarks(
        poseLandmarkerRef.current,
        videoElement,
        timestampMs
      );
      
      if (poseResults && poseResults.landmarks) {
        // Update landmarks in store
        updateDetectedLandmarks(poseResults.landmarks);
        
        // Calculate body measurements
        const measurements = calculateBodyMeasurements(poseResults.landmarks);
        setBodyMeasurements(measurements);
      }

      // Detect objects (clothing) - run less frequently (every 1 second)
      if (objectDetectorRef.current && timestampMs % 1000 < 100) {
        const objectDetections = detectObjects(
          objectDetectorRef.current,
          videoElement,
          timestampMs
        );
        if (objectDetections) {
          setDetections(objectDetections.detections || []);
        }
      }

      return {
        landmarks: poseResults?.landmarks || [],
        measurements: bodyMeasurements,
        detections: detections,
      };
    } catch (error) {
      console.error('❌ Frame processing error:', error);
      return null;
    }
  };

  return {
    isInitialized,
    processFrame,
    bodyMeasurements,
    detections,
  };
};

export default useMediaPipeObjectDetection;
