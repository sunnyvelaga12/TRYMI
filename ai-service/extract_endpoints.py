from gradio_client import Client
import sys

def extract_endpoints(space_id):
    print(f"\n--- {space_id} ---")
    try:
        client = Client(space_id)
        # Accessing private attribute to get endpoints directly if view_api is too noisy
        for endpoint in client.endpoints:
            print(f"Endpoint: {endpoint.api_name}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    spaces = ["zhengchong/CatVTON", "xiaozaa/catvton-flux-try-on", "franciszzj/Leffa"]
    for s in spaces:
        extract_endpoints(s)
