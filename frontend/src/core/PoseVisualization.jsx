import React, { useRef, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { drawPoseLandmarks } from '../Utility Functions/detectObjectsAndDraw';
import usePoseStore from '../State Management/poseStore';

const PoseVisualization = ({ width = 640, height = 480 }) => {
  const canvasRef = useRef();
  const { detectedLandmarks } = usePoseStore();

  useEffect(() => {
    if (canvasRef.current && detectedLandmarks.length > 0) {
      drawPoseLandmarks(canvasRef.current, detectedLandmarks);
    }
  }, [detectedLandmarks]);

  return (
    <Box position="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: 'auto',
          border: '2px solid #2d3748',
          borderRadius: '8px',
        }}
      />
    </Box>
  );
};

export default PoseVisualization;
