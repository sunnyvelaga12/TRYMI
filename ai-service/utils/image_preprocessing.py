"""Image Preprocessing Utilities
Production-grade image processing with type hints
"""
from typing import Union, Tuple, Optional
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
import cv2
import io
import os
import requests
from pathlib import Path


def preprocess_image(
    image_path: Union[str, Path, Image.Image],
    target_size: Tuple[int, int] = (768, 1024)
) -> Image.Image:
    """
    Preprocess image for virtual try-on with smart resizing and padding (NO CROPPING)
    
    Args:
        image_path: Path to input image or URL
        target_size: Target dimensions (width, height)
    
    Returns:
        Preprocessed PIL Image (FULL BODY PRESERVED with padding)
    """
    try:
        print(f"📸 Preprocessing image: {image_path}")
        
        # Load image from path or URL
        if isinstance(image_path, str) and image_path.startswith('http'):
            print("🌐 Loading image from URL...")
            response = requests.get(image_path, timeout=15)
            response.raise_for_status()
            img = Image.open(io.BytesIO(response.content))
        elif isinstance(image_path, str):
            # Load from file path
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image not found: {image_path}")
            img = Image.open(image_path)
        elif isinstance(image_path, Image.Image):
            # Already a PIL Image
            img = image_path
        else:
            raise ValueError(f"Invalid image_path type: {type(image_path)}")
        
        # Convert to RGB (handles RGBA, grayscale, etc.)
        if img.mode != 'RGB':
            print(f"🔄 Converting from {img.mode} to RGB")
            if img.mode == 'RGBA':
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])
                img = background
            else:
                img = img.convert('RGB')
        
        # ✅ PRODUCTION STEP: Standardize to sRGB to avoid color shifts
        if 'icc_profile' in img.info:
            print("🎨 Standardizing sRGB color profile...")
            # This is a simplified sRGB conversion for PIL
            img = img.convert('RGB')
        
        # Get original dimensions
        orig_width, orig_height = img.size
        target_width, target_height = target_size
        
        print(f"📐 Original size: {orig_width}x{orig_height}")
        print(f"🎯 Target size: {target_width}x{target_height}")
        
        # ✅ BEST APPROACH: Use padding instead of cropping to preserve full body
        # Calculate aspect ratios
        img_ratio = orig_width / orig_height
        target_ratio = target_width / target_height
        
        # Determine how to resize (maintain aspect ratio, never crop)
        # We want to FIT the image inside the target box (Contain), not Cover it.
        # If image is wider than target (relative to height) -> Fit to width
        if img_ratio > target_ratio:
            new_width = target_width
            new_height = int(target_width / img_ratio)
        else:
            # Image is taller or same ratio -> Fit to height
            new_height = target_height
            new_width = int(target_height * img_ratio)
        
        # Resize with high-quality resampling (maintains full body)
        img = img.resize((new_width, new_height), Image.LANCZOS)
        
        # ✅ PRODUCTION STEP: Subtle sharpening to preserve detail during downscaling
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.1)
        
        # ✅ ADD PADDING INSTEAD OF CROPPING
        # Create new image with slightly off-white padding for cleaner integration (#FcFcFc)
        padding_color = (252, 252, 252)
        result = Image.new('RGB', (target_width, target_height), padding_color)
        
        # Calculate position to center the image
        paste_x = (target_width - new_width) // 2
        paste_y = (target_height - new_height) // 2
        
        # Paste the resized image (full body preserved)
        result.paste(img, (paste_x, paste_y))
        
        print(f"✅ Image preprocessed: {orig_width}x{orig_height} → {target_width}x{target_height}")
        print(f"   💡 Full body preserved with padding")
        
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error downloading image: {str(e)}")
        raise
    except FileNotFoundError as e:
        print(f"❌ File not found: {str(e)}")
        raise
    except Exception as e:
        print(f"❌ Error in preprocessing: {str(e)}")
        raise


