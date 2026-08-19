import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        # Launch browser headlessly
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Moovit lines URL
        url = "https://moovitapp.com/tripplan/mumbai-3732/lines/en?customerId=4908&ref=4&query=BEST%20(Brihanmumbai%20Electricity%20Supply%20%26%20Transport)&af_sub8=%2Findex%2Fen%2Fpublic_transit-lines-Mumbai-3732-857915&af_sub9=agency_show_all_lines"
        print(f"Navigating to {url}...")
        
        await page.goto(url, wait_until="networkidle")
        print("Page loaded.")
        
        # Wait for the results-wrapper to be visible
        try:
            await page.wait_for_selector(".results-wrapper", timeout=10000)
            print("Found results-wrapper.")
        except Exception as e:
            print("results-wrapper not found:", e)
            # Print page title and some body text to see what is there
            title = await page.title()
            print("Page Title:", title)
            body_text = await page.inner_text("body")
            print("Body snippet:", body_text[:500])
            await browser.close()
            return
        
        # Let's inspect the line items
        line_items = await page.query_selector_all(".line-row")
        print(f"Found {len(line_items)} line-row elements.")
        
        for i, item in enumerate(line_items[:10]):
            html = await item.inner_html()
            text = await item.inner_text()
            print(f"\n--- Line Row {i} ---")
            print("Text:", text.replace('\n', ' | '))
            # Check for any links inside or on the element
            tag_name = await item.evaluate("el => el.tagName")
            href = await item.get_attribute("href")
            print(f"Tag: {tag_name}, href: {href}")
            
            # Check inside elements
            links = await item.query_selector_all("a")
            for link in links:
                l_href = await link.get_attribute("href")
                l_text = await link.inner_text()
                print(f"  Inner Link text: {l_text}, href: {l_href}")
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
