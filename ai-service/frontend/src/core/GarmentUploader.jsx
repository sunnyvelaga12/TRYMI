import React, { useState, useRef, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Box, Button, VStack, Image, Text, HStack } from "@chakra-ui/react";
import { toaster } from "../src/frontend/components/ui/toaster";
import { detectClothingInImage } from "../Utility Functions/detectObjectsAndDraw";

// ✅ Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const GarmentUploader = ({ onUpload = null }) => {
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  // ✅ Validate file before processing
  const validateFile = useCallback((file) => {
    try {
      if (!file) {
        throw new Error("No file selected");
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        throw new Error(`File is too large: ${sizeMB}MB (Max: 10MB)`);
      }

      // Check file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        throw new Error(
          `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
        );
      }

      console.log(`✅ File validation passed: ${file.name}`);
      return true;
    } catch (error) {
      console.error("❌ File validation error:", error);
      throw error;
    }
  }, []);

  // ✅ Safe file selection handler
  const handleFileSelect = useCallback(
    async (event) => {
      try {
        const file = event.target.files?.[0];

        if (!file) {
          console.warn("⚠️ No file selected");
          return;
        }

        // Validate file
        try {
          validateFile(file);
        } catch (validationError) {
          toaster.create({
            title: "Invalid file",
            description: validationError.message,
            type: "error",
            duration: 4000,
          });
          return;
        }

        setFileName(file.name);
        setIsProcessing(true);
        console.log("🔄 Processing file:", file.name);

        // Create preview
        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            const imageData = e.target.result;
            if (!imageData || typeof imageData !== "string") {
              throw new Error("Failed to read file data");
            }

            setPreview(imageData);

            // Create image element for detection
            const img = new Image();
            img.src = imageData;

            img.onerror = () => {
              console.error("❌ Failed to load image for processing");
              toaster.create({
                title: "Image processing failed",
                description: "Failed to load the image",
                type: "error",
                duration: 3000,
              });
              setIsProcessing(false);
            };

            img.onload = async () => {
              try {
                // Detect clothing in image
                let detections = [];
                try {
                  detections = await detectClothingInImage(img);
                  if (!Array.isArray(detections)) {
                    detections = detections?.detections || [];
                  }
                } catch (detectionError) {
                  console.warn("⚠️ Clothing detection failed:", detectionError);
                  detections = [];
                }

                // Create garment data object
                const garmentData = {
                  id: Date.now().toString(),
                  name: file.name.replace(/\.[^/.]+$/, ""),
                  thumbnail: imageData,
                  modelUrl: null,
                  detections: detections,
                  uploadDate: new Date().toISOString(),
                  fileSize: file.size,
                  fileType: file.type,
                };

                // Call upload callback if provided
                if (onUpload && typeof onUpload === "function") {
                  try {
                    onUpload(garmentData);
                  } catch (callbackError) {
                    console.error(
                      "❌ Error in onUpload callback:",
                      callbackError,
                    );
                    throw new Error("Failed to process upload");
                  }
                }

                toaster.create({
                  title: "Upload successful",
                  description: `Detected ${detections.length} items in garment`,
                  type: "success",
                  duration: 3000,
                });

                console.log("✅ Garment uploaded successfully:", garmentData);
              } catch (processingError) {
                console.error("❌ Error processing garment:", processingError);
                toaster.create({
                  title: "Processing failed",
                  description:
                    processingError.message ||
                    "Failed to process garment image",
                  type: "error",
                  duration: 3000,
                });
              } finally {
                setIsProcessing(false);
              }
            };
          } catch (readerError) {
            console.error("❌ Error reading file:", readerError);
            toaster.create({
              title: "File read error",
              description: "Failed to read the file",
              type: "error",
              duration: 3000,
            });
            setIsProcessing(false);
          }
        };

        reader.onerror = () => {
          console.error("❌ FileReader error");
          toaster.create({
            title: "Read error",
            description: "Failed to read file",
            type: "error",
            duration: 3000,
          });
          setIsProcessing(false);
        };

        reader.readAsDataURL(file);
      } catch (error) {
        console.error("❌ Error in handleFileSelect:", error);
        toaster.create({
          title: "Upload error",
          description: error.message || "An error occurred during upload",
          type: "error",
          duration: 3000,
        });
        setIsProcessing(false);
      }
    },
    [validateFile, onUpload],
  );

  // ✅ Safe click handlers
  const handleUploadClick = useCallback(() => {
    try {
      fileInputRef.current?.click();
    } catch (error) {
      console.error("❌ Error triggering file input:", error);
    }
  }, []);

  const handleRemovePreview = useCallback(() => {
    try {
      setPreview(null);
      setFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      console.log("✅ Preview removed");
    } catch (error) {
      console.error("❌ Error removing preview:", error);
    }
  }, []);

  // ✅ Memoized button state
  const isButtonDisabled = useMemo(() => {
    return isProcessing || !fileInputRef.current;
  }, [isProcessing]);

  return (
    <VStack spacing={4} w="100%">
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        style={{ display: "none" }}
        onChange={handleFileSelect}
        disabled={isProcessing}
        aria-label="Upload garment image"
        data-testid="garment-file-input"
      />

      {preview ? (
        <Box position="relative" w="100%">
          <Image
            src={preview}
            alt="Garment preview"
            borderRadius="md"
            maxH="300px"
            objectFit="contain"
            mx="auto"
            loading="lazy"
          />
          <HStack position="absolute" top={2} right={2} gap={2}>
            <Button
              size="sm"
              onClick={handleRemovePreview}
              isDisabled={isProcessing}
              aria-label="Remove preview"
              colorScheme="red"
            >
              Remove
            </Button>
          </HStack>
          {fileName && (
            <Text fontSize="xs" color="gray.500" textAlign="center" mt={2}>
              {fileName}
            </Text>
          )}
        </Box>
      ) : (
        <Box
          w="100%"
          h="200px"
          border="2px dashed"
          borderColor="gray.600"
          borderRadius="md"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor={isProcessing ? "not-allowed" : "pointer"}
          onClick={isProcessing ? undefined : handleUploadClick}
          _hover={!isProcessing ? { borderColor: "green.400" } : {}}
          opacity={isProcessing ? 0.6 : 1}
          transition="all 0.2s"
          bg="gray.900"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !isProcessing) {
              handleUploadClick();
            }
          }}
          aria-label="Upload garment image"
          data-testid="garment-upload-area"
        >
          <VStack>
            <Text color="gray.400" fontWeight="500">
              Click to upload garment image
            </Text>
            <Text fontSize="xs" color="gray.500">
              Max file size: 10MB
            </Text>
          </VStack>
        </Box>
      )}

      <Button
        colorScheme="green"
        w="100%"
        onClick={handleUploadClick}
        isLoading={isProcessing}
        loadingText="Processing..."
        isDisabled={isButtonDisabled}
        aria-busy={isProcessing}
        data-testid="upload-button"
      >
        Upload Garment
      </Button>
    </VStack>
  );
};

// ✅ PropTypes validation
GarmentUploader.propTypes = {
  onUpload: PropTypes.func,
};

// ✅ Default props
GarmentUploader.defaultProps = {
  onUpload: null,
};

export default React.memo(GarmentUploader);