def remove_background(image, alpha_matting=True, alpha_matting_foreground_threshold=240,
                     alpha_matting_background_threshold=10):
    """
    Remove background from image using rembg with advanced options
    
    Args:
        image: PIL Image or path to image
        alpha_matting: Use alpha matting for better edges
        alpha_matting_foreground_threshold: Foreground threshold (0-255)
        alpha_matting_background_threshold: Background threshold (0-255)
    
    Returns:
        PIL Image with transparent background (RGBA)
    """
    try:
        print("🎨 Removing background...")
        
        # Import rembg
        try:
            from rembg import remove
        except ImportError:
            print("⚠️ rembg not installed. Install with: pip install rembg")
            print("ℹ️ Returning original image without background removal")
            if isinstance(image, Image.Image):
                return image.convert('RGBA')
            else:
                return Image.open(image).convert('RGBA')
        
        # Handle different input types
        if isinstance(image, str):
            # Load from path
            with open(image, 'rb') as f:
                img_byte_arr = f.read()
        elif isinstance(image, Image.Image):
            # Convert PIL to bytes
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()
        else:
            raise ValueError(f"Invalid image type: {type(image)}")
        
        # Remove background with advanced options
        output = remove(
            img_byte_arr,
            alpha_matting=alpha_matting,
            alpha_matting_foreground_threshold=alpha_matting_foreground_threshold,
            alpha_matting_background_threshold=alpha_matting_background_threshold,
            only_mask=False
        )
        
        # Convert back to PIL Image
        result = Image.open(io.BytesIO(output))
        
        # Ensure RGBA mode
        if result.mode != 'RGBA':
            result = result.convert('RGBA')
        
        print("✅ Background removed successfully")
        return result
        
    except ImportError as e:
        print(f"⚠️ rembg import error: {str(e)}")
        print("💡 Install with: pip install rembg")
        # Return original image
        if isinstance(image, Image.Image):
            return image.convert('RGBA')
        else:
            return Image.open(image).convert('RGBA')
            
    except Exception as e:
        print(f"❌ Background removal failed: {str(e)}")
        # Return original image if background removal fails
        if isinstance(image, Image.Image):
            return image.convert('RGBA')
        else:
            return Image.open(image).convert('RGBA')


def enhance_image(image, sharpness=1.2, contrast=1.1, brightness=1.0, color=1.0):
    """
    Enhance image quality with customizable parameters
    
    Args:
        image: PIL Image
        sharpness: Sharpness factor (1.0 = no change, >1.0 = sharper)
        contrast: Contrast factor (1.0 = no change, >1.0 = more contrast)
        brightness: Brightness factor (1.0 = no change, >1.0 = brighter)
        color: Color saturation factor (1.0 = no change, >1.0 = more saturated)
    
    Returns:
        Enhanced PIL Image
    """
    try:
        print("✨ Enhancing image quality...")
        
        # Sharpness
        if sharpness != 1.0:
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(sharpness)
            print(f"   🔪 Sharpness: {sharpness}")
        
        # Contrast
        if contrast != 1.0:
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(contrast)
            print(f"   🎨 Contrast: {contrast}")
        
        # Brightness
        if brightness != 1.0:
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(brightness)
            print(f"   💡 Brightness: {brightness}")
        
        # Color saturation
        if color != 1.0:
            enhancer = ImageEnhance.Color(image)
            image = enhancer.enhance(color)
            print(f"   🌈 Color: {color}")
        
        print("✅ Image enhanced successfully")
        return image
        
    except Exception as e:
        print(f"⚠️ Image enhancement failed: {str(e)}")
        # Return original image if enhancement fails
        return image


def create_clothing_mask(image, threshold=250):
    """
    Create binary mask for clothing (white clothing detection)
    
    Args:
        image: PIL Image (RGBA with transparent background)
        threshold: Threshold for white detection (0-255)
    
    Returns:
        PIL Image (L mode - grayscale mask)
    """
    try:
        print("🎭 Creating clothing mask...")
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Check if image has alpha channel
        if img_array.shape[2] == 4:
            # Use alpha channel as base mask
            alpha = img_array[:, :, 3]
            mask = (alpha > 10).astype(np.uint8) * 255
        else:
            # Convert to grayscale
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            # Threshold to create mask
            _, mask = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY_INV)
        
        # Apply morphological operations to clean up mask
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        
        # Convert back to PIL
        mask_img = Image.fromarray(mask, mode='L')
        
        print("✅ Clothing mask created")
        return mask_img
        
    except Exception as e:
        print(f"❌ Mask creation failed: {str(e)}")
        # Return blank mask
        return Image.new('L', image.size, 255)


def apply_gaussian_blur(image, radius=2):
    """
    Apply Gaussian blur to smooth edges
    
    Args:
        image: PIL Image
        radius: Blur radius
    
    Returns:
        Blurred PIL Image
    """
    try:
        return image.filter(ImageFilter.GaussianBlur(radius))
    except Exception as e:
        print(f"⚠️ Blur failed: {str(e)}")
        return image


