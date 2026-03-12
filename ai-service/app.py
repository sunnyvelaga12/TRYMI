from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import time
import base64
import io
import traceback
from pathlib import Path
from PIL import Image
from dotenv import load_dotenv
import requests
from datetime import datetime

load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================
def get_best_hf_token():
    tokens = [
        os.getenv('HF_TOKEN', ''),
        os.getenv('HF_TOKEN_BACKUP', ''),
        os.getenv('HF_TOKEN_BACKUP2', ''),
    ]
    for token in tokens:
        if token and token.startswith('hf_') and len(token) > 20:
            print(f"Using HF token: {token[:6]}...{token[-4:]}")
            return token
    print("WARNING: No valid HF token found!")
    return ''

HF_TOKEN = get_best_hf_token()
AI_SPACES = ["yisol/IDM-VTON", "kwai-kolors/Kolors-Virtual-Try-On"]

MODEL_LOADED = False
tryon_model = None
MODEL_TYPE = 'Overlay Only'
FORCE_OVERLAY_ONLY = False
LAST_INIT_ERROR = None
INITIALIZED_AT = None

# Import utils
from utils.image_preprocessing import preprocess_image
from utils.pose_detection import detect_pose
from utils.tryon_generator import generate_tryon, generate_animation, load_idm_vton_model
from utils.quota_manager import initialize_quota_manager

# ============================================================================
# FLASK APP
# ============================================================================
app = Flask(__name__)

FRONTEND_URL = os.getenv('FRONTEND_URL', '*')
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:5173", FRONTEND_URL, "*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
    }
})

BASE_DIR = Path(__file__).parent
UPLOAD_FOLDER = BASE_DIR / 'uploads' / 'tryon-results'
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

quota_manager = initialize_quota_manager(hf_token=HF_TOKEN)

# ============================================================================
# INITIALIZE MODEL
# ============================================================================

def load_model():
    global MODEL_LOADED, tryon_model, MODEL_TYPE, INITIALIZED_AT
    try:
        INITIALIZED_AT = time.strftime("%Y-%m-%d %H:%M:%S")
        print("\n" + "="*60)
        print("📦 INITIALIZING AI ORCHESTRATOR")
        print("="*60)
        
        if not HF_TOKEN:
            print("⚠️  Warning: HF_TOKEN is missing! AI generations will fail or be heavily rate-limited.")
        else:
            print(f"🔑 HF_TOKEN detected: {HF_TOKEN[:4]}...{HF_TOKEN[-4:]}")
            
        if FORCE_OVERLAY_ONLY:
            MODEL_LOADED = False
            MODEL_TYPE = 'Overlay Only (Forced)'
            print("⚠️  FORCED OVERLAY MODE ACTIVE")
            return True

        tryon_model = load_idm_vton_model()
        if tryon_model:
            MODEL_LOADED = True
            MODEL_TYPE = "HuggingFace Orchestrator (Ready)"
            print(f"✅ AI Model status: {MODEL_TYPE}")
            return True
        else:
            print("❌ Failed to initialize AI Orchestrator")
            return False
            
    except Exception as e:
        global LAST_INIT_ERROR
        LAST_INIT_ERROR = str(e)
        print(f"❌ Load model error: {e}")
        traceback.print_exc()
        return False

# WSGI Compatibility: load_model will be called on the first request via Lazy Loading
print("🚀 Startup: AI service initialized (Lazy Loading READY)")
# NO load_model() here at top level to prevent startup timeouts

# ============================================================================
# HELPERS
# ============================================================================

def base64_to_pil(b64_string):
    """Convert base64 data URL or raw base64 to PIL Image"""
    try:
        if ',' in b64_string:
            b64_string = b64_string.split(',', 1)[1]
        img_bytes = base64.b64decode(b64_string)
        img = Image.open(io.BytesIO(img_bytes))
        return img.convert('RGB')
    except Exception as e:
        raise ValueError(f"Failed to decode base64 image: {str(e)}")

