import os
import time
import ssl
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageStat, ImageOps
import numpy as np
from datetime import datetime
import requests
from gradio_client import Client, handle_file
import shutil
from dotenv import load_dotenv
import cv2
import base64

# Multi-token rotation for ZeroGPU quota maximization
HF_TOKENS = [
    os.getenv("HF_TOKEN"),
    os.getenv("HF_TOKEN_2") or os.getenv("HF_TOKEN_BACKUP"),
    os.getenv("HF_TOKEN_3") or os.getenv("HF_TOKEN_BACKUP2")
]
# Strip empty tokens
HF_TOKENS = [t for t in HF_TOKENS if t]

if not HF_TOKENS:
    print("⚠️  Warning: No HF tokens found in environment variables!")

SPACES_CONFIG = {
    "lower_body": [
        "franciszzj/Leffa",                        # ✅ Fast & reliable for pants
        "yisol/IDM-VTON",                         # ✅ Reliable
        "FIT-Check/CatVTON",                      # ⚠️ IndexError-prone, demoted
        "WeShopAI/WeShopAI-Virtual-Try-On",       # ✅ Backup
    ],
    "upper_body": [
        "yisol/IDM-VTON",                         # ✅ Best for tops
        "FIT-Check/CatVTON",                      # ✅ Mirror
        "franciszzj/Leffa",                        # ✅ Mirror
        "WeShopAI/WeShopAI-Virtual-Try-On",       # ✅ Backup
    ],
    "full_body": [
        "FIT-Check/CatVTON",
        "franciszzj/Leffa",
        "WeShopAI/WeShopAI-Virtual-Try-On",
        "yisol/IDM-VTON",
    ],
}

# Flat deduplicated list (used for load_idm_vton_model summary + fallback)
HF_SPACES_PRIORITY = list(dict.fromkeys(
    SPACES_CONFIG["upper_body"] + SPACES_CONFIG["lower_body"]
))



# Import Quota Manager
try:
    from .quota_manager import get_quota_manager, initialize_quota_manager
    QUOTA_MANAGER_AVAILABLE = True
except (ImportError, ValueError):
    try:
        from quota_manager import get_quota_manager, initialize_quota_manager
        QUOTA_MANAGER_AVAILABLE = True
    except ImportError:
        QUOTA_MANAGER_AVAILABLE = False
        print("⚠️  Quota manager not available")

try:
    ssl._create_default_https_context = ssl._create_unverified_context
except AttributeError:
    pass




# ============================================================================
# DYNAMIC MODEL LOADING (Lazy Loading & Space Hopping)
# ============================================================================

def load_idm_vton_model():
    """
    Corrected: Prepares the model configuration. 
    Actual connection happens dynamically during the first request 
    to ensure we always use an 'awake' and 'available' Space.
    """
    print("\n" + "="*60)
    print("📦 PREPARING AI ORCHESTRATOR")
    print("="*60)
    
    if not HF_TOKENS:
        
        print(f" ⚠️  No HF tokens detected. Public spaces will be heavily rate-limited.")
    else:
        print(f" 🔑 {len(HF_TOKENS)} HF token(s) detected. Ready for authenticated rotation.")

    # Return a configuration object instead of a static client
    # This allows the generator to 'hop' between spaces if one fails
    return {
        'type': 'hf_space_orchestrator',
        'priority_list': HF_SPACES_PRIORITY,
        'status': 'ready'
    }

def create_client(space_id, token_index=0):
    """Create a Gradio Client with a specific token from the rotation list."""
    token = HF_TOKENS[token_index % len(HF_TOKENS)] if HF_TOKENS else None
    try:
        if token:
            print(f"      🔑 Connecting to {space_id} (Token {token_index})")
            return Client(space_id, token=token) # Reverted to standard 'token' for v2.0.3 compatibility
        else:
            print(f"      📡 Connecting to {space_id} (No Token)")
            return Client(space_id)
    except Exception as e:
        print(f"      ⚠️  Connection failed: {str(e)[:100]}")
        return None

def _wake_up_space(space_id, token=None):
    """Ping HF space status API to wake it from sleep before calling it."""
    try:
        space_slug = space_id.replace("/", "-").lower()
        url = f"https://huggingface.co/api/spaces/{space_id}/status"
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        resp = requests.get(url, headers=headers, timeout=10)
        status = resp.json().get("stage", "unknown")
        print(f"   🔔 Space {space_id} status: {status}")
        if status in ("SLEEPING", "STOPPED", "BUILDING"):
            print(f"   ⏳ Space is sleeping — sending wake-up request...")
            # Hit the space root to trigger wake-up
            wake_url = f"https://{space_id.replace('/', '-')}.hf.space/"
            requests.get(wake_url, headers=headers, timeout=5)
            print(f"   💤 Wake-up sent. Waiting 15s for space to start...")
            time.sleep(15)
    except Exception as e:
        print(f"   ⚠️  Wake-up ping failed (non-critical): {e}")

# ============================================================================
# THE "SPACE-HOPPER" GENERATOR
# ============================================================================

