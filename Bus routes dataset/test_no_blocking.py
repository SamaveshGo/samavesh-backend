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
        
        # NO BLOCKING AT ALL
        
        url = "https://moovitapp.com/index/en/public_transit-line-2_LTD-Mumbai-3732-857915-300966836-0"
        print(f"Navigating to {url}...")
        
        await page.goto(url, wait_until="load", timeout=45000)
        print("Page fully loaded. Waiting for stops-list...")
        
        try:
            await page.wait_for_selector(".stops-list .stop-item", timeout=20000)
            print("Successfully found stop-item!")
            
            # Print first few stop names
            stop_elements = await page.locator(".stops-list .stop-item .title").all()
            print(f"Found {len(stop_elements)} stop-item elements.")
            for idx, el in enumerate(stop_elements[:5]):
                print(f" Stop {idx+1}: {await el.inner_text()}")
        except Exception as e:
            print("Failed to find stop-item:", e)
            # Take a screenshot to inspect
            await page.screenshot(path="moovit_no_blocking_test.png")
            print("Saved screenshot to moovit_no_blocking_test.png")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