def url_to_pil(url):
    """Download image from URL and return PIL Image"""
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    img = Image.open(io.BytesIO(response.content))
    return img.convert('RGB')

def pil_to_base64(img):
    """Convert PIL Image to base64 data URL"""
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=90)
    b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return f"data:image/jpeg;base64,{b64}"

def load_image_from_any(source):
    """Load PIL image from base64, URL, or file path"""
    if not source:
        raise ValueError("No image source provided")
    if source.startswith('data:'):
        return base64_to_pil(source)
    if source.startswith('http://') or source.startswith('https://'):
        return url_to_pil(source)
    if os.path.exists(source):
        return preprocess_image(source)
    raise ValueError(f"Cannot load image from: {source[:80]}")

def get_ai_status():
    """Check HuggingFace spaces status"""
    try:
        if not HF_TOKEN:
            return "OFFLINE", "Token Missing", False
        ready_spaces = 0
        for space in AI_SPACES:
            try:
                api_url = f"https://huggingface.co/api/spaces/{space}"
                headers = {"Authorization": f"Bearer {HF_TOKEN}"}
                response = requests.get(api_url, headers=headers, timeout=3)
                if response.status_code == 200:
                    stage = response.json().get("runtime", {}).get("stage", "")
                    if stage == "running":
                        ready_spaces += 1
            except:
                continue
        if ready_spaces == len(AI_SPACES):
            return "FAST", f"All {ready_spaces} AI Spaces Ready", True
        elif ready_spaces > 0:
            return "STABLE", f"AI Ready ({ready_spaces}/{len(AI_SPACES)} spaces active)", True
        else:
            return "SLOW", "AI Spaces sleeping. First request takes 60s+.", True
    except Exception as e:
        return "OFFLINE", f"Status check failed: {str(e)}", False

# ============================================================================
# MODEL INIT
# ============================================================================

# AI model is now initialized at global scope

# ============================================================================
# ENDPOINTS
# ============================================================================

_health_call_count = 0