def _generate_with_hf_orchestrator(person_image, clothing_image, output_folder, specific_space=None, category='upper_body', clothing_details=None):
    """
    The 'Brain' of the operation: 
    1. Tries spaces in order (or a specific space if provided).
    2. Uses .submit() for better control.
    3. Handles timeouts and quota tracking.
    """
    temp_dir = os.path.join(output_folder, f'tmp_{int(time.time())}')
    os.makedirs(temp_dir, exist_ok=True)
    
    # Decide which spaces to try — use category-specific list for best results
    if specific_space:
        spaces_to_try = [specific_space]
    else:
        spaces_to_try = list(SPACES_CONFIG.get(category, SPACES_CONFIG["upper_body"]))

    if not specific_space:
        if category == 'lower_body':
            print("   🔄 Routing: PANTS — using lower_body priority list (CatVTON cloth_type='lower' leads)")
        elif category == 'full_body':
            print("   🔄 Routing: FULL BODY — dress/jumpsuit priority list")
        else:
            print("   🔄 Routing: UPPER BODY — shirt/top priority list (IDM-VTON leads)")
    
    try:
        # Prepare Files
        p_path, c_path = os.path.join(temp_dir, 'p.jpg'), os.path.join(temp_dir, 'c.jpg')
        person_image.convert('RGB').save(p_path, 'JPEG', quality=95)
        clothing_image.convert('RGB').save(c_path, 'JPEG', quality=95)

        # Get description based on category
        print(f"   🎯 ORCHESTRATOR: Target category for AI = '{category}'")
        garment_des = _get_clothing_description(category, clothing_details)
        print(f"   ℹ️  Using description: '{garment_des}' for category: '{category}'")

        for space_id in spaces_to_try:
            # ✅ Guard: IDM-VTON has no garment_type param — skip for lower/full body
            if any(x in space_id for x in ["yisol", "IDM-VTON"]) and category in ('lower_body', 'full_body'):
                print(f"   ⏩ Skipping {space_id} for {category} (no garment_type support)")
                continue

            print(f"   📡 [PRODUCTION TIER] Attempting: {space_id}...")
            
            # Wake up space before attempting
            token = HF_TOKENS[0] if HF_TOKENS else None
            _wake_up_space(space_id, token)
            
            # ✅ PRODUCTION STEP: Smart Retry Logic with Token Rotation
            max_retries = len(HF_TOKENS) if HF_TOKENS else 1
            
            for attempt in range(max_retries):
                # Check if this specific token is in cooldown for this space
                if QUOTA_MANAGER_AVAILABLE:
                    if not get_quota_manager().can_use_space(space_id, token_index=attempt):
                        print(f"      ⏩ Skipping Token {attempt} for {space_id} (cooldown)")
                        continue
                        
                used_token_index = attempt
                try:
                    client = create_client(space_id, token_index=attempt)
                    if not client: 
                        print(f"      ⚠️  Could not connect to {space_id} with token {attempt}")
                        continue

                    # -------------------------------------------------------
                    # Dynamic Signature Selection — per space API format
                    # -------------------------------------------------------

                    if "CatVTON" in space_id or "catvton" in space_id:
                        # Generic CatVTON handler
                        garment_type = "lower" if category == "lower_body" else (
                            "overall" if category == "full_body" else "upper"
                        )
                        
                        if "FIT-Check" in space_id:
                            # ✅ FIX: Pass plain handle_file — NOT ImageEditor dict
                            # The ImageEditor dict caused internal RGBA canvas creation → JPEG error
                            print(f"   🎯 FIT-Check /submit_function cloth_type='{garment_type}'")
                            job = client.submit(
                                person_image=handle_file(p_path),
                                cloth_image=handle_file(c_path),
                                cloth_type=garment_type,
                                num_inference_steps=50,
                                guidance_scale=2.5,
                                seed=42,
                                show_type="result only",
                                api_name="/submit_function"
                            )
                        else:
                            api_name = "/submit" if "flux" in space_id.lower() else "/submit_tryon"
                            print(f"   🎯 CatVTON {api_name} cloth_type='{garment_type}'")
                            job = client.submit(
                                person_image=handle_file(p_path),
                                cloth_image=handle_file(c_path),
                                cloth_type=garment_type,
                                num_inference_steps=35,
                                guidance_scale=3.0,
                                seed=42,
                                show_type="result only",
                                api_name=api_name
                            )

                    elif "Leffa" in space_id or "franciszzj" in space_id:
                        # ✅ FIX: Use /leffa_predict_vt with correct vt_garment_type values
                        l_garment_type = (
                            "lower_body" if category == "lower_body" else
                            "dresses" if category == "full_body" else
                            "upper_body"
                        )
                        print(f"   🎯 Leffa /leffa_predict_vt vt_garment_type='{l_garment_type}'")
                        job = client.submit(
                            src_image_path=handle_file(p_path),
                            ref_image_path=handle_file(c_path),
                            ref_acceleration=False,
                            step=55,
                            scale=2.5, # ✅ Back to 2.5 — 5.0 causes oversaturation
                            seed=42,
                            vt_model_type="viton_hd",
                            vt_garment_type=l_garment_type,
                            vt_repaint=False,
                            api_name="/leffa_predict_vt"
                        )

                    elif "WeShopAI" in space_id:
                        # WeShopAI — updated generic call
                        print(f"   🎯 WeShopAI call")
                        job = client.submit(
                            handle_file(c_path),                   # Step 1: Garment
                            handle_file(p_path),                   # Step 2: Person
                            None,                                  # Step 3: Device State
                        )

                    elif any(x in space_id for x in ["yisol", "IDM-VTON"]):
                        print(f"   🎯 IDM-VTON /tryon")
                        job = client.submit(
                            dict={"background": handle_file(p_path), "layers": [], "composite": handle_file(p_path)},
                            garm_img=handle_file(c_path),
                            garment_des=garment_des,
                            is_checked=True, # ✅ Must be True to prevent IndexError/Empty
                            is_checked_crop=False, # ✅ Full-body processing (True crops too aggressively)
                            denoise_steps=40,
                            seed=42,
                            api_name="/tryon"
                        )

                    else:
                        # Generic catch-all for any future unknown spaces
                        print(f"   🎯 Generic predict for: {space_id}")
                        job = client.submit(handle_file(p_path), handle_file(c_path))

                    # Production Timeout: Spaces need ~60-90s to wake up from sleep
                    timeout = 180 if space_id == HF_SPACES_PRIORITY[0] else 150
                    print(f"   ⏱️  Waiting up to {timeout}s for response (space may be waking up)...")
                    result_path = job.result(timeout=timeout) 
                    
                    # Diagnostics for FIT-Check IndexError
                    if "FIT-Check" in space_id:
                        print(f"   🔍 FIT-Check Debug - Result Type: {type(result_path)}")
                        print(f"   🔍 FIT-Check Debug - Raw Value: {result_path}")

                    # Smart Parsing (v15 Fix: Guard against empty list IndexError)
                    if isinstance(result_path, (list, tuple)):
                        final_path = result_path[0] if len(result_path) > 0 else None
                    else:
                        final_path = result_path

                    if isinstance(final_path, dict):
                        final_path = final_path.get('path') or final_path.get('url') or final_path.get('image')

                    if final_path:
                        print(f"   ✅ SUCCESS: {space_id} delivered result (Token {attempt})")
                        return Image.open(final_path).convert('RGB')
                    else:
                        raise Exception("Empty result from API")

                except Exception as e:
                    error_msg = str(e)
                    print(f"   ⚠️  FAILED: {space_id} (Token {attempt}) - {error_msg[:120]}")

                    if QUOTA_MANAGER_AVAILABLE:
                        try:
                            status = get_quota_manager().on_spaces_error(
                                error_msg, space_id=space_id, token_index=attempt
                            )
                            if status == 'quota_limit':
                                print(f"      🔄 Quota on Token {attempt}. Trying next token...")
                                continue   # ← rotate to next token
                            else:
                                print(f"      ❌ Space error. Moving to next space.")
                                break      # ← skip remaining tokens, try next space
                        except Exception as qe:
                            print(f"      ⚠️  QuotaManager error: {qe}")
                            break

                    if specific_space:
                        return None
                    break

        return None

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
# ============================================================================
# MAIN TRY-ON GENERATION
# ============================================================================

