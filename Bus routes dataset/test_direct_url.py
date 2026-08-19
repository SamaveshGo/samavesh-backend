import asyncio
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
        
        # Navigating to the direct route URL we found
        url = "https://moovitapp.com/index/en/public_transit-line-2_LTD-Mumbai-3732-857915-300966836-0"
        print(f"Navigating to {url}...")
        
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        print("Page DOM loaded.")
        
        # Wait for the stops list or stops content
        print("Waiting for stops list...")
        try:
            await page.wait_for_selector(".stops-list", timeout=20000)
            print("Found .stops-list!")
        except Exception as e:
            print("Could not find .stops-list:", e)
            
        print("Current URL:", page.url)
        
        stops_list = page.locator(".stops-list")
        if await stops_list.count() > 0:
            stops_text = await stops_list.inner_text()
            cleaned_stops = stops_text.replace('\n', ' | ')
            print("Stops text snippet:\n", cleaned_stops[:500])
        else:
            # Let's inspect the page content to see if stops are listed in a different selector
            body_text = await page.inner_text("body")
            print("Body snippet (first 1000 chars):\n", body_text[:1000])
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
