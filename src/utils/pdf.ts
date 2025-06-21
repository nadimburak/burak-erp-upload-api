import * as path from 'path';
import * as ejs from 'ejs';
import * as puppeteer from 'puppeteer';

export const ExportPdf = async (data: any, templateFile: any, filePath: any) => {
    const browser = await puppeteer.launch({
        headless: true,
    });

    const headerFile = path.resolve(__dirname, "../views/header.ejs");
    const headerTemplate: string = await ejs.renderFile(headerFile, data);
    const footerFile = path.resolve(__dirname, "../views/footer.ejs");
    const footerTemplate: string = await ejs.renderFile(footerFile, data);

    const html: string = await ejs.renderFile(templateFile, data);

    const page = await browser.newPage();
    await page.setContent(html);

    await page.pdf({
        path: filePath,
        format: "A4",
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: {
            top: "150px",
            bottom: "150px",
            left: "16px",
            right: "16px",
        },
    });

    await browser.close();
}