def _map_product_category_to_placement(product_category, item_name=None):
    """
    Maps product database categories to AI service placement categories.
    Ensures shirts/tops are placed correctly on upper body,
    and pants/bottoms are placed correctly on lower body.
    """
    # ℹ️ Verbose logging for debugging the "Pants as Shirts" issue
    raw = str(product_category).lower().strip()
    name = str(item_name).lower().strip() if item_name else ""
    
    # Priority 0: Explicit Placement Recognition
    # If the category is already a valid placement type, we START with that.
    # We only override it if the item_name provides a VERY strong contradictory signal.
    detected_category = 'upper_body' # Default
    if 'lower' in raw: detected_category = 'lower_body'
    elif 'full' in raw or 'overall' in raw: detected_category = 'full_body'
    elif 'upper' in raw: detected_category = 'upper_body'
    
    # Priority 1: Definitive Keyword Recovery (These OVERRIDE the category)
    # If the name is "Denim Jeans" but category is "Top", we fix it to lower_body.
    search_text = f"{raw} {name}".lower().strip()
    
    # Definitive Lower Body
    definitive_lower = ['pant', 'jean', 'trouser', 'legging', 'trackpant', 'jogger', 'sweatpant', 'pajama', 'short', 'skirt', 'chinos', 'bottom']
    if any(k in search_text for k in definitive_lower):
        if detected_category != 'lower_body':
            print(f"   🔍 Category Override: Found lower-body keyword in '{search_text}'")
        return 'lower_body'
        
    # Definitive Full Body
    definitive_full = ['dress', 'gown', 'overall', 'jumpsuit', 'romper', 'saree', 'maxi']
    if any(k in search_text for k in definitive_full):
        return 'full_body'
        
    # Definitive Upper Body
    definitive_upper = ['shirt', 'tshirt', 'top', 'polo', 'blouse', 'jacket', 'coat', 'hoodie', 'sweater', 'blazer', 'vest', 'cardigan']
    if any(k in search_text for k in definitive_upper):
        if detected_category != 'upper_body':
            print(f"   🔍 Category Override: Found upper-body keyword in '{search_text}'")
        return 'upper_body'
    
    # Priority 3: Fallback to the detected category (if it was valid) or default
    return detected_category

def _get_clothing_description(category, details=None):
    """
    Returns a descriptive string for the clothing based on its category.
    Explicit instructions to preserve fine details like pockets, buttons, stitching.
    """
    prefix = f"{details}, " if details else ""
        
    if category == 'lower_body':
        return (f"{prefix}lower body trousers/pants, high-resolution texture, "
                "preserve all pockets, zippers, stitching lines, belt loops, and fabric weave. "
                "Apply ONLY to the leg region. Preserve shirt, face, background, shoes exactly.")
    elif category == 'full_body':
        return (f"{prefix}full body dress or jumpsuit, high-resolution texture, "
                "detailed folds, buttons, pockets, and stitching, worn from shoulders to feet")
    else:
        # upper_body
        return (f"{prefix}upper body shirt or top, high-resolution texture, "
                "preserve all pockets, buttons, collar details, stitching, and fabric pattern. "
                "Apply ONLY to the torso. Preserve pants, face, background, shoes exactly.")

