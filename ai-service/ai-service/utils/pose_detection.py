"""Pose Detection Utilities
Production-grade pose detection with MediaPipe and type hints
"""
from typing import Optional, List, Dict, Tuple, Union
import mediapipe as mp
import numpy as np
from PIL import Image
import cv2
import json
from pathlib import Path

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils


def detect_pose(
    image: Union[str, Path, np.ndarray, Image.Image],
    min_detection_confidence: float = 0.5,
    enable_segmentation: bool = True
) -> Tuple[Optional[List[Dict[str, float]]], Optional[Image.Image]]:
    """
    Detect human pose using MediaPipe
    
    Args:
        image: PIL Image, numpy array, or path string
        min_detection_confidence: Detection confidence threshold (0.0-1.0)
    
    Returns:
        List of 33 landmark dictionaries with keys: x, y, z, visibility
        Returns None if no pose detected
    """
    try:
        print("🧍 Detecting pose with MediaPipe...")
        
        # Handle different input types
        if isinstance(image, str):
            image = Image.open(image)
        
        if isinstance(image, Image.Image):
            img_array = np.array(image)
        elif isinstance(image, np.ndarray):
            img_array = image
        else:
            raise ValueError(f"Unsupported image type: {type(image)}")
        
        # Handle color formats
        if len(img_array.shape) == 2:
            # Grayscale to RGB
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
        elif len(img_array.shape) == 3 and img_array.shape[2] == 4:
            # RGBA to RGB
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)
        
        height, width = img_array.shape[:2]
        
        # Initialize MediaPipe Pose with segmentation
        with mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            enable_segmentation=enable_segmentation,
            min_detection_confidence=min_detection_confidence
        ) as pose:
            
            # Process image
            results = pose.process(img_array)
            
            if not results.pose_landmarks:
                print("⚠️  No pose detected in image")
                return None, None
            
            # Extract segmentation mask if enabled
            segmentation_mask = None
            if enable_segmentation and results.segmentation_mask is not None:
                # Convert to PIL Image (0-255 grayscale)
                mask_array = (results.segmentation_mask * 255).astype(np.uint8)
                # Apply threshold to make it a sharp binary mask
                _, mask_array = cv2.threshold(mask_array, 127, 255, cv2.THRESH_BINARY)
                segmentation_mask = Image.fromarray(mask_array).convert('L')
                print("   🎭 Segmentation mask generated")
            
            # Extract all 33 landmarks as simple list
            landmarks = []
            for landmark in results.pose_landmarks.landmark:
                landmarks.append({
                    'x': landmark.x,        # Normalized [0-1]
                    'y': landmark.y,        # Normalized [0-1]
                    'z': landmark.z,        # Depth
                    'visibility': landmark.visibility
                })
            
            # Calculate confidence
            avg_confidence = sum(l['visibility'] for l in landmarks) / len(landmarks)
            
            # Quick body orientation check
            left_shoulder = landmarks[11]
            right_shoulder = landmarks[12]
            shoulder_diff = abs(left_shoulder['z'] - right_shoulder['z'])
            orientation = 'front' if shoulder_diff < 0.1 else 'side'
            
            print(f"✅ Pose detected: {len(landmarks)} landmarks")
            print(f"   Average confidence: {avg_confidence:.2f}")
            print(f"   Body orientation: {orientation}")
            
            return landmarks, segmentation_mask
            
    except Exception as e:
        print(f"❌ Error in pose detection: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, None

def get_body_metrics(pose_landmarks, img_width, img_height):
    """
    Calculate body measurements from pose landmarks
    
    Args:
        pose_landmarks: List of 33 landmark dicts
        img_width: Image width in pixels
        img_height: Image height in pixels
    
    Returns:
        Dictionary with body measurements
    """
    try:
        if not pose_landmarks or len(pose_landmarks) < 25:
            return None
        
        # Get key landmarks
        left_shoulder = pose_landmarks[11]
        right_shoulder = pose_landmarks[12]
        left_hip = pose_landmarks[23]
        right_hip = pose_landmarks[24]
        
        # Calculate pixel coordinates
        ls_x = int(left_shoulder['x'] * img_width)
        ls_y = int(left_shoulder['y'] * img_height)
        rs_x = int(right_shoulder['x'] * img_width)
        rs_y = int(right_shoulder['y'] * img_height)
        lh_x = int(left_hip['x'] * img_width)
        lh_y = int(left_hip['y'] * img_height)
        rh_x = int(right_hip['x'] * img_width)
        rh_y = int(right_hip['y'] * img_height)
        
        # Calculate measurements
        shoulder_width = abs(rs_x - ls_x)
        shoulder_y = (ls_y + rs_y) // 2
        hip_y = (lh_y + rh_y) // 2
        torso_length = abs(hip_y - shoulder_y)
        center_x = (ls_x + rs_x + lh_x + rh_x) // 4
        
        metrics = {
            'shoulder_width': shoulder_width,
            'shoulder_y': shoulder_y,
            'hip_y': hip_y,
            'torso_length': torso_length,
            'center_x': center_x,
            'left_shoulder_x': ls_x,
            'right_shoulder_x': rs_x
        }
        
        return metrics
        
    except Exception as e:
        print(f"⚠️  Could not calculate body metrics: {str(e)}")
        return None

def draw_pose_landmarks(image, pose_landmarks):
    """
    Draw pose landmarks on image for visualization
    
    Args:
        image: PIL Image
        pose_landmarks: List of landmark dicts
    
    Returns:
        PIL Image with drawn landmarks
    """
    try:
        if not pose_landmarks:
            return image
        
        # Convert to numpy
        img_array = np.array(image)
        height, width = img_array.shape[:2]
        
        # Draw connections
        connections = mp_pose.POSE_CONNECTIONS
        for connection in connections:
            start_idx, end_idx = connection
            if start_idx < len(pose_landmarks) and end_idx < len(pose_landmarks):
                start = pose_landmarks[start_idx]
                end = pose_landmarks[end_idx]
                
                if start['visibility'] > 0.5 and end['visibility'] > 0.5:
                    start_x = int(start['x'] * width)
                    start_y = int(start['y'] * height)
                    end_x = int(end['x'] * width)
                    end_y = int(end['y'] * height)
                    
                    cv2.line(img_array, (start_x, start_y), (end_x, end_y), (0, 255, 0), 2)
        
        # Draw landmark points
        for landmark in pose_landmarks:
            if landmark['visibility'] > 0.5:
                x = int(landmark['x'] * width)
                y = int(landmark['y'] * height)
                cv2.circle(img_array, (x, y), 5, (255, 0, 0), -1)
        
        result = Image.fromarray(img_array)
        return result
        
    except Exception as e:
        print(f"⚠️  Drawing failed: {str(e)}")
        return image

def export_pose_json(pose_landmarks, output_path):
    """Export pose data to JSON file"""
    try:
        with open(output_path, 'w') as f:
            json.dump({'landmarks': pose_landmarks}, f, indent=2)
        print(f"✅ Pose data exported to {output_path}")
    except Exception as e:
        print(f"❌ Export failed: {str(e)}")

# Test
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python pose_detection.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    print("Testing pose detection...\n")
    
    # Detect pose
    landmarks = detect_pose(image_path)
    
    if landmarks:
        print(f"\n✅ Success! Got {len(landmarks)} landmarks")
        print(f"   Sample landmark [0]: {landmarks[0]}")
        print(f"   Sample landmark [11]: {landmarks[11]}")
        
        # Test body metrics
        img = Image.open(image_path)
        metrics = get_body_metrics(landmarks, img.width, img.height)
        if metrics:
            print(f"\n✅ Body metrics:")
            print(f"   Shoulder width: {metrics['shoulder_width']}px")
            print(f"   Torso length: {metrics['torso_length']}px")
        
        # Draw visualization
        result = draw_pose_landmarks(img, landmarks)
        result.save("test_pose_visualization.jpg")
        print(f"\n✅ Visualization saved to test_pose_visualization.jpg")
        
        # Export JSON
        export_pose_json(landmarks, "test_pose_data.json")
        
    else:
        print("\n❌ No pose detected")
