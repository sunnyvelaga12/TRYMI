from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import time
from pathlib import Path
import traceback
import sys
from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv()
# ============================================================================
# CONFIGURATION & GLOBAL STATE
# ============================================================================
# Use os.getenv to safely fetch the token
HF_TOKEN = os.getenv('HF_TOKEN', '')
AI_SPACES = ["yisol/IDM-VTON", "kwai-kolors/Kolors-Virtual-Try-On"]
import requests
# Global state
MODEL_LOADED = False
tryon_model = None
MODEL_TYPE = 'Doppel-Quality Overlay'
FORCE_OVERLAY_ONLY = False
# ============================================================================
# FORCE MODULE RELOAD
# ============================================================================
if 'utils.tryon_generator' in sys.modules:
    del sys.modules['utils.tryon_generator']
if 'utils.image_preprocessing' in sys.modules:
    del sys.modules['utils.image_preprocessing']
if 'utils.pose_detection' in sys.modules:
    del sys.modules['utils.pose_detection']
if 'utils.quota_manager' in sys.modules:
    del sys.modules['utils.quota_manager']

# Import modules
from utils.image_preprocessing import preprocess_image
from utils.pose_detection import detect_pose
from utils.tryon_generator import generate_tryon, generate_animation, load_idm_vton_model
from utils.quota_manager import initialize_quota_manager, get_quota_manager

# ============================================================================
# FLASK APP
# ============================================================================

app = Flask(__name__)

# CORS configuration
FRONTEND_URL = os.getenv('FRONTEND_URL', '*')
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", FRONTEND_URL],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False,
    }
})

BASE_DIR = Path(__file__).parent
UPLOAD_FOLDER = BASE_DIR / 'uploads' / 'tryon-results'
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

# ============================================================================
# QUOTA MANAGEMENT
# ============================================================================

quota_manager = initialize_quota_manager(hf_token=HF_TOKEN)



# ============================================================================
# MODEL INITIALIZATION
# ============================================================================

def load_model():
    """Load model - try AI first unless forced to overlay only"""
    global MODEL_LOADED, tryon_model, MODEL_TYPE
    
    try:
        print("\n" + "="*60)
        print("🚀 Initializing TRYMI AI Service...")
        print("="*60)
        
        if FORCE_OVERLAY_ONLY:
            print("⚠️  AI models DISABLED - Using Doppel-Quality Overlay only")
            MODEL_LOADED = False
            tryon_model = None
            MODEL_TYPE = 'Doppel-Quality Overlay (Forced)'
        else:
            print("☁️  Attempting to load AI model...")
            tryon_model = load_idm_vton_model()
            
            if tryon_model:
                MODEL_LOADED = True
                if tryon_model.get('type') == 'hf_space_orchestrator':
                    MODEL_TYPE = "HuggingFace: Orchestrator (Multi-Space)"
                else:
                    MODEL_TYPE = f"HuggingFace: {tryon_model.get('space_id', 'Unknown')}"
                print("✅ AI Model loaded - will use with Doppel fallback")
            else:
                MODEL_LOADED = False
                MODEL_TYPE = 'Doppel-Quality Overlay'
                print("⚠️  AI unavailable - using Doppel-Quality Overlay")
        
        print(f"📦 Mode: {MODEL_TYPE}")
        print("="*60 + "\n")
        return True
        
    except Exception as e:
        MODEL_LOADED = False
        MODEL_TYPE = 'Doppel-Quality Overlay'
        print(f"❌ Model load error: {str(e)}")
        print("⚠️  Fallback to Doppel-Quality Overlay")
        print("="*60 + "\n")
        return False

# ============================================================================
# UTILITY
# ============================================================================

def validate_image_path(path, path_type="image"):
    """Validate image path"""
    if not path:
        return False, f"Missing {path_type}"
    
    if path.startswith('http://') or path.startswith('https://'):
        return True, None
    
    if not os.path.exists(path):
        return False, f"{path_type} not found: {path}"
    
    return True, None

def path_to_url(full_path, base_folder):
    """Convert path to URL"""
    try:
        filename = os.path.basename(full_path)
        return f'/uploads/tryon-results/{filename}'
    except:
        return f'/uploads/tryon-results/{os.path.basename(full_path)}'

