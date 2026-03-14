"""
Uwear.ai Nanobana Pro Integration
Provides high-quality virtual try-on using Uwear.ai's Gemini Pro model API

API Documentation: https://platform.uwear.ai/api/introduction
Models Available:
- nanobana_pro (Gemini Pro) - Best quality, newest model
- drape_v2_5 - High quality draping
- gemini_flash (Nanobana) - Fast, good quality
"""
import os
import time
import requests
from PIL import Image
from io import BytesIO
import base64
import tempfile
from pathlib import Path


class UwearProvider:
    """Uwear.ai API Provider for Virtual Try-On"""
    
    def __init__(self, api_key=None, base_url=None):
        """
        Initialize Uwear.ai provider
        
        Args:
            api_key: Uwear.ai API key (or set UWEAR_API_KEY env var)
            base_url: API base URL (defaults to https://api.uwear.ai/api/v1)
        """
        self.api_key = api_key or os.getenv('UWEAR_API_KEY')
        self.base_url = base_url or os.getenv('UWEAR_API_URL', 'https://api.uwear.ai/api/v1')
        
        if not self.api_key:
            raise ValueError("Uwear.ai API key is required. Set UWEAR_API_KEY environment variable or pass api_key parameter.")
        
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        self.temp_dir = tempfile.mkdtemp(prefix='uw ear_')
    
    def generate_tryon(self, person_image, clothing_image, options=None):
        """
        Generate virtual try-on using Uwear.ai API
        
        Args:
            person_image: PIL Image of person (will be used for avatar generation)
            clothing_image: PIL Image or URL of clothing
            options: Dict with optional parameters:
                - model_name: 'nanobana_pro' (default), 'drape_v2_5', 'gemini_flash'
                - camera: 'full body shot' (default), 'waist up', 'close up'
                - num_images: Number of images to generate (default: 1)
                - enhance_prompt: Auto-enhance prompts (default: True)
                - prompt: Custom prompt (default: 'studio photography, professional lighting')
        
        Returns:
            PIL Image of try-on result
        """
        try:
            options = options or {}
            model_name = options.get('model_name', 'nanobana_pro')
            
            print(f"   🎨 Using Uwear.ai model: {model_name}")
            
            # Step 1: Upload clothing item
            print("   📤 Uploading clothing to Uwear.ai...")
            clothing_id = self._upload_clothing(clothing_image, enhance=True)
            
            if not clothing_id:
                raise Exception("Failed to upload clothing item")
            
            # Step 2: Create generation request
            print("   🎨 Creating generation request...")
            generation_id = self._create_generation(
                clothing_id=clothing_id,
                model_name=model_name,
                camera=options.get('camera', 'full body shot'),
                num_images=options.get('num_images', 1),
                enhance_prompt=options.get('enhance_prompt', True),
                prompt=options.get('prompt', 'studio photography, professional lighting, high quality')
            )
            
            if not generation_id:
                raise Exception("Failed to create generation request")
            
            # Step 3: Poll for completion
            print("   ⏳ Processing (Nanobana Pro, 10-30 seconds)...")
            result_url = self._poll_generation(generation_id, max_wait=120)
            
            # Step 4: Download result
            print("   📥 Downloading result...")
            result_image = self._download_result(result_url)
            
            print("   ✅ Uwear.ai generation complete!")
            return result_image
            
        except Exception as e:
            print(f"   ❌ Uwear.ai error: {str(e)}")
            raise
    
    def _upload_clothing(self, clothing_image, enhance=True):
        """
        Upload clothing item to Uwear.ai and return clothing_id
        
        Args:
            clothing_image: PIL Image or URL string
            enhance: Whether to enhance the clothing image (costs 1 credit)
        
        Returns:
            clothing_item_id (int)
        """
        try:
            # If it's already a URL, use external_clothing_item_url
            if isinstance(clothing_image, str) and (clothing_image.startswith('http://') or clothing_image.startswith('https://')):
                payload = {
                    "external_clothing_item_url": clothing_image,
                    "enhance": enhance
                }
            else:
                # Save image to temp file for upload
                temp_path = os.path.join(self.temp_dir, 'clothing.jpg')
                clothing_image.convert('RGB').save(temp_path, quality=95)
                
                # Upload file (multipart/form-data)
                files = {
                    'file': ('clothing.jpg', open(temp_path, 'rb'), 'image/jpeg')
                }
                data = {
                    'enhance': str(enhance).lower()
                }
                
                response = requests.post(
                    f"{self.base_url}/clothing_item",
                    headers={'Authorization': f'Bearer {self.api_key}'},
                    files=files,
                    data=data,
                    timeout=60
                )
                
                if response.status_code not in [200, 201]:
                    raise Exception(f"Upload failed: {response.status_code} - {response.text}")
                
                data = response.json()
                clothing_id = data.get('id') or data.get('clothing_item_id')
                
                if not clothing_id:
                    raise Exception(f"No clothing ID in response: {data}")
                
                print(f"   ✅ Clothing uploaded: ID {clothing_id}")
                return clothing_id
            
        except Exception as e:
            raise Exception(f"Clothing upload failed: {str(e)}")
    
    def _create_generation(self, clothing_id, model_name, camera, num_images, enhance_prompt, prompt):
        """
        Create a generation request
        
        Returns:
            generation_id (int)
        """
        try:
            payload = {
                "clothing_item_id": clothing_id,
                "prompt": prompt,
                "camera": camera,
                "num_images": num_images,
                "model_name": model_name,
                "enhance_user_prompt": enhance_prompt
            }
            
            print(f"   📋 Request: {model_name}, camera: {camera}, prompt: '{prompt[:50]}...'")
            
            response = requests.post(
                f"{self.base_url}/generation",
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"API error: {response.status_code} - {response.text}")
            
            data = response.json()
            generation_id = data.get('id')
            
            if not generation_id:
                raise Exception(f"No generation ID in response: {data}")
            
            print(f"   ✅ Generation created: ID {generation_id}")
            return generation_id
            
        except Exception as e:
            raise Exception(f"Generation request failed: {str(e)}")
    
    def _poll_generation(self, generation_id, max_wait=120, poll_interval=3):
        """
        Poll generation status until complete
        
        Returns:
            result_url (str): URL of generated image
        """
        try:
            start_time = time.time()
            last_status = None
            
            while time.time() - start_time < max_wait:
                # Check status
                response = requests.get(
                    f"{self.base_url}/generation/{generation_id}",
                    headers=self.headers,
                    timeout=10
                )
                
                if response.status_code != 200:
                    raise Exception(f"Status check failed: {response.status_code} - {response.text}")
                
                data = response.json()
                status = data.get('status')
                
                # Show status updates
                if status != last_status:
                    print(f"   📊 Status: {status}")
                    last_status = status
                
                if status == 'Done':
                    # Get result URL
                    results = data.get('results', [])
                    if not results:
                        raise Exception("No results in completed generation")
                    
                    # Return first result URL (can be 'url' or 'image_url')
                    result = results[0]
                    result_url = result.get('url') or result.get('image_url') or result.get('output_url')
                    
                    if not result_url:
                        raise Exception(f"No URL in result: {result}")
                    
                    elapsed = time.time() - start_time
                    print(f"   ✅ Complete in {elapsed:.1f}s")
                    return result_url
                
                elif status == 'Failed':
                    error = data.get('error', 'Unknown error')
                    raise Exception(f"Generation failed: {error}")
                
                elif status in ['Created', 'Ongoing', 'Queued']:
                    # Still processing, wait and retry
                    time.sleep(poll_interval)
                    continue
                
                else:
                    raise Exception(f"Unknown status: {status}")
            
            # Timeout
            raise Exception(f"Generation timeout after {max_wait}s (status: {last_status})")
            
        except Exception as e:
            raise Exception(f"Polling failed: {str(e)}")
    
    def _download_result(self, result_url):
        """
        Download result image from URL
        
        Returns:
            PIL Image
        """
        try:
            response = requests.get(result_url, timeout=60)
            if response.status_code != 200:
                raise Exception(f"Download failed: {response.status_code}")
            
            image = Image.open(BytesIO(response.content))
            return image.convert('RGB')
            
        except Exception as e:
            raise Exception(f"Result download failed: {str(e)}")
    
    def check_credits(self):
        """
        Check remaining API credits
        
        Returns:
            int or None: Number of credits remaining, or None if check failed
        """
        try:
            response = requests.get(
                f"{self.base_url}/user/credits",
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return data.get('credits', 0)
            return None
        except:
            return None
    
    def __del__(self):
        """Cleanup temporary files"""
        try:
            import shutil
            if hasattr(self, 'temp_dir') and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir, ignore_errors=True)
        except:
            pass


# Test function
if __name__ == "__main__":
    print("Test Uwear.ai Provider")
    print("=" * 60)
    
    try:
        provider = UwearProvider()
        credits = provider.check_credits()
        print(f"✅ Connected to Uwear.ai!")
        print(f"💳 Credits available: {credits if credits is not None else 'Unknown'}")
        
    except ValueError as e:
        print(f"❌ {e}")
        print("\n📝 To use Uwear.ai:")
        print("1. Sign up at https://platform.uwear.ai")
        print("2. Get free test credits")
        print("3. Generate API key")
        print("4. Set UWEAR_API_KEY environment variable")
    except Exception as e:
        print(f"❌ Error: {e}")
