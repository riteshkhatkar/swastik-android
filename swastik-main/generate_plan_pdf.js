const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
  console.log('🚀 Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  const htmlPath = path.resolve(__dirname, 'plan', 'swastik_android_plan.html');
  const pdfPath = path.resolve(__dirname, 'plan', 'Swastik_Hospital_Android_Migration_Plan.pdf');

  console.log('📄 Loading HTML file...');
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
    waitUntil: 'networkidle0',
    timeout: 60000
  });

  // Wait for fonts to load
  await new Promise(r => setTimeout(r, 2000));

  console.log('🖨️  Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0',
      right: '0',
      bottom: '0',
      left: '0'
    },
    displayHeaderFooter: false,
    preferCSSPageSize: true,
  });

  await browser.close();

  const stats = fs.statSync(pdfPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('');
  console.log('✅ PDF Generated Successfully!');
  console.log('📁 Location: ' + pdfPath);
  console.log('📊 File Size: ' + fileSizeMB + ' MB');
  console.log('');
  console.log('🎉 Done! Open the PDF from the plan/ folder.');
}

generatePDF().catch(err => {
  console.error('❌ Error generating PDF:', err.message);
  process.exit(1);
});
