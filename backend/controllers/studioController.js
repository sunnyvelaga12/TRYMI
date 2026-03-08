const StudioPhoto = require("../models/StudioPhoto");
const TryOnResult = require("../models/TryOnResult");
const Product = require("../models/Product");
const axios = require("axios");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const FormData = require("form-data");

// Flask AI service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

// ✅ Check if AI service is available
const checkAIService = async () => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, {
      timeout: 5000,
    });
    return {
      available: true,
      modelLoaded: response.data.model_loaded,
      status: response.data.status,
    };
  } catch (error) {
    console.warn("⚠️ AI service not available:", error.message);
    return {
      available: false,
      modelLoaded: false,
      error: error.message,
    };
  }
};

// ✅ Upload user photo
exports.uploadPhoto = async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("📸 PHOTO UPLOAD REQUEST");
    console.log("=".repeat(60));
    console.log("File:", req.file);
    console.log("Body:", req.body);

    if (!req.file) {
      console.error("❌ No file in request");
      return res.status(400).json({ error: "No photo uploaded" });
    }

    const photoUrl = `/uploads/studio-photos/${req.file.filename}`;
    const fullPath = path.join(
      __dirname,
      "../../../uploads/studio-photos",
      req.file.filename,
    );

    console.log("📁 Photo URL:", photoUrl);
    console.log("📂 Full path:", fullPath);

    // Verify file exists
    if (!fsSync.existsSync(fullPath)) {
      console.error("❌ File not found after upload:", fullPath);
      return res.status(500).json({ error: "File upload verification failed" });
    }

    // Get image metadata
    let metadata = {};
    try {
      const sharp = require("sharp");
      const imageMetadata = await sharp(req.file.path).metadata();
      metadata = {
        width: imageMetadata.width,
        height: imageMetadata.height,
        format: imageMetadata.format,
        size: req.file.size,
      };
      console.log("📊 Image metadata:", metadata);
    } catch (metaError) {
      console.warn("⚠️ Could not extract metadata:", metaError.message);
      metadata = {
        size: req.file.size,
      };
    }

    // Create database entry
    const studioPhoto = new StudioPhoto({
      userId: req.body.userId || "guest",
      photoUrl: photoUrl,
      metadata: metadata,
    });

    await studioPhoto.save();

    console.log("✅ Photo saved to database:", studioPhoto._id);
    console.log("=".repeat(60) + "\n");

    res.json({
      success: true,
      photoId: studioPhoto._id,
      photoUrl: photoUrl,
      metadata: metadata,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    console.error(error.stack);
    console.log("=".repeat(60) + "\n");
    res.status(500).json({
      error: "Failed to upload photo",
      details: error.message,
    });
  }
};

// ✅ Upload clothing image
exports.uploadClothing = async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("👕 CLOTHING UPLOAD REQUEST");
    console.log("=".repeat(60));

    if (!req.file) {
      console.error("❌ No file in request");
      return res.status(400).json({ error: "No clothing image uploaded" });
    }

    const clothingUrl = `/uploads/studio-photos/${req.file.filename}`;

    console.log("✅ Clothing uploaded:", clothingUrl);
    console.log("=".repeat(60) + "\n");

    res.json({
      success: true,
      clothingUrl: clothingUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error("❌ Clothing upload error:", error);
    console.log("=".repeat(60) + "\n");
    res.status(500).json({
      error: "Failed to upload clothing image",
      details: error.message,
    });
  }
};

