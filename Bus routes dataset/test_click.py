import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        # Launch headful (headless=False) to bypass bot detection, with automation flags disabled
        browser = await p.chromium.launch(
            channel="chrome", 
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()
        
        # Abort ad network requests to speed up load
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
        
        # Go to URL and wait for DOM content
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        print("Page DOM loaded.")
        
        # Wait for the lines list
        print("Waiting for line-row to appear...")
        await page.wait_for_selector(".line-row:has(.line-item)", timeout=30000)
        print("Found line-row elements.")
        
        # Get the first line row text
        first_row = page.locator(".line-row:has(.line-item)").first
        first_text = await first_row.inner_text()
        cleaned_first_text = first_text.replace('\n', ' | ')
        print(f"First row text before click: {cleaned_first_text}")
        
        # Click the first row
        print("Clicking the first line row...")
        await first_row.click()
        
        # Wait for stops list to appear
        print("Waiting for stops list...")
        try:
            await page.wait_for_selector(".stops-list", timeout=20000)
            print("Found stops-list selector!")
        except Exception as e:
            print("Stops-list not found:", e)
            
        print("Current URL after click:", page.url)
        
        # Take a screenshot
        screenshot_path = "test_click_result.png"
        await page.screenshot(path=screenshot_path)
        print(f"Saved screenshot to {screenshot_path}")
        
        # Print stops
        stops_list = page.locator(".stops-list")
        if await stops_list.count() > 0:
            stops_text = await stops_list.inner_text()
            cleaned_stops = stops_text.replace('\n', ' | ')
            print("Stops text snippet:\n", cleaned_stops[:500])
        else:
            print("No stops-list found.")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