@app.route('/health', methods=['GET'])
def health_check():
    global _health_call_count
    _health_call_count += 1
    
    # Every 20 health checks (~100 seconds), ping HF spaces to keep them warm
    if _health_call_count % 20 == 0:
        try:
            primary_spaces = ["yisol/IDM-VTON", "franciszzj/Leffa"]
            token = os.getenv("HF_TOKEN")
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            for space in primary_spaces:
                space_slug = space.replace("/", "-").lower()
                url = f"https://{space_slug}.hf.space/"
                requests.get(url, headers=headers, timeout=5)
                print(f"   🔔 Kept warm: {space}")
        except Exception as e:
            print(f"   ⚠️  Warm-up ping failed: {e}")

    return jsonify({
        'status': 'healthy',
        'service': 'TRYMI Virtual Try-On',
        'model_type': MODEL_TYPE,
        'model_loaded': MODEL_LOADED,
        'init_error': LAST_INIT_ERROR,
        'initialized_at': INITIALIZED_AT,
        'hf_token_present': bool(HF_TOKEN),
        'hf_token_prefix': HF_TOKEN[:6] if HF_TOKEN else None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/ai-status', methods=['GET'])
def ai_status():
    label, msg, is_active = get_ai_status()
    return jsonify({
        "status": label,
        "message": msg,
        "isActive": is_active,
        "timestamp": time.time()
    })

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({
        'message': 'TRYMI AI Service Running',
        'model_type': MODEL_TYPE,
        'ai_available': MODEL_LOADED
    })

@app.route('/api/quota-status', methods=['GET', 'OPTIONS'])
def get_quota_status():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        status = quota_manager.get_quota_status()
        return jsonify({'success': True, **status})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/generate-tryon', methods=['POST', 'OPTIONS'])
def generate_tryon_endpoint():
    if request.method == 'OPTIONS':
        return '', 204

    start_time = time.time()

    try:
        # Lazy Loading Guard: Ensure model is loaded before processing
        if not MODEL_LOADED:
            print("🛡️ Lazy Loading: Triggering model initialization...")
            load_model()

        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data received'}), 400

        # Support BOTH old (file path) and new (base64/URL) formats
        person_source = (
            data.get('personImageBase64') or   # NEW: base64 from frontend
            data.get('personImagePath')         # OLD: file path (local dev only)
        )
        clothing_items = data.get('clothingItems', [])
        output_folder = str(data.get('outputFolder', UPLOAD_FOLDER))

        print(f"\n🎨 TRY-ON REQUEST")
        print(f"   Person source type: {'base64' if data.get('personImageBase64') else 'path'}")
        print(f"   Clothing items: {len(clothing_items)}")

        if not person_source:
            return jsonify({'success': False, 'error': 'No person image provided'}), 400
        if not clothing_items:
            return jsonify({'success': False, 'error': 'No clothing items provided'}), 400

        os.makedirs(output_folder, exist_ok=True)

        # Step 1: Load person image
        print("📋 Step 1: Loading person image...")
        person_img = load_image_from_any(person_source)
        print(f"   ✅ Person: {person_img.mode} {person_img.size}")

        # Step 2: Detect pose
        print("📋 Step 2: Detecting pose...")
        pose_landmarks, segmentation_mask = detect_pose(person_img)
        pose_detected = pose_landmarks is not None and len(pose_landmarks) > 0
        print(f"   {'✅' if pose_detected else '⚠️'} Pose detected: {pose_detected}")

        # Step 3: Load & preprocess clothing items
        print(f"📋 Step 3: Loading {len(clothing_items)} clothing item(s)...")
        processed_items = []
        for idx, item in enumerate(clothing_items, 1):
            # Support both imageUrl (new) and clothingImagePath (old)
            source = item.get('imageUrl') or item.get('clothingImagePath')
            if not source:
                print(f"   ⚠️ Item {idx} has no image, skipping")
                continue

            clothing_img = load_image_from_any(source)
            processed_items.append({
                'image': clothing_img,
                'category': item.get('category', 'upper_body'),
                'title': item.get('title', 'Clothing Item'),
            })
            print(f"   ✅ Item {idx}: {clothing_img.size} cat={item.get('category')}")

        if not processed_items:
            return jsonify({'success': False, 'error': 'No valid clothing images'}), 400

        # Step 4: Generate try-on
        print("📋 Step 4: Generating try-on...")
        model_to_use = None if FORCE_OVERLAY_ONLY else tryon_model

        result_image_path = generate_tryon(
            model_to_use,
            person_img,
            processed_items,
            pose_landmarks,
            output_folder,
            segmentation_mask=segmentation_mask
        )
        print(f"   ✅ Result: {result_image_path}")

        # Step 5: Convert result to base64 for response (if not already)
        print("📋 Step 5: Converting result to base64...")
        if result_image_path.startswith('data:image'):
            result_base64 = result_image_path  # already base64 from generate_tryon
        else:
            result_pil = Image.open(result_image_path).convert('RGB')
            result_base64 = pil_to_base64(result_pil)

        # Step 6: Animation (optional)
        animated_base64 = None
        try:
            animated_path = generate_animation(result_image_path, output_folder)
            if animated_path:
                animated_pil = Image.open(animated_path).convert('RGB')
                animated_base64 = pil_to_base64(animated_pil)
        except:
            pass

        processing_time = time.time() - start_time
        print(f"✅ Done in {processing_time:.2f}s")

        return jsonify({
            'success': True,
            'resultImageBase64': result_base64,  # NEW: base64 response
            'resultImageUrl': result_base64,      # Also set as URL for backward compat
            'animatedUrl': animated_base64,
            'processingTime': f"{processing_time:.2f}s",
            'poseDetected': pose_detected,
            'modelUsed': MODEL_TYPE,
        })

    except Exception as e:
        processing_time = time.time() - start_time
        print(f"❌ Generation failed: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Generation failed',
            'details': str(e),
            'processingTime': f"{processing_time:.2f}s",
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
    print("🚀 TRYMI AI SERVICE (Standalone)")
    print("="*60)
    port = int(os.environ.get("PORT", 5001))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True, use_reloader=False)