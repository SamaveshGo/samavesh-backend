import asyncio
import json
import time
from playwright.async_api import async_playwright

async def run():
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
        page = await context.new_page()
        
        # Block ads
        async def block_ads(route):
            url = route.request.url.lower()
            block_patterns = [
                "google-analytics", "analytics", "doubleclick", "pagead", "googlead",
                "adsystem", "pubads", "prebid", "rubiconproject", "casalemedia",
                "cootlogix", "kueezrtb", "minutemedia", "smartadserver", "onetrust",
                "cookielaw", "facebook", "twitter", "adnxs", "openx"
            ]
            if any(pattern in url for pattern in block_patterns):
                await route.abort()
            else:
                await route.continue_()
        await page.route("**/*", block_ads)
        
        url = "https://moovitapp.com/tripplan/mumbai-3732/lines/en?customerId=4908&ref=4&query=BEST%20(Brihanmumbai%20Electricity%20Supply%20%26%20Transport)&af_sub8=%2Findex%2Fen%2Fpublic_transit-lines-Mumbai-3732-857915&af_sub9=agency_show_all_lines"
        print(f"Navigating to {url}...")
        
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        print("Page DOM loaded. Waiting for list...")
        
        await page.wait_for_selector(".line-row:has(.line-item)", timeout=30000)
        print("Line items loaded.")
        
        # Find the scrollable container. Usually cdk-virtual-scroll-viewport or results-wrapper
        # Let's inspect the page to see if cdk-virtual-scroll-viewport is there
        viewport_exists = await page.locator("cdk-virtual-scroll-viewport").count() > 0
        scroll_selector = "cdk-virtual-scroll-viewport" if viewport_exists else ".results-wrapper"
        print(f"Scrollable container selector: {scroll_selector}")
        
        lines = {}
        no_new_lines_count = 0
        scroll_attempts = 0
        max_scrolls = 300  # Large enough to cover all lines
        
        while scroll_attempts < max_scrolls:
            # Get currently visible line rows
            rows = await page.locator(".line-row:has(.line-item)").all()
            new_in_this_step = 0
            
            for row in rows:
                try:
                    # Extract details
                    # Route number: text inside boxed
                    route_num_el = row.locator(".boxed .text")
                    route_num = await route_num_el.inner_text() if await route_num_el.count() > 0 else ""
                    route_num = route_num.strip()
                    
                    # Route detail
                    detail_el = row.locator(".line-detail")
                    detail = await detail_el.inner_text() if await detail_el.count() > 0 else ""
                    detail = detail.strip()
                    
                    # Link
                    link_el = row.locator("a")
                    href = await link_el.get_attribute("href") if await link_el.count() > 0 else ""
                    
                    if href and href not in lines:
                        lines[href] = {
                            "route_number": route_num,
                            "route_description": detail,
                            "url": href
                        }
                        new_in_this_step += 1
                except Exception as e:
                    # Occasional detached node error due to scrolling, just ignore and continue
                    continue
            
            if new_in_this_step > 0:
                no_new_lines_count = 0
                print(f"Scroll {scroll_attempts}: Found {new_in_this_step} new lines. Total lines so far: {len(lines)}")
            else:
                no_new_lines_count += 1
                
            # If we haven't seen any new lines for 15 scroll attempts, we might have reached the bottom
            if no_new_lines_count >= 15:
                print("No new lines found for 15 scrolls. Reached the bottom.")
                break
                
            # Scroll down the viewport
            await page.evaluate(f"document.querySelector('{scroll_selector}').scrollBy(0, 400)")
            await asyncio.sleep(0.5)  # Wait for virtual scroll to load new items
            scroll_attempts += 1
            
        print(f"Finished scrolling. Collected {len(lines)} unique lines in total.")
        
        # Save lines list
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_file = os.path.join(script_dir, "lines_list.json")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(list(lines.values()), f, indent=2)
        print(f"Saved lines to {output_file}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