def _apply_surgical_preservation(original_img, ai_result_img, pose_data, category='lower_body'):
    """
    v17 Inverted Surgical Preservation — start with AI, restore original zones on top.
    LOWER_BODY: restore face+shirt above waist AND shoes below ankles from original.
    UPPER_BODY: restore face above neck AND pants+shoes below hips from original.
    """
    try:
        w, h = original_img.size
        # Ensure identical sizes
        if ai_result_img.size != (w, h):
            ai_result_img = ai_result_img.resize((w, h), Image.LANCZOS)

        orig_np = np.array(original_img).astype(np.float32)
        ai_np   = np.array(ai_result_img).astype(np.float32)
        result  = ai_np.copy()   # ← START with full AI output

        # ── Landmark defaults (normalized 0-1) ────────────────────────
        shoulder_y = 0.30
        hip_y      = 0.55
        ankle_y    = 0.87

        if pose_data and len(pose_data) >= 33:
            try:
                shoulder_y = (pose_data[11]['y'] + pose_data[12]['y']) / 2
                hip_y      = (pose_data[23]['y'] + pose_data[24]['y']) / 2
                ankle_y    = (pose_data[27]['y'] + pose_data[28]['y']) / 2
                print(f"   📐 Landmarks → shoulder:{shoulder_y:.3f} hip:{hip_y:.3f} ankle:{ankle_y:.3f}")
            except Exception as e:
                print(f"   ⚠️  Landmark error: {e}")

        BM = max(int(h * 0.035), 15)   # blend margin ≈ 36px on 1024px — tighter transition

        def restore_zone(result, orig, row, direction):
            """
            direction='above': restore original for rows < row (with smooth sigmoid blend)
            direction='below': restore original for rows > row (with smooth sigmoid blend)
            """
            import math
            out = result.copy()
            if direction == 'above':
                hard_end = max(0, row - BM)
                out[:hard_end] = orig[:hard_end]              # 100% original
                for y in range(hard_end, min(row + BM, h)):   # blend zone
                    # Sigmoid curve: much smoother than linear, no visible seam
                    linear_t = (y - hard_end) / (2 * BM)      # 0→1
                    t = 1.0 / (1.0 + math.exp(-12 * (linear_t - 0.5)))  # steep sigmoid
                    t = max(0.0, min(1.0, t))
                    out[y] = orig[y] * (1 - t) + result[y] * t
            elif direction == 'below':
                hard_start = min(h, row + BM)
                out[hard_start:] = orig[hard_start:]           # 100% original
                for y in range(max(0, row - BM), hard_start):  # blend zone
                    linear_t = (hard_start - y) / (2 * BM)     # 0→1
                    t = 1.0 / (1.0 + math.exp(-12 * (linear_t - 0.5)))  # steep sigmoid
                    t = max(0.0, min(1.0, t))
                    out[y] = orig[y] * (1 - t) + result[y] * t
            return out

        if category == 'lower_body':
            # Waistband = hip landmark − 3% (waistband sits just above hip joint)
            waist_row = int((hip_y - 0.03) * h)
            waist_row = min(waist_row, int(h * 0.62))   # safety cap — only triggers for absurd detections
            waist_row = max(waist_row, int(h * 0.30))   # floor safety — never above chest

            # Shoe boundary = ankle - 2% (protect shoes aggressively — crocs/slippers start AT ankle)
            shoe_row  = int((ankle_y - 0.02) * h)
            shoe_row  = max(shoe_row, int(h * 0.75))    # floor: shoes must start below 75%
            shoe_row  = min(shoe_row, int(h * 0.90))    # cap: never past 90%

            print(f"   🛡️  LOWER_BODY mode:")
            print(f"      ↑ Restore original ABOVE row {waist_row} (shirt/face)")
            print(f"      ✂️  AI pants kept: rows {waist_row} → {shoe_row}")
            print(f"      ↓ Restore original BELOW row {shoe_row} (shoes)")

            result = restore_zone(result, orig_np, waist_row, 'above')   # shirt+face
            result = restore_zone(result, orig_np, shoe_row,  'below')   # shoes

        elif category == 'upper_body':
            # Neck = shoulder − 15% (preserve face/hair only)
            neck_row   = int((shoulder_y - 0.15) * h)
            neck_row   = max(neck_row, int(h * 0.06))    # don't clip into absolute top of head

            # Shirt bottom = ankle - 5% (let AI result cover the ENTIRE torso + thighs)
            # Only restore original for feet/shoes at the very bottom
            shirt_bottom_row = int((ankle_y - 0.05) * h)
            shirt_bottom_row = max(shirt_bottom_row, int(h * 0.75))    # floor: at least 75%
            shirt_bottom_row = min(shirt_bottom_row, int(h * 0.90))    # cap: never past 90%

            print(f"   🛡️  UPPER_BODY mode:")
            print(f"      ↑ Restore original ABOVE row {neck_row} (face/hair only)")
            print(f"      ✂️  AI result kept: rows {neck_row} → {shirt_bottom_row}")
            print(f"      ↓ Restore original BELOW row {shirt_bottom_row} (feet/shoes only)")

            result = restore_zone(result, orig_np, neck_row,         'above')
            result = restore_zone(result, orig_np, shirt_bottom_row, 'below')

        result_img = Image.fromarray(np.clip(result, 0, 255).astype(np.uint8), 'RGB')

        # ── Color tone correction ──────────────────────────────────────
        result_img = _correct_color_drift(result_img, original_img, category, shoulder_y, hip_y, ankle_y, h)

        return result_img

    except Exception as e:
        print(f"   ❌ Surgical preservation failed: {e}")
        return ai_result_img

def _correct_color_drift(result_img, original_img, category, shoulder_y, hip_y, ankle_y, h):
    """
    AI models often shift overall brightness/tone. Normalize using a reliable reference zone.
    v18: Uses face area for upper_body (much more stable than ankle strip).
    """
    try:
        result_np = np.array(result_img).astype(np.float32)
        orig_np   = np.array(original_img).astype(np.float32)

        if category == 'lower_body':
            # Reference = preserved shirt zone (above waist)
            ref_y1 = int(h * 0.08)
            ref_y2 = int(shoulder_y * h)
        else:
            # Reference = face area (always preserved, very reliable for skin tone)
            ref_y1 = int(h * 0.02)
            ref_y2 = int((shoulder_y - 0.12) * h)
            # Fallback if face zone is too small
            if ref_y2 - ref_y1 < 20:
                ref_y1 = int(h * 0.02)
                ref_y2 = int(h * 0.15)

        if ref_y2 <= ref_y1 or ref_y1 >= h:
            return result_img

        for c in range(3):
            orig_mean   = orig_np[ref_y1:ref_y2, :, c].mean()
            result_mean = result_np[ref_y1:ref_y2, :, c].mean()
            if result_mean > 5 and orig_mean > 5:
                gain = orig_mean / result_mean
                gain = max(0.95, min(1.05, gain))   # tighter ±5% — prevents skin tone shift
                result_np[:, :, c] = np.clip(result_np[:, :, c] * gain, 0, 255)

        return Image.fromarray(result_np.astype(np.uint8), 'RGB')
    except Exception as e:
        print(f"   ⚠️  Color correction failed: {e}")
        return result_img

