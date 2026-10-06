const {test,expect}=require('@playwright/test');
const fs=require('fs');
async function start(page){await page.goto('/dist/SalesOrderPreview.html');await expect(page.locator('#connectionStatus')).toHaveText('Preview · sample data');}
async function customer(page){await page.locator('#customerSearch').fill('Malabar');await page.getByRole('option').filter({hasText:'Malabar Trading Company'}).click();await expect(page.locator('#billingAddress')).toContainText('Kochi');await expect(page.locator('#itemSearch')).toBeFocused();}
async function item(page,term){await page.locator('#itemSearch').fill(term);await page.getByRole('option').filter({hasText:term}).first().click();}
async function scanItem(page,code){await page.locator('#itemSearch').fill(code);await page.locator('#itemSearch').press('Tab');await expect(page.locator('#itemSearch')).toHaveValue('');}
async function required(page){await page.locator('#cf_billType').selectOption('Credit');await page.locator('#cf_transport').selectOption('Own delivery');await page.locator('#salesperson').selectOption('s1');}
test('search, address fill, quantities, discount, review and remove',async({page})=>{const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);await customer(page);await scanItem(page,'PAP-A4-75');await expect(page.locator('#lineCount')).toHaveText('1');await page.getByRole('spinbutton',{name:'Quantity for Premium A4 Copier Paper'}).fill('10');await page.locator('#discount').fill('10');await expect(page.locator('#grandTotal')).toHaveText('₹28,728.00');await expect(page.locator('#shippingAddress')).toHaveValue('');await page.locator('#sameAsBilling').check();await expect(page.locator('#shippingAddress')).toHaveValue(/24, Market Road/);await expect(page.locator('#shippingGst')).toHaveValue('32ABCDE1234F1Z5');await required(page);await page.locator('#saveButton').click();await expect(page.locator('#reviewDialog')).toBeVisible();await expect(page.locator('#confirmSave')).toBeDisabled();await page.getByRole('button',{name:'Back to editing'}).click();await page.getByRole('button',{name:'Remove Premium A4 Copier Paper'}).click();await expect(page.locator('#emptyItems')).toBeVisible();expect(errors).toEqual([]);});
test('customer switch preserves lines and refreshes customer details',async({page})=>{await start(page);await customer(page);await item(page,'Premium');await item(page,'Spiral');await expect(page.locator('#lineCount')).toHaveText('2');await page.locator('#customerSearch').fill('Sree');await expect(page.locator('#lineCount')).toHaveText('2');await expect(page.locator('#gstNumber')).toHaveValue('');await page.getByRole('option').filter({hasText:'Sree Krishna'}).click();await expect(page.locator('#billingAddress')).toContainText('Thrissur');});
test('standalone file works without HTTP server and mobile does not overflow',async({page})=>{await page.goto('file://'+process.cwd()+'/dist/SalesOrderPreview.html');await expect(page.locator('#connectionStatus')).toHaveText('Preview · sample data');await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'dist/MobilePreview.png',fullPage:true});});
test('capture filled desktop preview',async({page})=>{await start(page);await customer(page);await item(page,'Premium');await item(page,'Spiral');await expect(page.locator('#lineCount')).toHaveText('2');await required(page);await page.locator('#cf_agent').selectOption('Direct');await page.locator('#cf_vehicle').selectOption('KL 01 AB 2345');await page.locator('#discount').fill('5');await page.locator('#notice').evaluate(e=>e.hidden=true);await page.screenshot({path:'dist/SalesOrderPreview.png',fullPage:true});});
for (const interstate of [false,true]) test(`production SDK saves ${interstate ? 'IGST interstate' : 'GST intrastate'} order and redirects to the created record`,async({page})=>{
 await page.route('https://erp.zoho.in/app/**',r=>r.fulfill({contentType:'text/html',body:'<h1>Sales Order detail</h1>'}));
 const mock=fs.readFileSync('preview/mock-sdk.js','utf8');
 await page.route('**/zf_sdk.js',r=>r.fulfill({contentType:'text/javascript',body:mock+`;window.testConfig=window.RAJADHANI_PREVIEW_CONFIG;delete window.RAJADHANI_PREVIEW_CONFIG;const originalRequest=window.ZFAPPS.request;window.sent=[];window.ZFAPPS.request=async o=>{if(o.method==='POST'){window.sent.push(o);return {data:{body:JSON.stringify({code:0,salesorder:{salesorder_id:'created1',salesorder_number:'SO-TEST',status:'draft',total:319.2}})}};}return originalRequest(o);};`}));
 await page.route('**/app/config.json',r=>{const c=JSON.parse(fs.readFileSync('app/config.json'));c.connectionLinkName='test';c.salesOrderQuantityMode='pieces';for(const [k,v]of Object.entries(c.customFields)){v.id='test-'+k;v.required=false;}c.requireSalesperson=false;r.fulfill({json:c});});
 await page.goto('/app/widget.html');await expect(page.locator('#connectionStatus')).toHaveText('ERP connected');await customer(page);await item(page,'Premium');if(interstate){await page.locator('#placeOfSupply').fill('TN');await expect(page.getByRole('textbox',{name:'Tax for Premium A4 Copier Paper'})).toHaveValue('IGST (12%)');await expect(page.locator('#taxBreakdown')).toContainText('IGST');}await page.locator('#saveButton').click();await page.locator('#confirmSave').click();await expect(page.locator('#notice')).toContainText('SO-TEST saved');await expect(page.locator('#saveButton')).toBeDisabled();const sent=await page.evaluate(()=>window.sent);expect(sent.length).toBe(1);expect(sent[0].connection_link_name).toBe('test');expect(sent[0].url).toBe('https://www.zohoapis.in/erp/v3/salesorders');expect(sent[0].method).toBe('POST');expect(JSON.parse(sent[0].body.raw).line_items[0]).not.toHaveProperty('salesorder_item_id');expect(JSON.parse(sent[0].body.raw).line_items[0].item_id).toBe('i1');expect(JSON.parse(sent[0].body.raw).line_items[0].tax_id).toBe(interstate?'it12':'t12');expect(JSON.parse(sent[0].body.raw).place_of_supply).toBe(interstate?'TN':'KL');await expect(page).toHaveURL('https://erp.zoho.in/app/preview-org#/salesorders/created1?filter_by=Status.All&per_page=25&sort_column=created_time&sort_order=D');
});

