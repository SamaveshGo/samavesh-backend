import json
from urllib.parse import urlparse

har_path = "/Users/riteshjadhav/Downloads/moovitapp.com.har"

with open(har_path, 'r', encoding='utf-8', errors='ignore') as f:
    data = json.load(f)
    entries = data.get('log', {}).get('entries', [])
    
    print(f"Total entries: {len(entries)}")
    for idx, entry in enumerate(entries):
        request = entry.get('request', {})
        url = request.get('url', '')
        response = entry.get('response', {})
        content = response.get('content', {})
        size = content.get('size', 0)
        mime = content.get('mimeType', '')
        status = response.get('status', 0)
        
        parsed = urlparse(url)
        if 'moovitapp.com' in parsed.netloc:
            # Let's see all moovitapp requests
            print(f"{idx}: {request.get('method')} {parsed.path} | Query: {parsed.query} | Status: {status} | Mime: {mime} | Size: {size} bytes")