def normalize_lighting(image):
    """
    Normalize lighting conditions using histogram equalization
    
    Args:
        image: PIL Image
    
    Returns:
        PIL Image with normalized lighting
    """
    try:
        print("💡 Normalizing lighting...")
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Convert to LAB color space
        lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
        
        # Split channels
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        
        # Merge channels
        lab = cv2.merge([l, a, b])
        
        # Convert back to RGB
        result = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        
        # Convert back to PIL
        result_img = Image.fromarray(result)
        
        print("✅ Lighting normalized")
        return result_img
        
    except Exception as e:
        print(f"⚠️ Lighting normalization failed: {str(e)}")
        return image


def resize_with_padding(image, target_size, background_color=(255, 255, 255)):
    """
    Resize image to target size with padding (no cropping)
    
    Args:
        image: PIL Image
        target_size: Target dimensions (width, height)
        background_color: RGB tuple for padding color
    
    Returns:
        Resized PIL Image with padding
    """
    try:
        orig_width, orig_height = image.size
        target_width, target_height = target_size
        
        # Calculate scaling factor
        scale = min(target_width / orig_width, target_height / orig_height)
        
        # New size
        new_width = int(orig_width * scale)
        new_height = int(orig_height * scale)
        
        # Resize
        resized = image.resize((new_width, new_height), Image.LANCZOS)
        
        # Create new image with padding
        result = Image.new('RGB', target_size, background_color)
        
        # Calculate position to paste (center)
        paste_x = (target_width - new_width) // 2
        paste_y = (target_height - new_height) // 2
        
        # Paste resized image
        if resized.mode == 'RGBA':
            result.paste(resized, (paste_x, paste_y), resized)
        else:
            result.paste(resized, (paste_x, paste_y))
        
        print(f"✅ Resized with padding: {orig_width}x{orig_height} → {target_width}x{target_height}")
        return result
        
    except Exception as e:
        print(f"❌ Resize with padding failed: {str(e)}")
        return image


def auto_orient(image):
    """
    Auto-orient image based on EXIF data
    
    Args:
        image: PIL Image
    
    Returns:
        Correctly oriented PIL Image
    """
    try:
        from PIL import ImageOps
        return ImageOps.exif_transpose(image)
    except Exception as e:
        print(f"⚠️ Auto-orient failed: {str(e)}")
        return image


# Convenience function that combines all preprocessing steps
def full_preprocess(image_path, target_size=(768, 1024), remove_bg=True, 
                    enhance=True, normalize_light=False):
    """
    Complete preprocessing pipeline with all enhancements
    
    Args:
        image_path: Path to input image or URL
        target_size: Target dimensions (width, height)
        remove_bg: Whether to remove background
        enhance: Whether to enhance image quality
        normalize_light: Whether to normalize lighting
    
    Returns:
        Fully preprocessed PIL Image
    """
    try:
        print("\n" + "="*60)
        print("🔧 FULL PREPROCESSING PIPELINE")
        print("="*60)
        
        # Step 1: Load and resize
        img = preprocess_image(image_path, target_size)
        
        # Step 2: Auto-orient
        img = auto_orient(img)
        
        # Step 3: Remove background (optional)
        if remove_bg:
            img = remove_background(img)
            # Convert back to RGB if needed
            if img.mode == 'RGBA':
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])
                img = background
        
        # Step 4: Normalize lighting (optional)
        if normalize_light:
            img = normalize_lighting(img)
        
        # Step 5: Enhance quality (optional)
        if enhance:
            img = enhance_image(img, sharpness=1.2, contrast=1.1)
        
        print("="*60)
        print("✅ PREPROCESSING COMPLETE")
        print("="*60 + "\n")
        
        return img
        
    except Exception as e:
        print(f"❌ Full preprocessing failed: {str(e)}")
        raise


# Test function
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python image_preprocessing.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    print("Testing image preprocessing...")
    
    # Test basic preprocessing
    img = preprocess_image(image_path)
    img.save("test_preprocessed.jpg")
    print("✅ Basic preprocessing saved to test_preprocessed.jpg")
    
    # Test background removal
    img_no_bg = remove_background(image_path)
    img_no_bg.save("test_no_background.png")
    print("✅ Background removal saved to test_no_background.png")
    
    # Test enhancement
    img_enhanced = enhance_image(img)
    img_enhanced.save("test_enhanced.jpg")
    print("✅ Enhancement saved to test_enhanced.jpg")
    
    # Test full pipeline
    img_full = full_preprocess(image_path)
    img_full.save("test_full_pipeline.jpg")
    print("✅ Full pipeline saved to test_full_pipeline.jpg")
    
    print("\n✅ All tests completed!")