def get_ai_status(space_id=None):
    """
    Checks if HuggingFace spaces are online.
    Returns: (Label, Message, Is_Active_Boolean)
    """
    try:
        # 1. Quick Check: If token is missing, we can't do anything
        if not HF_TOKEN:
            return "OFFLINE", "Configuration Error: Token Missing", False

        # 2. Deep Check: Ping the HuggingFace API for each space
        ready_spaces = 0
        total_spaces = len(AI_SPACES)

        for space in AI_SPACES:
            try:
                # We check the HF API directly for runtime status
                api_url = f"https://huggingface.co/api/spaces/{space}"
                headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
                response = requests.get(api_url, headers=headers, timeout=3)
                
                if response.status_code == 200:
                    data = response.json()
                    stage = data.get("runtime", {}).get("stage", "")
                    # 'running' is the only status where generation works immediately
                    if stage == "running":
                        ready_spaces += 1
            except:
                continue # Skip if one space fails to respond

        # 3. Determine Final Status
        if ready_spaces == total_spaces:
            return "FAST", f"All {ready_spaces} AI Spaces are Ready", True
        elif ready_spaces > 0:
            return "STABLE", f"AI Ready ({ready_spaces}/{total_spaces} spaces active)", True
        else:
            return "SLOW", "AI Spaces are Sleeping. First request will wake them up (60s+).", True

    except Exception as e:
        return "OFFLINE", f"Status Check Failed: {str(e)}", False
# ============================================================================
# API ENDPOINTS
# ============================================================================

# --- NEW: AI SERVER STATUS (IST TIME AWARE) ---
@app.route('/api/ai-status', methods=['GET'])
def ai_status():
    """Returns real-time health of the AI Space for the React frontend"""
    # Using the yisol space as the primary health indicator
    label, msg, is_active = get_ai_status("yisol/IDM-VTON")
    return jsonify({
        "status": label,
        "message": msg,
        "isActive": is_active,
        "timestamp": time.time()
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'service': 'TRYMI Virtual Try-On',
        'version': '2.5-Debug',
        'model_type': MODEL_TYPE,
        'model_loaded': MODEL_LOADED,
        'overlay_only': FORCE_OVERLAY_ONLY,
        'port': 5001
    })

