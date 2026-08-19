import asyncio
import json
import os
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
        
        url = "https://moovitapp.com/tripplan/mumbai-3732/lines/en?customerId=4908&ref=4&query=TMT%20(Thane%20Municipal%20Transport)&af_sub8=%252Findex%252Fen%252Fpublic_transit-lines-Mumbai-3732-983983&af_sub9=agency_show_all_lines"
        print(f"Navigating to TMT: {url}...")
        
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        print("Page DOM loaded. Waiting for list...")
        
        await page.wait_for_selector(".line-row:has(.line-item)", timeout=30000)
        print("Line items loaded.")
        
        viewport_exists = await page.locator("cdk-virtual-scroll-viewport").count() > 0
        scroll_selector = "cdk-virtual-scroll-viewport" if viewport_exists else ".results-wrapper"
        print(f"Scrollable container selector: {scroll_selector}")
        
        lines = {}
        no_new_lines_count = 0
        scroll_attempts = 0
        max_scrolls = 300
        
        while scroll_attempts < max_scrolls:
            rows = await page.locator(".line-row:has(.line-item)").all()
            new_in_this_step = 0
            
            for row in rows:
                try:
                    route_num_el = row.locator(".boxed .text")
                    route_num = await route_num_el.inner_text() if await route_num_el.count() > 0 else ""
                    route_num = route_num.strip()
                    
                    detail_el = row.locator(".line-detail")
                    detail = await detail_el.inner_text() if await detail_el.count() > 0 else ""
                    detail = detail.strip()
                    
                    link_el = row.locator("a")
                    href = await link_el.get_attribute("href") if await link_el.count() > 0 else ""
                    
                    if href and href not in lines:
                        lines[href] = {
                            "route_number": route_num,
                            "route_description": detail,
                            "url": href
                        }
                        new_in_this_step += 1
                except Exception:
                    continue
            
            if new_in_this_step > 0:
                no_new_lines_count = 0
                print(f"Scroll {scroll_attempts}: Found {new_in_this_step} new lines. Total lines so far: {len(lines)}")
            else:
                no_new_lines_count += 1
                
            if no_new_lines_count >= 15:
                print("No new lines found for 15 scrolls. Reached the bottom.")
                break
                
            await page.evaluate(f"document.querySelector('{scroll_selector}').scrollBy(0, 400)")
            await asyncio.sleep(0.5)
            scroll_attempts += 1
            
        print(f"Finished scrolling. Collected {len(lines)} unique TMT lines in total.")
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_file = os.path.join(script_dir, "tmt_lines_list.json")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(list(lines.values()), f, indent=2)
        print(f"Saved lines to {output_file}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
