#!/usr/bin/env python3
"""
Test script to check AI service debug endpoint
"""
import requests
import json

def test_debug_endpoint():
    """Test the debug chunks endpoint"""
    try:
        # Test the debug endpoint
        url = "http://localhost:8000/debug/chunks"
        params = {
            "document_id": "68eb912c7bc47c713ceeb546",
            "user_id": "68b2c997b83fe2a15991f7d6"
        }
        
        print(f"🔍 Testing debug endpoint: {url}")
        print(f"🔍 Parameters: {params}")
        
        response = requests.get(url, params=params, timeout=10)
        
        print(f"🔍 Status Code: {response.status_code}")
        print(f"🔍 Response: {json.dumps(response.json(), indent=2)}")
        
    except Exception as e:
        print(f"❌ Error testing debug endpoint: {e}")

if __name__ == "__main__":
    test_debug_endpoint()
