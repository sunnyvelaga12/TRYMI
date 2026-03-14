import React, { useMemo } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Progress,
  Skeleton,
} from "@chakra-ui/react";

const DetectionResults = ({ detections, bodyMeasurements }) => {
  // ✅ Validate detections
  const validatedDetections = useMemo(() => {
    try {
      if (!Array.isArray(detections)) {
        console.warn("⚠️ Invalid detections prop:", detections);
        return [];
      }

      return detections.filter((detection) => {
        try {
          if (!detection || !detection.class) {
            console.warn("⚠️ Invalid detection item:", detection);
            return false;
          }

          // Ensure confidence is a valid number
          const confidence = parseFloat(detection.confidence);
          if (isNaN(confidence) || confidence < 0 || confidence > 1) {
            console.warn("⚠️ Invalid confidence value:", detection.confidence);
            return false;
          }

          return true;
        } catch (error) {
          console.error("❌ Error validating detection:", error);
          return false;
        }
      });
    } catch (error) {
      console.error("❌ Error validating detections array:", error);
      return [];
    }
  }, [detections]);

  // ✅ Validate body measurements
  const validatedMeasurements = useMemo(() => {
    try {
      if (!bodyMeasurements || typeof bodyMeasurements !== "object") {
        console.warn("⚠️ Invalid body measurements:", bodyMeasurements);
        return null;
      }

      const measurements = {};
      const measurementKeys = ["shoulderWidth", "hipWidth", "torsoHeight"];

      for (const key of measurementKeys) {
        const value = parseFloat(bodyMeasurements[key]);
        if (isNaN(value) || value < 0 || value > 1) {
          console.warn(`⚠️ Invalid ${key} value:`, bodyMeasurements[key]);
          measurements[key] = 0;
        } else {
          measurements[key] = value;
        }
      }

      return measurements;
    } catch (error) {
      console.error("❌ Error validating measurements:", error);
      return null;
    }
  }, [bodyMeasurements]);

  // ✅ Safe percentage formatter
  const formatPercentage = (value, decimals = 1) => {
    try {
      const num = parseFloat(value);
      return isNaN(num) ? "0" : num.toFixed(decimals);
    } catch (error) {
      console.error("❌ Error formatting percentage:", error);
      return "0";
    }
  };

  // ✅ Safe measurement formatter
  const formatMeasurement = (value, unit = "cm") => {
    try {
      const num = parseFloat(value) * 100;
      return isNaN(num) ? "0.0" : num.toFixed(1);
    } catch (error) {
      console.error("❌ Error formatting measurement:", error);
      return "0.0";
    }
  };

  // ✅ Check if there's any data to display
  const hasData = validatedDetections.length > 0 || validatedMeasurements;

  if (!hasData) {
    return (
      <Box p={4} bg="gray.800" borderRadius="md">
        <Text color="gray.400" fontSize="sm" textAlign="center">
          No detections or measurements available
        </Text>
      </Box>
    );
  }

  return (
    <VStack gap={4} align="stretch" data-testid="detection-results">
      {/* Clothing Detections */}
      {validatedDetections.length > 0 && (
        <Box p={4} bg="gray.800" borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={3} color="white">
            Detected Items ({validatedDetections.length})
          </Text>
          <VStack gap={2} align="stretch">
            {validatedDetections.map((detection, index) => (
              <HStack
                key={`detection-${index}`}
                justify="space-between"
                p={2}
                bg="gray.700"
                borderRadius="md"
                transition="all 0.2s"
                _hover={{ bg: "gray.600" }}
              >
                <HStack gap={2}>
                  <Badge colorScheme="green">
                    {detection.class || "Unknown"}
                  </Badge>
                  <Text fontSize="sm" color="white" fontWeight="500">
                    {detection.class || "Unknown Item"}
                  </Text>
                </HStack>
                <Text
                  fontSize="sm"
                  color="green.400"
                  fontWeight="600"
                  aria-label={`${detection.class} confidence ${formatPercentage(detection.confidence * 100)}%`}
                >
                  {formatPercentage(detection.confidence * 100)}%
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      {/* Body Measurements */}
      {validatedMeasurements && (
        <Box p={4} bg="gray.800" borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={3} color="white">
            Body Measurements
          </Text>
          <VStack gap={4} align="stretch">
            {/* Shoulder Width */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color="white" fontWeight="500">
                  Shoulder Width
                </Text>
                <Text fontSize="sm" color="green.400" fontWeight="600">
                  {formatMeasurement(validatedMeasurements.shoulderWidth)} cm
                </Text>
              </HStack>
              <Progress
                value={validatedMeasurements.shoulderWidth * 100}
                size="sm"
                colorScheme="green"
                borderRadius="full"
                hasStripe
              />
            </Box>

            {/* Hip Width */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color="white" fontWeight="500">
                  Hip Width
                </Text>
                <Text fontSize="sm" color="green.400" fontWeight="600">
                  {formatMeasurement(validatedMeasurements.hipWidth)} cm
                </Text>
              </HStack>
              <Progress
                value={validatedMeasurements.hipWidth * 100}
                size="sm"
                colorScheme="green"
                borderRadius="full"
                hasStripe
              />
            </Box>

            {/* Torso Height */}
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color="white" fontWeight="500">
                  Torso Height
                </Text>
                <Text fontSize="sm" color="green.400" fontWeight="600">
                  {formatMeasurement(validatedMeasurements.torsoHeight)} cm
                </Text>
              </HStack>
              <Progress
                value={validatedMeasurements.torsoHeight * 100}
                size="sm"
                colorScheme="green"
                borderRadius="full"
                hasStripe
              />
            </Box>
          </VStack>
        </Box>
      )}
    </VStack>
  );
};

// ✅ PropTypes validation
DetectionResults.propTypes = {
  detections: PropTypes.arrayOf(
    PropTypes.shape({
      class: PropTypes.string.isRequired,
      confidence: PropTypes.number,
    }),
  ),
  bodyMeasurements: PropTypes.shape({
    shoulderWidth: PropTypes.number,
    hipWidth: PropTypes.number,
    torsoHeight: PropTypes.number,
  }),
};

// ✅ Default props
DetectionResults.defaultProps = {
  detections: [],
  bodyMeasurements: null,
};

export default React.memo(DetectionResults);