def generate_tryon(model, person_image, clothing_items, pose_data, output_folder, segmentation_mask=None):
    try:
        print("\n" + "="*60)
        print("🎨 GENERATING VIRTUAL TRY-ON")
        print("="*60)
        
        # ✅ CRITICAL FIX: Extract first clothing item and category
        if not clothing_items or len(clothing_items) == 0:
            raise ValueError("No clothing items provided")
        
        first_item = clothing_items[0]
        if isinstance(first_item, dict):
            clothing_image = first_item.get('image')
            raw_category = first_item.get('category', 'upper_body')
            item_title = first_item.get('title', '')
            
            # ✅ PRODUCTION STEP: Category Recovery System
            # If the category is default (upper_body), try to extract a better one from the title
            # Ignore "None" or "Unknown Product" title signal
            clean_title = item_title if item_title and str(item_title).lower() not in ['none', 'unknown product'] else ''
            category = _map_product_category_to_placement(raw_category, clean_title)
            
            if category != raw_category:
                print(f"   🛡️  CATEGORY RECOVERY: Mapped based on title '{item_title}'")
                print(f"       Raw: {raw_category} → Recovered: {category}")
            else:
                print(f"   ✅ Using category: {category}")
        else:
            clothing_image = first_item
            category = 'upper_body'
            raw_category = 'upper_body'

        # ✅ VERIFICATION: Extra clear log for user
        print(f"🔍 DEBUG: FINAL category = {category}")
        
        if clothing_image is None:
            raise ValueError("Clothing image is None or missing")
        
        print(f"🔍 DEBUG: person_image.mode = {person_image.mode}")
        print(f"🔍 DEBUG: person_image.size = {person_image.size}")
        print(f"🔍 DEBUG: clothing_image.mode = {clothing_image.mode}")
        print(f"🔍 DEBUG: category = {category}")
        
        # NEW: CHECK POSE DATA AT FUNCTION ENTRY
        print(f"\n🔍 ===== POSE DATA AT generate_tryon ENTRY =====")
        print(f"   Type: {type(pose_data)}")
        print(f"   Is None: {pose_data is None}")
        pose_valid = False
        if pose_data:
            print(f"   Length: {len(pose_data)}")
            print(f"   Sample [0]: {pose_data[0]}")
            if len(pose_data) > 11:
                print(f"   Shoulder [11]: {pose_data[11]}")
                pose_valid = True
        else:
            print(f"   ❌ NO POSE DATA - will use default positions")
        print(f"🔍 ===== END ENTRY CHECK =====\n")
        
        # DEBUG: Log clothing category
        print(f"🎯 Clothing Category: {category}")
        print(f"🎯 Pose Valid: {pose_valid}\n")
        
        # CRITICAL FIX: If person is RGBA, convert to RGB immediately
        if person_image.mode == 'RGBA':
            print("⚠️  WARNING: Person is RGBA! Converting to RGB...")
            background = Image.new('RGB', person_image.size, (255, 255, 255))
            background.paste(person_image, mask=person_image.split()[3])
            person_image = background
            print(f"✅ Converted to: {person_image.mode}")
        
        os.makedirs(output_folder, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
        output_filename = f"tryon-result-{timestamp}.jpg"
        output_path = os.path.join(output_folder, output_filename)
        
        result = None
        
        # ============================================================
        # TIER 1: PRIMARY AUTHENTICATED API (HuggingFace "Best")
        # ============================================================
        tier_used = None
        if not result:
            # ✅ FIX: Use category-specific priority instead of global PRIORITY[0]
            category_spaces = SPACES_CONFIG.get(category, SPACES_CONFIG["upper_body"])
            primary_space = category_spaces[0] if category_spaces else HF_SPACES_PRIORITY[0]
            
            print(f"\n🚀 [TIER 1] Calling Primary AI API for {category}: {primary_space}...")
            print(f"   📊 Space may need 60-90s to wake up if sleeping")
            try:
                details = first_item.get('title') or first_item.get('name') if isinstance(first_item, dict) else None
                result = _generate_with_hf_orchestrator(person_image, clothing_image, output_folder, specific_space=primary_space, category=category, clothing_details=details)
                if result:
                    tier_used = "TIER 1 (Primary HuggingFace AI)"
                    print(f"\n✅ [TIER 1] ✨ Generation successful with {primary_space}!")
                    print(f"   🎨 Quality: Photorealistic AI-powered try-on")
                else:
                    print(f"\n⚠️ [TIER 1] Primary space returned no result")
            except Exception as e:
                error_detail = str(e)
                print(f"\n❌ [TIER 1] Primary API failed")
                print(f"   Error: {error_detail[:150]}")

        # ============================================================
        # TIER 2: SPACE-HOPPING FALLBACK (HuggingFace "Secondary")
        # ============================================================
        if not result:
            print(f"\n🔄 [TIER 2] Initiating Space-Hopping Fallback...")
            print(f"   🔍 Will try {len(HF_SPACES_PRIORITY)-1} alternative spaces")
            try:
                details = first_item.get('title') or first_item.get('name') if isinstance(first_item, dict) else None
                result = _generate_with_hf_orchestrator(person_image, clothing_image, output_folder, category=category, clothing_details=details)
                if result:
                    tier_used = "TIER 2 (Fallback HuggingFace AI)"
                    print(f"\n✅ [TIER 2] ✨ Fallback successful!")
                    print(f"   🎨 Quality: Photorealistic AI-powered try-on")
                else:
                    print(f"\n⚠️ [TIER 2] All HuggingFace spaces failed or returned no result")
            except Exception as e:
                error_msg = str(e)
                print(f"\n❌ [TIER 2] All AI Spaces failed: {error_msg}")

        # ============================================================
        # TIER 3: DOPPEL PROFESSIONAL OVERLAY (Last Resort - Multi-Item)
        # ============================================================
        if not result:
            tier_used = "TIER 3 (Local Overlay Fallback)"
            print(f"\n🎨 [TIER 3] Using Doppel-Quality Professional Overlay...")
            
            result = person_image.copy()
            for idx, item in enumerate(clothing_items, 1):
                clothing_image = item.get('image') if isinstance(item, dict) else item
                raw_category = item.get('category', 'upper_body') if isinstance(item, dict) else 'upper_body'
                item_title = item.get('title', '') if isinstance(item, dict) else ''
                category = _map_product_category_to_placement(raw_category, item_title)
                result = _generate_doppel_quality_overlay(result, clothing_image, pose_data, category)
        
        # ✅ FINAL STEP: AI-RESULT HYBRID COMPOSITING (Anatomical Preservation)
        if result and tier_used and "TIER 3" not in tier_used and category in ['upper_body', 'lower_body'] and pose_valid:
            print(f"   🛡️  Applying Surgical Preservation ({category} mode)...")
            result = _apply_surgical_preservation(person_image, result, pose_data, category=category)
            print(f"   ✅ Hybrid Composite created (original features preserved)")

        # Save result
        if result:
            if result.mode != 'RGB': result = result.convert('RGB')
            result = _professional_post_process(result, category=category, pose_data=pose_data)
            result.save(output_path, 'JPEG', quality=98, optimize=True, progressive=True)
            result_url = _path_to_url(output_path, output_filename)
            file_size = os.path.getsize(output_path) / 1024
            print(f"✅ Saved: {output_filename} ({file_size:.1f} KB)")
            print(f"🎯 GENERATION METHOD: {tier_used}")
            return result_url
        else:
            raise Exception("No result generated")
        
    except Exception as e:
        print(f"\n❌ Generation failed: {str(e)[:100]}")
        import traceback
        traceback.print_exc()
        raise

# ============================================================================
# CLOUD GENERATION
# ============================================================================

# ============================================================================
# DOPPEL-QUALITY PROFESSIONAL OVERLAY
# ============================================================================

def _generate_doppel_quality_overlay(person_image, clothing_image, pose_data, category='upper_body'):
    """
    Production-Grade Doppel-Quality Overlay Fallback.
    Incorporates 3D warping, draping, multi-layer shadows, and lighting matching.
    """
    try:
        print(f"   📍 [PRODUCTION TIER 3] Applying professional {category}...")
        
        # Ensure RGB
        if person_image.mode != 'RGB': person_image = person_image.convert('RGB')
        
        p_w, p_h = person_image.size
        result = person_image.copy()
        
        # 1. Body metrics for accurate placement
        metrics = _extract_body_metrics(pose_data, p_w, p_h)
        
        # --- REMOVE WHITE BACKGROUND & CROP Content ---
        clothing_rgba = clothing_image.convert('RGBA')
        datas = clothing_rgba.getdata()
        new_data = []
        # Aggressive white removal: anything close to white becomes 100% transparent
        for item in datas:
            if item[0] > 235 and item[1] > 235 and item[2] > 235:
                new_data.append((255, 255, 255, 0))
            else:
                # Ensure existing transparency is preserved, but non-white pixels are data
                new_data.append(item)
        clothing_rgba.putdata(new_data)
        
        # ✅ FIX: Crop to content to avoid "tiny box" issue (removes transparent margins)
        bbox = clothing_rgba.getbbox()
        if bbox:
            clothing_rgba = clothing_rgba.crop(bbox)
            print(f"   ✂️  Cropped clothing image to {clothing_rgba.size} (removed white space)")
        
        clothing_image = clothing_rgba
        # ------------------------------
        
        # 2. Intelligent Resizing (Uses the version defined below)
        clothing_resized = _intelligent_clothing_resize(clothing_image, metrics, category)
        
        # 3. 🌀 Perspective Warp (3D Body Curvature)
        clothing_warped = _apply_perspective_warp(clothing_resized, metrics['shoulder_width'], category)
        
        # 4. 👗 Fabric Draping & ✨ Wrinkles
        clothing_draped = _simulate_fabric_draping(clothing_warped, category)
        clothing_draped = _add_wrinkle_details(clothing_draped, category)
        
        # 5. 🎭 Ultra-Smooth Edge Blending
        target_w, target_h = clothing_draped.size
        alpha_mask = _create_production_alpha_mask(clothing_draped, target_w, target_h, category)
        
        clothing_final = clothing_draped.convert('RGBA')
        clothing_final.putalpha(alpha_mask)
        
        # Positioning logic
        pos_x, pos_y = _calculate_professional_position(metrics, target_w, target_h, category)
        
        # 6. 🌑 Advanced Shadow System
        shadow_layers = _create_advanced_shadow_system(clothing_final, result, pos_x, pos_y, category)
        
        # Composite
        composition = result.convert('RGBA')
        for shadow in shadow_layers:
            composition.paste(shadow['image'], (shadow['x'], shadow['y']), shadow['image'])
        
        composition.paste(clothing_final, (pos_x, pos_y), clothing_final)
        
        # 7. 💡 Ambient Lighting Adjustment
        result = _apply_ambient_lighting(composition.convert('RGB'), person_image, pos_x, pos_y, target_w, target_h)
        
        print(f"   ✅ [PRODUCTION TIER 3] Completed: {category}")
        return result
        
    except Exception as e:
        print(f"   ⚠️  Production pipeline error: {e}, using basic fallback")
        import traceback
        traceback.print_exc()
        return _simple_overlay_fallback(person_image, clothing_image, category)

# ============================================================================
# ADVANCED HELPER FUNCTIONS
# ============================================================================

def _extract_body_metrics(pose_data, img_width, img_height):
    """Extract detailed body measurements from pose data"""
    metrics = {
        'shoulder_y':    int(img_height * 0.22),
        'shoulder_width': int(img_width * 0.28),
        'center_x':      img_width // 2,
        'hip_y':         int(img_height * 0.55),
        'hip_x':         img_width // 2,
        'torso_length':  int(img_height * 0.33),
        'ankle_y':       int(img_height * 0.87),
        'neck_y':        int(img_height * 0.15),
    }

    if pose_data and len(pose_data) >= 33:
        try:
            ls = pose_data[11]; rs = pose_data[12]
            lh = pose_data[23]; rh = pose_data[24]
            nose = pose_data[0]
            la = pose_data[27]; ra = pose_data[28]

            s_mid_x = (ls['x'] + rs['x']) / 2
            h_mid_x = (lh['x'] + rh['x']) / 2

            metrics['shoulder_y']     = int((ls['y'] + rs['y']) / 2 * img_height)
            metrics['shoulder_width'] = max(int(abs(rs['x'] - ls['x']) * img_width), int(img_width * 0.15))
            metrics['center_x']       = int(s_mid_x * img_width)
            metrics['hip_x']          = int(h_mid_x * img_width)
            metrics['hip_y']          = int((lh['y'] + rh['y']) / 2 * img_height)
            metrics['ankle_y']        = int((la['y'] + ra['y']) / 2 * img_height)
            metrics['torso_length']   = max(metrics['hip_y'] - metrics['shoulder_y'], int(img_height * 0.15))
            metrics['neck_y']         = int(nose['y'] * img_height)

            print(f"   ✅ Metrics: sw={metrics['shoulder_width']}px "
                  f"cx={metrics['center_x']}px hx={metrics['hip_x']}px "
                  f"hy={metrics['hip_y']}px ay={metrics['ankle_y']}px")

        except (KeyError, IndexError, TypeError) as e:
            print(f"   ⚠️  Using defaults (error: {e})")

    return metrics

def _simple_overlay_fallback(person_image, clothing_image, category='upper_body'):
    """Very basic fallback if the professional pipeline fails"""
    try:
        p_w, p_h = person_image.size
        # Correctly remove white background for simple fallback too
        clothing_rgba = clothing_image.convert('RGBA')
        datas = clothing_rgba.getdata()
        new_data = []
        for item in datas:
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        clothing_rgba.putdata(new_data)
        
        target_w = int(p_w * 0.6)
        ratio = clothing_rgba.width / clothing_rgba.height
        target_h = int(target_w / ratio)
        
        clothing_resized = clothing_rgba.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        result = person_image.copy()
        if category == 'lower_body':
            pos = (p_w // 2 - target_w // 2, int(p_h * 0.6))
        else:
            pos = (p_w // 2 - target_w // 2, int(p_h * 0.2))
            
        result.paste(clothing_resized, pos, clothing_resized)
        return result
    except:
        return person_image

def _path_to_url(full_path, filename):
    """Convert saved image to base64 for cloud deployment"""
    try:
        with open(full_path, 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('utf-8')
        return f"data:image/jpeg;base64,{b64}"
    except Exception as e:
        print(f"   ⚠️  Base64 conversion failed: {e}")
        return f"/uploads/tryon-results/{filename}"

def _professional_post_process(image, category=None, pose_data=None):
    """
    v18: Zone-Aware Post-Processing.
    Applies sharpening ONLY to the garment zone, leaving face/shoes/background natural.
    """
    try:
        from PIL import ImageEnhance, ImageFilter
        import numpy as np
        
        # 1. Very subtle global contrast (natural look)
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.03)
        
        # 2. Minimal color vibrancy
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(1.02)
        
        # 3. Zone-specific sharpening (only the garment area)
        w, h = image.size
        garment_top = 0
        garment_bottom = h
        
        if pose_data and len(pose_data) >= 33:
            try:
                shoulder_y = (pose_data[11]['y'] + pose_data[12]['y']) / 2
                hip_y = (pose_data[23]['y'] + pose_data[24]['y']) / 2
                ankle_y = (pose_data[27]['y'] + pose_data[28]['y']) / 2
                
                if category == 'lower_body':
                    garment_top = int((hip_y - 0.03) * h)
                    garment_bottom = int((ankle_y - 0.02) * h)
                elif category == 'upper_body':
                    garment_top = int((shoulder_y - 0.15) * h)
                    garment_bottom = int((ankle_y - 0.05) * h)
            except Exception:
                pass
        
        # Apply sharpening only to garment zone
        img_np = np.array(image)
        
        # Sharpen just the garment region
        garment_region = image.crop((0, garment_top, w, garment_bottom))
        garment_region = garment_region.filter(ImageFilter.UnsharpMask(radius=1.5, percent=130, threshold=3))
        enhancer = ImageEnhance.Sharpness(garment_region)
        garment_region = enhancer.enhance(1.15)
        
        # Paste sharpened garment back
        image.paste(garment_region, (0, garment_top))
        
        return image
    except Exception as e:
        print(f"   \u26a0\ufe0f Post-processing error: {e}")
        return image


# ============================================================
# PRODUCTION-GRADE TIER 3 ALGORITHMS
# ============================================================

def _apply_perspective_warp(clothing_img, body_width, category='upper_body'):
    try:
        clothing_np = np.array(clothing_img)
        h, w = clothing_np.shape[:2]
        cf = 0.12 if category == "upper_body" else 0.06 if category == "lower_body" else 0.10
        st = 0.08 if category == "upper_body" else 0.04 if category == "lower_body" else 0.06
        src = np.float32([[0,0],[w-1,0],[w-1,h-1],[0,h-1]])
        dst = np.float32([[w*cf,0],[w*(1-cf),0],[w*(1+st),h-1],[-w*st,h-1]])
        M = cv2.getPerspectiveTransform(src, dst)
        warped = cv2.warpPerspective(clothing_np, M, (w,h), flags=cv2.INTER_LANCZOS4,
                                     borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))
        return Image.fromarray(warped, clothing_img.mode)
    except:
        return clothing_img


def _simulate_fabric_draping(clothing_img, category='upper_body', drape_intensity=0.15):
    try:
        clothing_np = np.array(clothing_img)
        h, w = clothing_np.shape[:2]
        X, Y = np.meshgrid(np.arange(w), np.arange(h))
        if category == "lower_body":
            dx = np.sin(Y/h*8*np.pi)*drape_intensity*w*0.02
            dy = np.sin(X/w*6*np.pi)*drape_intensity*h*0.01
        else:
            dx = np.sin(Y/h*5*np.pi)*drape_intensity*w*0.015
            dy = np.sin(X/w*4*np.pi + Y/h*np.pi)*drape_intensity*h*0.01
        Yd = np.clip(Y+dy, 0, h-1).astype(int)
        Xd = np.clip(X+dx, 0, w-1).astype(int)
        draped = np.zeros_like(clothing_np)
        for i in range(h):
            for j in range(w):
                draped[i,j] = clothing_np[Yd[i,j], Xd[i,j]]
        return Image.fromarray(draped, clothing_img.mode)
    except:
        return clothing_img


def _add_wrinkle_details(clothing_img, category='upper_body'):
    try:
        is_rgba = clothing_img.mode == 'RGBA'
        alpha = clothing_img.split()[3] if is_rgba else None
        np_img = np.array(clothing_img.convert('RGB'))
        h, w = np_img.shape[:2]
        wm = cv2.GaussianBlur(np.random.uniform(-0.03, 0.03, (h,w)).astype(np.float32), (7,7), 2.0)
        for c in range(3):
            np_img[:,:,c] = np.clip(np_img[:,:,c]*(1.0+wm), 0, 255).astype(np.uint8)
        result = Image.fromarray(np_img, 'RGB')
        if is_rgba:
            result = result.convert('RGBA')
            result.putalpha(alpha)
        return result
    except:
        return clothing_img

def _create_advanced_shadow_system(clothing_img, person_img, clothing_x, clothing_y, category='upper_body'):
    """Production-grade multi-layer shadow system"""
    try:
        w, h = clothing_img.size
        shadows = []
        if clothing_img.mode != 'RGBA': return shadows
        
        alpha = clothing_img.split()[3]
        
        # AO & Multi-layer shadows
        configs = [
            {'name': 'ao', 'alpha_mult': 0.15, 'blur': 15, 'off': (0,0), 'color': (20,20,20)},
            {'name': 'contact', 'alpha_mult': 0.45, 'blur': 3, 'off': (1,2), 'color': (0,0,0)},
            {'name': 'soft', 'alpha_mult': 0.25, 'blur': 10, 'off': (4,6), 'color': (0,0,0)},
            {'name': 'directional', 'alpha_mult': 0.18, 'blur': 15, 'off': (7,9), 'color': (0,0,0)}
        ]
        
        for cfg in configs:
            mask = alpha.point(lambda p: min(int(p * cfg['alpha_mult']), 255))
            mask = mask.filter(ImageFilter.GaussianBlur(radius=cfg['blur']))
            shadow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            shadow.paste(cfg['color'], (0, 0), mask)
            shadows.append({'image': shadow, 'x': clothing_x + cfg['off'][0], 'y': clothing_y + cfg['off'][1]})
            
        return shadows
    except Exception as e:
        print(f"      ⚠️  Shadows failed: {e}")
        return []

def _apply_ambient_lighting(result_img, person_img, x, y, w, h):
    """Match lighting between clothing and environment"""
    try:
        # Sample area around clothing
        sample = person_img.crop((max(0, x-10), max(0, y-10), min(person_img.width, x+w+10), min(person_img.height, y+h+10)))
        avg_brightness = ImageStat.Stat(sample.convert('L')).mean[0]
        
        result_np = np.array(result_img)
        region = result_np[y:y+h, x:x+w]
        region_brightness = np.mean(region)
        
        if abs(avg_brightness - region_brightness) > 10:
            adj = max(0.92, min(1.08, avg_brightness / max(1, region_brightness)))
            result_np[y:y+h, x:x+w] = np.clip(region * adj, 0, 255).astype(np.uint8)
            
        return Image.fromarray(result_np, 'RGB')
    except Exception as e: return result_img

def _create_production_alpha_mask(clothing_img, w, h, category='upper_body'):
    """Create ultra-smooth alpha mask"""
    try:
        if clothing_img.mode == 'RGBA':
            alpha = np.array(clothing_img.split()[3], dtype=np.float32)
        else:
            alpha = np.full((h, w), 255, dtype=np.float32)
            
        fw, fh = int(w * 0.1), int(h * 0.1)
        
        for y in range(h):
            for x in range(w):
                if alpha[y, x] > 0:
                    dy, dx = min(y, h-y-1), min(x, w-x-1)
                    factor = 1.0
                    if dy < fh: factor *= (dy/fh)**0.6
                    if dx < fw: factor *= (dx/fw)**0.5
                    alpha[y, x] *= factor
        
        mask = Image.fromarray(alpha.astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=2))
        return mask
    except Exception as e: return Image.new('L', (w, h), 230)

def _calculate_professional_position(metrics, tw, th, category):
    if category == "lower_body":
        # Center on hip_x, anchor top at waist (just above hip landmark)
        cx     = metrics.get('hip_x', metrics['center_x']) - (tw // 2)
        hy     = metrics['hip_y']
        sy     = metrics['shoulder_y']
        waist  = hy - int((hy - sy) * 0.08)
        cy     = waist
    elif category == "full_body":
        cx = metrics['center_x'] - (tw // 2)
        cy = metrics['shoulder_y'] - int(th * 0.05)
    else:
        cx = metrics['center_x'] - (tw // 2)
        cy = metrics['shoulder_y'] - int(th * 0.10)
    return cx, cy


def _intelligent_clothing_resize(clothing_img, metrics, category):
    sw = metrics['shoulder_width']

    if category == "lower_body":
        tw = max(int(sw * 1.15), int(metrics.get('hip_x', sw) * 0.45))
        ratio = clothing_img.width / clothing_img.height
        # Height = hip_y → ankle_y + 5% extra
        needed_h = int((metrics['ankle_y'] - metrics['hip_y']) * 1.10) + int(metrics.get('hip_y',0) * 0.05)
        th = max(int(tw / ratio), needed_h)
        tw = int(th * ratio)
        if tw < int(sw * 1.1):
            tw = int(sw * 1.1)
            th = int(tw / ratio)
    elif category == "full_body":
        tw = int(sw * 1.2)
        ratio = clothing_img.width / clothing_img.height
        th = int(tw / ratio)
    else:
        tw = int(sw * 1.3)
        ratio = clothing_img.width / clothing_img.height
        th = int(tw / ratio)

    return clothing_img.resize((max(tw, 10), max(th, 10)), Image.Resampling.LANCZOS)

def generate_animation(image_path, output_folder):
    """
    Stub for animation generation. 
    Currently skipped to focus on core try-on quality.
    """
    return None
