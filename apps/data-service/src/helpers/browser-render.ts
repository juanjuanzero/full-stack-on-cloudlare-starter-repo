import pupetteer from '@cloudflare/puppeteer';

export async function collectDestinationInfo(env: Env, destinationUrl: string) {
    const browser = await pupetteer.launch(env.VIRTUAL_BROWSER);
    const page = await browser.newPage();
    const response = await page.goto(destinationUrl);
    await page.waitForNetworkIdle();

    const bodyText = (await page.$eval('body', el => el.innerText)) || '';
    const html = await page.content();
    const status = response?.status() || 0;

    await browser.close();

    return {
        bodyText,
        html,
        status,
    }; 
}