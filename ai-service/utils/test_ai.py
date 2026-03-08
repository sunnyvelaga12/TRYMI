import os
from PIL import Image
from dotenv import load_dotenv
# Import the function you just updated
from tryon_generator import _generate_with_hf_orchestrator

load_dotenv()

def run_test():
    print("🧪 Starting AI Connection Test...")
    
    # Create two small blank images to simulate a person and a garment
    # This saves bandwidth and time just to see if the API responds
    dummy_person = Image.new('RGB', (768, 1024), color = (200, 200, 200))
    dummy_garment = Image.new('RGB', (768, 1024), color = (100, 100, 255))
    
    # Try the most stable space first
    test_space = "yisol/IDM-VTON"
    
    print(f"📡 Sending request to {test_space}...")
    result = _generate_with_hf_orchestrator(dummy_person, dummy_garment, test_space)
    
    if result:
        print("✅ SUCCESS! The AI returned an image.")
        result.save("test_output.jpg")
        print("📁 Result saved as 'test_output.jpg'. Check it now!")
    else:
        print("❌ FAILED. The AI did not return an image.")
        print("💡 TIP: Check if your HF_TOKEN in the .env file is correct.")

if __name__ == "__main__":
    run_test()