test('changing supply state updates existing items and newly added items, then restores local tax',async({page})=>{
 await start(page);await customer(page);await item(page,'Premium');
 await expect(page.getByRole('textbox',{name:'Tax for Premium A4 Copier Paper'})).toBeDisabled();
 await page.locator('#placeOfSupply').fill('TN');
 await expect(page.getByRole('textbox',{name:'Tax for Premium A4 Copier Paper'})).toHaveValue('IGST (12%)');
 await item(page,'Ballpoint');
 await expect(page.getByRole('textbox',{name:'Tax for Ballpoint Pen · Blue'})).toHaveValue('IGST (18%)');
 await expect(page.getByRole('textbox',{name:'Tax for Ballpoint Pen · Blue'})).toBeDisabled();
 await expect(page.locator('#taxBreakdown')).toContainText('IGST');
 await expect(page.locator('#taxBreakdown')).not.toContainText('CGST');
 await page.locator('#placeOfSupply').fill('KL');
 await expect(page.getByRole('textbox',{name:'Tax for Premium A4 Copier Paper'})).toHaveValue('GST (12%)');
 await expect(page.getByRole('textbox',{name:'Tax for Ballpoint Pen · Blue'})).toHaveValue('GST (18%)');
 await expect(page.locator('#taxBreakdown')).toContainText('CGST');
});

test('simplified equal-width fields and optional shipping GSTIN validation',async({page})=>{
 await start(page);await customer(page);
 for(const id of ['location','salesOrder','browseItems'])await expect(page.locator('#'+id)).toHaveCount(0);
 expect(await page.locator('.transactionfields .field input,.transactionfields .field select').evaluateAll(els=>els.map(e=>e.id))).toEqual(['gstNumber','placeOfSupply','salesperson']);
 const widths=await page.locator('.transactionfields .field').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().width));
 expect(Math.max(...widths)-Math.min(...widths)).toBeLessThan(1);
 await page.locator('#sameAsBilling').check();await expect(page.locator('#shippingGst')).toHaveValue('32ABCDE1234F1Z5');
 await page.locator('#shippingGst').fill('123');expect(await page.locator('#shippingGst').evaluate(e=>e.checkValidity())).toBe(false);
 await page.locator('#shippingGst').fill('32ABCDE1234F1Z5');expect(await page.locator('#shippingGst').evaluate(e=>e.checkValidity())).toBe(true);
 await page.locator('#shippingGst').fill('');expect(await page.locator('#shippingGst').evaluate(e=>e.checkValidity())).toBe(true);
});
