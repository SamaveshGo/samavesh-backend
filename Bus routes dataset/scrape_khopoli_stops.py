import asyncio
import json
import os
import sys
from playwright.async_api import async_playwright

CONCURRENCY = 5  # Number of parallel pages

script_dir = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(script_dir, "khopoli_lines_list.json")
OUTPUT_FILE = os.path.join(script_dir, "khopoli_kmt_bus_routes.json")

async def scrape_route(context, route_info, sem, progress_data, progress_lock):
    url = route_info["url"]
    route_num = route_info["route_number"]
    route_desc = route_info["route_description"]
    
    async with sem:
        page = await context.new_page()
        
        async def block_resources(route):
            req_type = route.request.resource_type
            url_lower = route.request.url.lower()
            block_patterns = [
                "google-analytics", "analytics", "doubleclick", "pagead", "googlead",
                "adsystem", "pubads", "prebid", "rubiconproject", "casalemedia",
                "cootlogix", "kueezrtb", "minutemedia", "smartadserver", "onetrust",
                "cookielaw", "facebook", "twitter", "adnxs", "openx"
            ]
            if req_type in ["image", "media", "font"] or any(pat in url_lower for pat in block_patterns):
                await route.abort()
            else:
                await route.continue_()
                
        await page.route("**/*", block_resources)
        
        retries = 3
        stops = []
        success = False
        
        for attempt in range(retries):
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await page.wait_for_selector(".stops-list h3", timeout=20000)
                
                stop_elements = await page.locator(".stops-list h3").all()
                stops = []
                for el in stop_elements:
                    text = await el.inner_text()
                    if text.strip():
                        stops.append(text.strip())
                
                if stops:
                    success = True
                    break
                else:
                    await asyncio.sleep(1)
            except Exception:
                await asyncio.sleep(1)
                
        await page.close()
        
        if success:
            async with progress_lock:
                progress_data[url] = {
                    "route_number": route_num,
                    "route_description": route_desc,
                    "url": url,
                    "stops": stops
                }
                with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                    json.dump(list(progress_data.values()), f, indent=2)
            print(f"[SUCCESS] {route_num}: {route_desc} | {len(stops)} stops found.")
        else:
            print(f"[FAILED] {route_num}: {route_desc} | Could not extract stops.")

async def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found. Please run collect_khopoli_lines.py first.")
        sys.exit(1)
        
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        all_routes = json.load(f)
        
    # Filter to only keep Khopoli agency lines (agency ID 983981)
    all_routes = [r for r in all_routes if "-983981-" in r["url"]]
    print(f"Filtered to Khopoli agency lines only. Loaded {len(all_routes)} Khopoli routes to scrape.")
    
    progress_data = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                existing_list = json.load(f)
                for item in existing_list:
                    progress_data[item["url"]] = item
            print(f"Resuming progress: {len(progress_data)} routes already scraped.")
        except Exception as e:
            print("Could not load existing progress, starting fresh:", e)
            
    routes_to_scrape = [r for r in all_routes if r["url"] not in progress_data]
    print(f"Remaining routes to scrape: {len(routes_to_scrape)}")
    
    if not routes_to_scrape:
        print("All routes have already been scraped!")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            channel="chrome", 
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        
        sem = asyncio.Semaphore(CONCURRENCY)
        progress_lock = asyncio.Lock()
        
        tasks = [
            scrape_route(context, route, sem, progress_data, progress_lock)
            for route in routes_to_scrape
        ]
        
        await asyncio.gather(*tasks)
        await browser.close()
        
    print(f"Scraping complete! Total routes in dataset: {len(progress_data)}")

if __name__ == "__main__":
    asyncio.run(main())
