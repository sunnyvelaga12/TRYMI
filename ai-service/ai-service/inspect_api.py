from gradio_client import Client

print("Connecting to Kwai-Kolors...")
try:
    client = Client("Kwai-Kolors/Kolors-Virtual-Try-On")
    print("\n=== KOLORS API ===")
    client.view_api()
except Exception as e:
    print(f"Kolors Error: {e}")