@app.route('/api/quota-status', methods=['GET', 'OPTIONS'])
def get_quota_status():
    """Get current HuggingFace quota status"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        status = quota_manager.get_quota_status()
        reset_info = quota_manager.get_reset_info()
        
        return jsonify({
            'success': True,
            'quota_status': status['status'],
            'api_quota_reset': status['api_quota_reset'],
            'spaces_quota_reset': status['spaces_quota_reset'],
            'reset_info': reset_info,
            'last_error': status['last_error'],
            'can_retry_api': quota_manager.can_retry_api(),
            'can_retry_spaces': quota_manager.can_retry_spaces(),
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({
        'message': 'TRYMI AI Service Running',
        'model_type': MODEL_TYPE,
        'overlay_mode': 'Doppel-Quality',
        'ai_available': MODEL_LOADED
    })

@app.route('/api/generate-tryon', methods=['POST', 'OPTIONS'])
def generate_tryon_endpoint():
    """Generate virtual try-on with AI (fallback to Doppel-Quality Overlay)"""
    
    if request.method == 'OPTIONS':
        return '', 204
    
    start_time = time.time()
    
    try:
        data = request.get_json()
        print("\n" + "="*60)
        print("🎨 RECEIVED TRY-ON REQUEST")
        print("="*60)
        if data and 'clothingItems' in data and len(data['clothingItems']) > 0:
            print(f"📦 Category received: {data['clothingItems'][0].get('category', 'UNKNOWN')}")
        else:
            print("⚠️  No clothing items or category found in request")
        print("="*60)

        if not data:
            return jsonify({'success': False, 'error': 'No JSON data received'}), 400
        
        person_image_path = data.get('personImagePath')
        clothing_items = data.get('clothingItems', [])  # ✅ Accept array of items
        output_folder = data.get('outputFolder', str(UPLOAD_FOLDER))

        print("\n" + "="*60)
        print("🎨 TRY-ON GENERATION REQUEST")
        print("="*60)
        print(f"📸 Person: {person_image_path}")
        print(f"👕 Clothing Items: {len(clothing_items)}")
        if clothing_items:
            for idx, item in enumerate(clothing_items, 1):
                # Ensure category is present (defaulting to upper_body if missing)
                if 'category' not in item:
                    item['category'] = 'upper_body'
                
                print(f"   [{idx}] Path: {item.get('clothingImagePath', 'N/A')}")
                print(f"       Category: {item.get('category', 'upper_body')}")
        print(f"📁 Output: {output_folder}")
        print(f"🤖 Model: {MODEL_TYPE}")
        
        # Validate inputs
        valid, error = validate_image_path(person_image_path, "Person image")
        if not valid:
            return jsonify({'success': False, 'error': error}), 400
        
        # Validate all clothing items
        if not clothing_items:
            return jsonify({'success': False, 'error': 'No clothing items provided'}), 400
        
        for idx, item in enumerate(clothing_items):
            clothing_path = item.get('clothingImagePath')
            valid, error = validate_image_path(clothing_path, f"Clothing image {idx+1}")
            if not valid:
                return jsonify({'success': False, 'error': error}), 400
        
        os.makedirs(output_folder, exist_ok=True)
        
        # STEP 1: Preprocess person image
        print("📋 Step 1: Preprocessing person image...")
        person_img = preprocess_image(person_image_path)
        
        # CRITICAL FIX: Ensure RGB mode with background
        if person_img.mode == 'RGBA':
            print("   ⚠️  Converting RGBA to RGB...")
            from PIL import Image
            background = Image.new('RGB', person_img.size, (255, 255, 255))
            background.paste(person_img, mask=person_img.split()[3])
            person_img = background
        elif person_img.mode != 'RGB':
            person_img = person_img.convert('RGB')
        
        print(f"✅ Person image preprocessed: {person_img.mode} mode, {person_img.size}")
        
        # STEP 2: Prepare person image
        print("📋 Step 2: Preparing person image...")
        if FORCE_OVERLAY_ONLY or not MODEL_LOADED:
            print("   ⚠️  AI model unavailable - using overlay mode")
            print("   ✅ Using original image with background")
        else:
            print("   ✅ AI model available - preparing for generation")
        
        person_for_generation = person_img.convert('RGB')
        print(f"✅ Person ready: {person_for_generation.mode}, {person_for_generation.size}")
        
        # STEP 3: Detect pose
        print("📋 Step 3: Detecting pose with MediaPipe (and silhouette mask)...")
        pose_landmarks, segmentation_mask = detect_pose(person_for_generation)
        
        pose_detected = False
        
        # CRITICAL DEBUG - CHECK WHAT detect_pose RETURNED
        print(f"\n🔍 ===== POSE DATA DEBUG (app.py) =====")
        print(f"   Landmarks Type: {type(pose_landmarks)}")
        print(f"   Mask Type: {type(segmentation_mask)}")
        
        if pose_landmarks is not None and len(pose_landmarks) > 0:
            pose_detected = True
            print(f"   ✅ Landmarks: {len(pose_landmarks)}")
            if len(pose_landmarks) > 11:
                print(f"   ✅ Landmark [11] (left shoulder): {pose_landmarks[11]}")
            
            # Map pose_landmarks to pose_data for backward compatibility in logs
            pose_data = pose_landmarks
        else:
            print(f"   ⚠️  Pose landmarks is None or empty! Using fallback proportional positioning.")
            pose_data = None
            pose_landmarks = None
        
        if segmentation_mask:
            print(f"   ✅ Silhouette mask captured: {segmentation_mask.size}")
        
        print(f"🔍 ===== END POSE DEBUG =====\n")
        
        # STEP 4: Preprocess all clothing items
        print(f"📋 Step 4: Preprocessing {len(clothing_items)} clothing item(s)...")
        processed_items = []
        
        for idx, item in enumerate(clothing_items, 1):
            clothing_path = item.get('clothingImagePath')
            category = item.get('category', 'upper_body')
            
            clothing_img = preprocess_image(clothing_path)
            
            # Ensure RGB
            if clothing_img.mode == 'RGBA':
                # Convert RGBA to RGB with white background
                bg = Image.fromarray(np.full((clothing_img.height, clothing_img.width, 3), 255, dtype=np.uint8), 'RGB')
                bg.paste(clothing_img, mask=clothing_img.split()[3])
                clothing_img = bg
            elif clothing_img.mode != 'RGB':
                clothing_img = clothing_img.convert('RGB')
            
            # Explicitly include category and title in the dictionary
            processed_items.append({
                'image': clothing_img,
                'category': category,
                'title': item.get('title', 'Unknown Product'),
                'path': clothing_path
            })
            print(f"   ✅ Item {idx}: {clothing_img.mode}, {clothing_img.size}, title='{item.get('title')}', category={category}")
        
        # STEP 5: Generate try-on with all items
        print("📋 Step 5: Generating try-on with all items...")
        
        # CRITICAL: Log what we're passing
        print(f"\n🎯 ===== CALLING generate_tryon WITH =====")
        print(f"   model: {type(tryon_model).__name__ if tryon_model else 'None'}")
        print(f"   person_image: {person_for_generation.mode}, {person_for_generation.size}")
        print(f"   clothing_items: {len(processed_items)}")
        for idx, item in enumerate(processed_items, 1):
            print(f"      [{idx}] {item['image'].mode}, {item['image'].size}, category={item['category']}")
        print(f"   pose_data: {type(pose_data).__name__ if pose_data else 'None'}")
        if pose_data:
            print(f"   pose_data length: {len(pose_data)}")
        print(f"   output_folder: {output_folder}")
        print(f"🎯 ===== END CALL PARAMS =====\n")
        
        # Decide which model to use
        model_to_use = None if FORCE_OVERLAY_ONLY else tryon_model
        
        # CALL generate_tryon with all items
        result_image_path = generate_tryon(
            model_to_use,
            person_for_generation,
            processed_items,  # ✅ Pass all clothing items
            pose_landmarks,   # ✅ Use renamed variable
            output_folder,
            segmentation_mask=segmentation_mask # ✅ Pass mask for perfect alignment
        )
        
        print(f"✅ Try-on generated: {result_image_path}")
        
        # STEP 6: Animation
        print("📋 Step 6: Checking animation...")
        animated_path = None
        try:
            animated_path = generate_animation(result_image_path, output_folder)
            if animated_path:
                print(f"✅ Animation generated: {animated_path}")
            else:
                print("ℹ️  Animation skipped")
        except Exception as anim_error:
            print(f"ℹ️  Animation skipped: {str(anim_error)}")
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Convert paths to URLs
        result_url = path_to_url(result_image_path, UPLOAD_FOLDER)
        animated_url = path_to_url(animated_path, UPLOAD_FOLDER) if animated_path else None
        
        print(f"✅ Processing completed in {processing_time:.2f}s")
        print("="*60 + "\n")
        
        return jsonify({
            'success': True,
            'resultImageUrl': result_url,
            'animatedUrl': animated_url,
            'processingTime': f"{processing_time:.2f}s",
            'poseDetected': pose_detected,
            'modelUsed': MODEL_TYPE,
            'mode': 'overlay_only' if (FORCE_OVERLAY_ONLY or not MODEL_LOADED) else 'ai_with_fallback'
        })
        
    except Exception as e:
        processing_time = time.time() - start_time
        error_message = str(e)
        
        print(f"\n❌ Generation failed: {error_message}")
        # ✅ PRODUCTION STEP: Log the actual traceback for debugging, but don't leak it to client
        traceback.print_exc()
        print("="*60 + "\n")
        
        # Check if this is a quota error and get reset info
        quota_info = None
        if "quota" in error_message.lower() or "rate limit" in error_message.lower():
            quota_info = quota_manager.get_reset_info()
        
        return jsonify({
            'success': False,
            'error': 'Generation failed',
            'details': error_message,
            'processingTime': f"{processing_time:.2f}s",
            'quota_info': quota_info
        }), 500

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 TRYMI AI SERVICE")
    print("="*60)
    print("📦 Service: Virtual Try-On API v2.5-Debug")
    print("🎨 Quality: Doppel-Inspired Professional Overlay")
    print("="*60 + "\n")
    
    print("Initializing AI models...\n")
    load_model()
    
    print("\n✅ Server starting...")
    print("="*60 + "\n")
    
    # ✅ Render sets PORT automatically — read from environment
    port = int(os.environ.get("PORT", 5001))

    try:
        app.run(host='0.0.0.0', port=port, debug=False, threaded=True, use_reloader=False)
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n\n❌ Server error: {e}")
        traceback.print_exc()