// ✅ Generate virtual try-on
exports.generateTryOn = async (req, res) => {
  let tempClothingPath = null;

  try {
    console.log("\n" + "=".repeat(60));
    console.log("🎨 TRY-ON GENERATION REQUEST");
    console.log("=".repeat(60));
    console.log("Body:", req.body);
    console.log("Files:", req.files);

    const { photoId, productId, clothingImageUrl, clothingItems } = req.body;

    // ✅ Validate photo ID
    if (!photoId) {
      console.error("❌ No photo ID provided");
      return res.status(400).json({ error: "Photo ID is required" });
    }

    // ✅ Determine if single or multiple items
    let itemsToProcess = [];

    if (clothingItems) {
      // Multiple items provided as JSON array
      try {
        itemsToProcess =
          typeof clothingItems === "string"
            ? JSON.parse(clothingItems)
            : clothingItems;
        console.log(`✅ Processing ${itemsToProcess.length} clothing items`);
      } catch (parseError) {
        console.error("❌ Failed to parse clothingItems:", parseError.message);
        return res.status(400).json({ error: "Invalid clothingItems format" });
      }
    } else if (productId || clothingImageUrl) {
      // Single item (backward compatibility)
      itemsToProcess = [{
        productId,
        clothingImageUrl,
        productName: req.body.productName,
        category: req.body.category
      }];
      console.log("✅ Processing single clothing item");
    } else if (req.files && req.files.clothingImage) {
      // Uploaded file (backward compatibility)
      itemsToProcess = [{
        uploadedFile: true,
        category: req.body.category,
        productName: req.body.productName
      }];
      console.log("✅ Processing uploaded clothing image");
    }

    // ✅ Get the studio photo with error handling
    let studioPhoto;
    try {
      studioPhoto = await StudioPhoto.findById(photoId);
    } catch (dbError) {
      console.error("❌ Database error finding photo:", dbError.message);
      return res.status(500).json({
        error: "Database error",
        details: dbError.message,
      });
    }

    if (!studioPhoto) {
      console.error("❌ Studio photo not found:", photoId);
      return res.status(404).json({ error: "Studio photo not found" });
    }

    console.log("✅ Found studio photo:", studioPhoto.photoUrl);

    // ✅ Validate person image exists
    const personImagePath = path.join(
      __dirname,
      "../../..",
      studioPhoto.photoUrl,
    );
    console.log("🔍 Checking person image path:", personImagePath);

    if (!fsSync.existsSync(personImagePath)) {
      console.error("❌ Person image file not found:", personImagePath);
      console.error("📁 Current directory:", __dirname);
      console.error(
        "📁 Expected upload path:",
        path.join(__dirname, "../../.."),
      );
      return res
        .status(404)
        .json({ error: "Person image file not found on server" });
    }

    console.log("✅ Person image exists:", personImagePath);

    // ✅ Prepare output folder with error handling
    let outputFolder;
    try {
      outputFolder = path.join(__dirname, "../../../uploads/tryon-results");
      if (!fsSync.existsSync(outputFolder)) {
        fsSync.mkdirSync(outputFolder, { recursive: true });
      }
      console.log("📁 Output folder ready:", outputFolder);
    } catch (folderError) {
      console.error("❌ Failed to create output folder:", folderError.message);
      return res.status(500).json({
        error: "Failed to prepare output directory",
        details: folderError.message,
      });
    }

    // ✅ Prepare request data with all clothing items
    const aiRequestData = {
      personImagePath: personImagePath,
      outputFolder: outputFolder,
      clothingItems: [], // Array to hold all clothing items
    };

    // 🔄 Process all clothing items
    if (req.files && req.files.clothingImage) {
      // Uploaded file
      aiRequestData.clothingItems.push({
        clothingImagePath: req.files.clothingImage[0].path,
        category: req.body.category || "upper_body",
        title: req.body.productName || "Uploaded Item"
      });
      console.log("✅ Added uploaded clothing to request");
    } else if (itemsToProcess && itemsToProcess.length > 0) {
      // Multiple products
      for (const item of itemsToProcess) {
        let imageUrl = item.clothingImageUrl;

        // Fetch product if ID provided
        if (item.productId && !item.clothingImageUrl) {
          try {
            const product = await Product.findById(item.productId);
            if (!product) {
              console.error("❌ Product not found:", item.productId);
              return res.status(404).json({ error: "Product not found" });
            }
            imageUrl = product.image;
            item.title = product.name; // Capture title from DB
            console.log(`✅ Fetched product: ${product.name}`);
          } catch (dbError) {
            console.error("❌ Database error:", dbError.message);
            return res.status(500).json({
              error: "Failed to fetch product",
              details: dbError.message,
            });
          }
        }

        // Download image if URL
        let clothingImagePath = null;
        if (imageUrl && imageUrl.startsWith("http")) {
          try {
            const response = await axios.get(imageUrl, {
              responseType: "arraybuffer",
              timeout: 30000,
            });

            const tempDir = path.join(__dirname, "../../../uploads/temp");
            if (!fsSync.existsSync(tempDir)) {
              fsSync.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilename = `temp-clothing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
            clothingImagePath = path.join(tempDir, tempFilename);
            await fs.writeFile(clothingImagePath, response.data);
            console.log("✅ Downloaded clothing image");
          } catch (downloadError) {
            console.error("❌ Download failed:", downloadError.message);
            return res.status(400).json({
              error: "Failed to download image",
              details: downloadError.message,
            });
          }
        } else if (imageUrl) {
          clothingImagePath = path.join(__dirname, "../../..", imageUrl);
        }

        if (clothingImagePath && fsSync.existsSync(clothingImagePath)) {
          aiRequestData.clothingItems.push({
            clothingImagePath: clothingImagePath,
            category: item.category || "upper_body",
            title: item.title || item.productName || "Clothing Item"
          });
          console.log(
            `✅ Added item: ${item.title || "unnamed"} | Category: ${item.category || "upper_body"}`,
          );
        }
      }
    } else {
      console.error("❌ No clothing items to process");
      return res.status(400).json({ error: "No clothing image provided" });
    }

    if (
      !aiRequestData.clothingItems ||
      aiRequestData.clothingItems.length === 0
    ) {
      console.error("❌ No valid clothing items");
      return res.status(400).json({ error: "No valid clothing images" });
    }

    console.log(
      `✅ Prepared ${aiRequestData.clothingItems.length} clothing item(s) for AI`,
    );

    // ✅ Check AI service availability
    console.log("\n🔍 Checking AI service...");
    const aiServiceStatus = await checkAIService();
    console.log("AI Service Status:", aiServiceStatus);

    let resultImageUrl;
    let processingTime = 0;
    let poseDetected = false;
    let animatedUrl = null;

    if (aiServiceStatus.available) {
      try {
        console.log("\n🤖 Calling AI service for generation...");
        const startTime = Date.now();

        console.log("📤 Sending to AI service:");
        console.log("   URL:", `${AI_SERVICE_URL}/api/generate-tryon`);
        console.log("   Person:", aiRequestData.personImagePath);
        console.log("   Clothing items:", aiRequestData.clothingItems.length);
        console.log("   Output:", aiRequestData.outputFolder);

        let aiResponse;
        try {
          aiResponse = await axios.post(
            `${AI_SERVICE_URL}/api/generate-tryon`,
            aiRequestData,
            {
              headers: {
                "Content-Type": "application/json",
              },
              timeout: 300000, // 5 minutes
            },
          );
        } catch (axiosError) {
          console.error("❌ AI service call failed:");
          console.error("   Message:", axiosError.message);
          console.error("   Code:", axiosError.code);
          console.error("   Status:", axiosError.response?.status);
          console.error("   Data:", axiosError.response?.data);

          if (axiosError.code === "ECONNREFUSED") {
            return res.status(503).json({
              error: "AI service unavailable - connection refused",
              details:
                "The AI generation service is not running at " + AI_SERVICE_URL,
            });
          } else if (axiosError.code === "ENOTFOUND") {
            return res.status(503).json({
              error: "AI service unreachable",
              details: "Cannot resolve AI service host: " + AI_SERVICE_URL,
            });
          } else if (
            axiosError.code === "ETIMEDOUT" ||
            axiosError.code === "ECONNABORTED"
          ) {
            return res.status(504).json({
              error: "AI service timeout",
              details: "Generation took too long (>5 minutes)",
            });
          } else {
            return res.status(502).json({
              error: "AI service error",
              details: axiosError.message,
            });
          }
        }

        processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log("✅ AI service response received");
        console.log("   Processing time:", processingTime, "seconds");
        console.log("   Response data:", aiResponse.data);

        if (!aiResponse.data || !aiResponse.data.success) {
          const errorMsg =
            aiResponse.data?.error || "AI service returned failure";
          console.error("❌ AI service error:", errorMsg);
          throw new Error(errorMsg);
        }

        resultImageUrl = aiResponse.data.resultImageUrl;
        poseDetected = aiResponse.data.poseDetected || false;
        animatedUrl = aiResponse.data.animatedUrl || null;

        // ✅ Verify result image was created
        const resultImagePath = path.join(
          __dirname,
          "../../..",
          resultImageUrl,
        );
        if (!fsSync.existsSync(resultImagePath)) {
          console.error(
            "❌ Result image not found after generation:",
            resultImagePath,
          );
          throw new Error("Result image was not created by AI service");
        }

        console.log("✅ Result image verified:", resultImagePath);
        console.log(`⏱️ Processing time: ${processingTime}s`);
      } catch (aiError) {
        console.error("❌ AI service error:", aiError.message);
        console.error("   Response:", aiError.response?.data);

        // Fallback to simple method
        console.log("\n⚠️ Using fallback method...");
        resultImageUrl = await createFallbackResult(
          personImagePath,
          clothingImagePath,
          outputFolder,
        );
      }
    } else {
      // AI service not available - use fallback
      console.log("\n⚠️ AI service not available, using fallback method...");
      resultImageUrl = await createFallbackResult(
        personImagePath,
        clothingImagePath,
        outputFolder,
      );
    }

    // ✅ Save result to database
    console.log("\n💾 Saving to database...");
    let savedResult;
    try {
      // Validate productId - convert to string if provided
      let validProductId = null;
      if (productId) {
        validProductId = String(productId);
        console.log("📦 Product ID:", validProductId);
      }

      const tryOnResult = new TryOnResult({
        userId: studioPhoto.userId,
        studioPhotoId: photoId,
        productId: validProductId,
        originalPhotoUrl: studioPhoto.photoUrl,
        clothingImageUrl:
          clothingImageUrl ||
          `/uploads/temp/${path.basename(clothingImagePath)}`,
        resultImageUrl: resultImageUrl,
        animatedUrl: animatedUrl,
        processingTime: processingTime > 0 ? `${processingTime}s` : undefined,
        poseDetected: poseDetected,
        status: "completed",
      });

      await tryOnResult.save();
      savedResult = tryOnResult;
      console.log("✅ Try-on result saved:", tryOnResult._id);
    } catch (dbSaveError) {
      console.error("❌ Database save error:", dbSaveError.message);
      console.error("   Details:", dbSaveError.toString());
      return res.status(500).json({
        error: "Failed to save try-on result to database",
        details: dbSaveError.message,
      });
    }

    console.log("=".repeat(60) + "\n");

    // ✅ Cleanup temp file
    if (tempClothingPath && fsSync.existsSync(tempClothingPath)) {
      try {
        await fs.unlink(tempClothingPath);
        console.log("🗑️ Temp file cleaned up");
      } catch (cleanupError) {
        console.warn("⚠️ Could not delete temp file:", cleanupError.message);
      }
    }

    res.json({
      success: true,
      resultId: savedResult._id,
      resultImageUrl: resultImageUrl,
      animatedUrl: animatedUrl,
      processingTime: processingTime > 0 ? `${processingTime}s` : undefined,
      poseDetected: poseDetected,
    });
  } catch (error) {
    console.error("❌ Try-on generation error:", error);
    console.error(error.stack);
    console.log("=".repeat(60) + "\n");

    // Cleanup temp file on error
    if (tempClothingPath && fsSync.existsSync(tempClothingPath)) {
      try {
        await fs.unlink(tempClothingPath);
      } catch (cleanupError) {
        console.warn("⚠️ Could not delete temp file on error");
      }
    }

    res.status(500).json({
      error: "Failed to generate try-on",
      details: error.message,
    });
  }
};

// ✅ Fallback result creation (simple overlay)
async function createFallbackResult(
  personImagePath,
  clothingImagePath,
  outputFolder,
) {
  try {
    console.log("🎨 Creating fallback composite...");

    const sharp = require("sharp");
    const timestamp = Date.now();
    const resultFilename = `tryon-result-${timestamp}.jpg`;
    const resultPath = path.join(outputFolder, resultFilename);

    // Load person image
    const personImage = sharp(personImagePath);
    const personMetadata = await personImage.metadata();

    // Load and resize clothing
    const clothingImage = sharp(clothingImagePath);
    const clothingMetadata = await clothingImage.metadata();

    // Calculate clothing size (40% of person width)
    const clothingWidth = Math.floor(personMetadata.width * 0.4);
    const clothingHeight = Math.floor(
      (clothingWidth * clothingMetadata.height) / clothingMetadata.width,
    );

    // Resize clothing
    const resizedClothing = await clothingImage
      .resize(clothingWidth, clothingHeight, { fit: "contain" })
      .toBuffer();

    // Position clothing (center-top)
    const left = Math.floor((personMetadata.width - clothingWidth) / 2);
    const top = Math.floor(personMetadata.height * 0.2);

    // Composite images
    await personImage
      .composite([
        {
          input: resizedClothing,
          top: top,
          left: left,
          blend: "over",
        },
      ])
      .jpeg({ quality: 90 })
      .toFile(resultPath);

    console.log("✅ Fallback result created:", resultPath);

    return `/uploads/tryon-results/${resultFilename}`;
  } catch (fallbackError) {
    console.error("❌ Fallback creation failed:", fallbackError.message);

    // Last resort: copy person image
    const timestamp = Date.now();
    const resultFilename = `tryon-result-${timestamp}.jpg`;
    const resultPath = path.join(outputFolder, resultFilename);

    await fs.copyFile(personImagePath, resultPath);
    console.log("⚠️ Used person image as fallback");

    return `/uploads/tryon-results/${resultFilename}`;
  }
}

// ✅ Get try-on result
exports.getResult = async (req, res) => {
  try {
    console.log("🔍 Fetching result:", req.params.resultId);

    const result = await TryOnResult.findById(req.params.resultId)
      .populate("studioPhotoId")
      .populate("productId");

    if (!result) {
      console.error("❌ Result not found:", req.params.resultId);
      return res.status(404).json({ error: "Result not found" });
    }

    console.log("✅ Result found:", result._id);

    res.json({
      _id: result._id,
      originalPhotoUrl:
        result.studioPhotoId?.photoUrl || result.originalPhotoUrl,
      resultImageUrl: result.resultImageUrl,
      animatedUrl: result.animatedUrl,
      productId: result.productId?._id,
      productName: result.productId?.name,
      processingTime: result.processingTime,
      poseDetected: result.poseDetected,
      createdAt: result.createdAt,
      saved: result.saved,
    });
  } catch (error) {
    console.error("❌ Get result error:", error);
    res.status(500).json({
      error: "Failed to fetch result",
      details: error.message,
    });
  }
};

// ✅ Save look to favorites
exports.saveLook = async (req, res) => {
  try {
    const { resultId } = req.body;

    console.log("💾 Saving look:", resultId);

    const result = await TryOnResult.findByIdAndUpdate(
      resultId,
      { saved: true },
      { new: true },
    );

    if (!result) {
      console.error("❌ Result not found:", resultId);
      return res.status(404).json({ error: "Result not found" });
    }

    console.log("✅ Look saved:", resultId);

    res.json({
      success: true,
      message: "Look saved successfully",
      result: result,
    });
  } catch (error) {
    console.error("❌ Save look error:", error);
    res.status(500).json({
      error: "Failed to save look",
      details: error.message,
    });
  }
};

// ✅ Get user's saved looks
exports.getMyLooks = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("📚 Fetching looks for user:", userId);

    const looks = await TryOnResult.find({
      userId: userId,
      saved: true,
    })
      .populate("productId")
      .populate("studioPhotoId")
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${looks.length} saved looks`);

    res.json({
      success: true,
      looks: looks,
    });
  } catch (error) {
    console.error("❌ Get my looks error:", error);
    res.status(500).json({
      error: "Failed to fetch looks",
      details: error.message,
    });
  }
};

// ✅ Delete look
exports.deleteLook = async (req, res) => {
  try {
    const { resultId } = req.params;

    console.log("🗑️ Deleting look:", resultId);

    const result = await TryOnResult.findByIdAndDelete(resultId);

    if (!result) {
      console.error("❌ Result not found:", resultId);
      return res.status(404).json({ error: "Result not found" });
    }

    // Optionally delete result image file
    if (result.resultImageUrl) {
      const imagePath = path.join(__dirname, "../../..", result.resultImageUrl);
      if (fsSync.existsSync(imagePath)) {
        try {
          await fs.unlink(imagePath);
          console.log("🗑️ Result image deleted");
        } catch (deleteError) {
          console.warn(
            "⚠️ Could not delete result image:",
            deleteError.message,
          );
        }
      }
    }

    console.log("✅ Look deleted:", resultId);

    res.json({
      success: true,
      message: "Look deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete look error:", error);
    res.status(500).json({
      error: "Failed to delete look",
      details: error.message,
    });
  }
};

// ✅ Get all try-on results for a user
exports.getAllResults = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log("📋 Fetching all results for user:", userId);

    const results = await TryOnResult.find({ userId: userId })
      .populate("productId")
      .populate("studioPhotoId")
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${results.length} results`);

    res.json({
      success: true,
      results: results,
    });
  } catch (error) {
    console.error("❌ Get all results error:", error);
    res.status(500).json({
      error: "Failed to fetch results",
      details: error.message,
    });
  }
};

module.exports = exports;
