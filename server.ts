import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Customer, Invoice, RDLookupResult, ShopSettings } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ----------------------------------------------------
// Persistent Database Storage Management
// ----------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_FILE = path.join(DATA_DIR, 'db.backup.json');

interface DatabaseSchema {
  settings: ShopSettings;
  customers: Customer[];
  invoices: Invoice[];
}

const DEFAULT_SETTINGS: ShopSettings = {
  restaurantName: 'บริษัท โซลาว จำกัด',
  taxId: '0505559001193',
  address: 'เลขที่ 122/19 หมู่ที่ 6 ตำบลสุเทพ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50200',
  phone: '053-811-288',
  isHeadOffice: true,
  branchNumber: '00000',
  branchName: 'สำนักงานใหญ่',
  logo: null,
  vatRate: 7,
  defaultPriceIncludesVat: true,
  defaultIssuerName: 'เจ้าหน้าที่ออกใบกำกับภาษี',
  pin: process.env.APP_LOGIN_PIN || '197019',
  updatedAt: new Date().toISOString(),
};

function initDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      };
    } catch (e) {
      console.error('Error reading db.json, falling back to backup or default:', e);
      if (fs.existsSync(BACKUP_FILE)) {
        try {
          const bData = fs.readFileSync(BACKUP_FILE, 'utf-8');
          const bParsed = JSON.parse(bData);
          return {
            settings: { ...DEFAULT_SETTINGS, ...(bParsed.settings || {}) },
            customers: Array.isArray(bParsed.customers) ? bParsed.customers : [],
            invoices: Array.isArray(bParsed.invoices) ? bParsed.invoices : [],
          };
        } catch {
          // fallback
        }
      }
    }
  }

  const initialDb: DatabaseSchema = {
    settings: DEFAULT_SETTINGS,
    customers: [
      {
        id: 'cust-sample-1',
        taxId: '0107544000108',
        name: 'บริษัท ปตท. จำกัด (มหาชน)',
        address: 'เลขที่ 555 ถนนวิภาวดีรังสิต แขวงจตุจักร เขตจตุจักร กรุงเทพมหานคร 10900',
        isHeadOffice: true,
        branchNumber: '00000',
        branchName: 'สำนักงานใหญ่',
        phone: '02-537-2000',
        source: 'rd_service',
        lastUsedAt: new Date().toISOString(),
      },
    ],
    invoices: [],
  };

  saveDb(initialDb);
  return initialDb;
}

let db: DatabaseSchema = initDb();

function saveDb(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const jsonString = JSON.stringify(data, null, 2);
    // Write atomically
    const tempFile = path.join(DATA_DIR, `db.tmp.${Date.now()}.json`);
    fs.writeFileSync(tempFile, jsonString, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);

    // Maintain auto backup
    fs.writeFileSync(BACKUP_FILE, jsonString, 'utf-8');
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

// ----------------------------------------------------
// Authentication Handlers (Simple PIN login)
// ----------------------------------------------------
const activeSessions = new Set<string>();

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { pin } = req.body;
  const currentPin = db.settings.pin || '1234';

  if (!pin || String(pin).trim() !== String(currentPin).trim()) {
    res.status(401).json({ success: false, message: 'รหัส PIN ไม่ถูกต้อง' });
    return;
  }

  const token = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  activeSessions.add(token);
  res.json({ success: true, token, message: 'เข้าสู่ระบบสำเร็จ' });
});

app.get('/api/auth/status', (req: Request, res: Response) => {
  const token = req.headers['x-auth-token'] as string;
  const isAuthenticated = Boolean(token && activeSessions.has(token));
  res.json({ authenticated: isAuthenticated });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = req.headers['x-auth-token'] as string;
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

app.post('/api/auth/change-pin', (req: Request, res: Response) => {
  const { currentPin, newPin } = req.body;
  const existingPin = db.settings.pin || '1234';

  if (String(currentPin).trim() !== String(existingPin).trim()) {
    res.status(400).json({ success: false, message: 'รหัส PIN ปัจจุบันไม่ถูกต้อง' });
    return;
  }

  if (!newPin || String(newPin).trim().length < 4) {
    res.status(400).json({ success: false, message: 'รหัส PIN ใหม่ต้องมีอย่างน้อย 4 หลัก' });
    return;
  }

  db.settings.pin = String(newPin).trim();
  db.settings.updatedAt = new Date().toISOString();
  saveDb(db);

  res.json({ success: true, message: 'เปลี่ยนรหัส PIN สำเร็จเรียบร้อย' });
});

// ----------------------------------------------------
// Official Revenue Department (RD) VAT Service Integration
// Endpoint: https://rdws.rd.go.th/jsonRD/vatserviceRD3.asmx
// Based on: https://www.rd.go.th/42535.html
// ----------------------------------------------------
const RD_SERVICE_ENDPOINT = 'https://rdws.rd.go.th/jsonRD/vatserviceRD3.asmx';
const RD_USERNAME = process.env.RD_VAT_USERNAME || 'anonymous';
const RD_PASSWORD = process.env.RD_VAT_PASSWORD || 'anonymous';

app.get('/api/vat-service/health', async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const testEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Service xmlns="https://rdws.rd.go.th/JserviceRD3/vatserviceRD3">
      <username>${RD_USERNAME}</username>
      <password>${RD_PASSWORD}</password>
      <TIN>0107544000108</TIN>
      <Name></Name>
      <ProvinceCode>0</ProvinceCode>
      <BranchNumber>0</BranchNumber>
      <AmphurCode>0</AmphurCode>
    </Service>
  </soap:Body>
</soap:Envelope>`;

    const resp = await fetch(RD_SERVICE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'https://rdws.rd.go.th/JserviceRD3/vatserviceRD3/Service',
      },
      body: testEnvelope,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;
    if (resp.ok) {
      res.json({
        status: 'online',
        connected: true,
        endpoint: RD_SERVICE_ENDPOINT,
        latencyMs: latency,
        message: 'เชื่อมต่อระบบ VAT Web Service ของกรมสรรพากร (rd.go.th) เรียบร้อยแล้ว',
      });
    } else {
      res.json({
        status: 'warning',
        connected: false,
        endpoint: RD_SERVICE_ENDPOINT,
        latencyMs: latency,
        message: `ระบบกรมสรรพากรตอบกลับด้วยสถานะ HTTP ${resp.status}`,
      });
    }
  } catch (err: any) {
    res.json({
      status: 'offline',
      connected: false,
      endpoint: RD_SERVICE_ENDPOINT,
      message: 'ยังไม่เชื่อมต่อ หรือระบบสรรพากรขัดข้องชั่วคราว (สามารถกรอกข้อมูลเองได้)',
      error: err?.message || 'Connection timed out',
    });
  }
});

function formatThaiAddress(data: any, index: number = 0): string {
  function clean(val: any): string {
    if (!val || val === '-' || val === 'null' || val === 'undefined') return '';
    return String(val).trim();
  }

  const parts: string[] = [];

  const building = clean(data.BuildingName?.[index]);
  if (building) parts.push(building);

  const floor = clean(data.FloorNumber?.[index]);
  if (floor) parts.push(`ชั้น ${floor}`);

  const room = clean(data.RoomNumber?.[index]);
  if (room) parts.push(`ห้อง ${room}`);

  const village = clean(data.VillageName?.[index]);
  if (village) parts.push(`หมู่บ้าน${village}`);

  const houseNo = clean(data.HouseNumber?.[index]);
  if (houseNo) parts.push(`เลขที่ ${houseNo}`);

  const moo = clean(data.MooNumber?.[index]);
  if (moo) parts.push(`หมู่ที่ ${moo}`);

  const soi = clean(data.SoiName?.[index]);
  if (soi) parts.push(`ซอย${soi}`);

  const street = clean(data.StreetName?.[index]);
  if (street) parts.push(`ถนน${street}`);

  const province = clean(data.Province?.[index]);
  const isBangkok = province.includes('กรุงเทพ');

  const thambol = clean(data.Thambol?.[index]);
  if (thambol) {
    const prefix = isBangkok ? 'แขวง' : 'ตำบล';
    parts.push(thambol.startsWith(prefix) ? thambol : `${prefix}${thambol}`);
  }

  const amphur = clean(data.Amphur?.[index]);
  if (amphur) {
    const prefix = isBangkok ? 'เขต' : 'อำเภอ';
    parts.push(amphur.startsWith(prefix) ? amphur : `${prefix}${amphur}`);
  }

  if (province) {
    parts.push(province.startsWith('จังหวัด') || isBangkok ? province : `จังหวัด${province}`);
  }

  const postCode = clean(data.PostCode?.[index]);
  if (postCode) parts.push(postCode);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

app.post('/api/vat-service/lookup', async (req: Request, res: Response) => {
  const { taxId } = req.body;
  const cleanedTIN = String(taxId || '').replace(/[^0-9]/g, '');

  if (cleanedTIN.length !== 13) {
    res.status(400).json({
      success: false,
      found: false,
      message: 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก',
    });
    return;
  }

  try {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Service xmlns="https://rdws.rd.go.th/JserviceRD3/vatserviceRD3">
      <username>${RD_USERNAME}</username>
      <password>${RD_PASSWORD}</password>
      <TIN>${cleanedTIN}</TIN>
      <Name></Name>
      <ProvinceCode>0</ProvinceCode>
      <BranchNumber>0</BranchNumber>
      <AmphurCode>0</AmphurCode>
    </Service>
  </soap:Body>
</soap:Envelope>`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const rdResponse = await fetch(RD_SERVICE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'https://rdws.rd.go.th/JserviceRD3/vatserviceRD3/Service',
      },
      body: soapEnvelope,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!rdResponse.ok) {
      res.json({
        success: false,
        found: false,
        message: `ระบบ VAT Service ของกรมสรรพากรขัดข้อง (HTTP ${rdResponse.status}) ท่านสามารถกรอกข้อมูลลูกค้าด้วยตนเอง`,
      });
      return;
    }

    const xmlText = await rdResponse.text();
    const match = xmlText.match(/<ServiceResult[^>]*>(.*?)<\/ServiceResult>/s);

    if (!match) {
      res.json({
        success: false,
        found: false,
        message: 'ไม่พบโครงสร้างผลลัพธ์จากระบบกรมสรรพากร กรุณากรอกข้อมูลเอง',
      });
      return;
    }

    const unescaped = match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

    const resultData = JSON.parse(unescaped);

    // ตรวจสอบ msgerr
    if (resultData.msgerr && resultData.msgerr.length > 0 && resultData.msgerr[0]) {
      const errTxt = resultData.msgerr[0].replace(/<[^>]*>/g, ' ').trim();
      res.json({
        success: true,
        found: false,
        message: errTxt.includes('ไม่พบ')
          ? 'ไม่พบข้อมูลในระบบภาษีมูลค่าเพิ่มของกรมสรรพากร (ผู้เสียภาษีอาจยังไม่ได้จดทะเบียน VAT หรือกรอกเลขผิด)'
          : `ผลการค้นหาจากกรมสรรพากร: ${errTxt}`,
      });
      return;
    }

    // ตรวจสอบว่ามีข้อมูล NID / Name หรือไม่
    const rawNames = resultData.Name || [];
    if (!rawNames || rawNames.length === 0 || !rawNames[0]) {
      res.json({
        success: true,
        found: false,
        message: 'ไม่พบข้อมูลผู้ประกอบการจดทะเบียน VAT สำหรับเลขผู้เสียภาษีนี้',
      });
      return;
    }

    // สกัดข้อมูลสาขาทั้งหมด
    const branchesCount = Math.max(
      rawNames.length,
      (resultData.BranchNumber || []).length,
      1
    );

    const allBranches = [];
    for (let i = 0; i < branchesCount; i++) {
      const bNumRaw = resultData.BranchNumber?.[i];
      const bNumInt = typeof bNumRaw === 'number' ? bNumRaw : parseInt(bNumRaw || '0', 10);
      const isHO = bNumInt === 0;
      const bCode = isHO ? '00000' : String(bNumInt).padStart(5, '0');
      const bTitle = resultData.BranchTitleName?.[i] || '';
      const bName = resultData.BranchName?.[i] || '';
      const fullBranchTitle = isHO
        ? 'สำนักงานใหญ่'
        : bName
        ? `${bName} (สาขาที่ ${bNumInt})`
        : `สาขาที่ ${bNumInt}`;

      const addr = formatThaiAddress(resultData, i);

      allBranches.push({
        branchNumber: bCode,
        isHeadOffice: isHO,
        branchName: fullBranchTitle,
        address: addr,
      });
    }

    // รวบรวมชื่อกิจการ
    const title = resultData.TitleName?.[0] || '';
    const mainName = resultData.Name?.[0] || '';
    const surname = resultData.Surname?.[0] || '';
    let fullCompanyName = mainName;
    if (title && !mainName.startsWith(title)) {
      fullCompanyName = `${title} ${mainName}`;
    }
    if (surname && surname !== '-') {
      fullCompanyName = `${fullCompanyName} ${surname}`;
    }

    const defaultBranch = allBranches[0];

    const finalResult: RDLookupResult = {
      success: true,
      found: true,
      name: fullCompanyName.trim(),
      taxId: cleanedTIN,
      isHeadOffice: defaultBranch.isHeadOffice,
      branchNumber: defaultBranch.branchNumber,
      branchName: defaultBranch.branchName,
      address: defaultBranch.address,
      allBranches,
      message: 'ค้นพบข้อมูลผู้ประกอบการจดทะเบียน VAT ในฐานข้อมูลกรมสรรพากร',
    };

    res.json(finalResult);
  } catch (err: any) {
    console.error('RD VAT Service lookup error:', err);
    res.json({
      success: false,
      found: false,
      message: 'ระบบเชื่อมต่อ VAT Service ของกรมสรรพากรขัดข้องชั่วคราว สามารถกรอกข้อมูลลูกค้าด้วยตนเองได้',
      rawError: err?.message,
    });
  }
});

// ----------------------------------------------------
// Shop Settings Endpoints
// ----------------------------------------------------
app.get('/api/settings', (_req: Request, res: Response) => {
  // Return shop settings (hide sensitive internal PIN from plain view)
  const { pin, ...safeSettings } = db.settings;
  res.json({ ...safeSettings, hasPin: Boolean(pin) });
});

app.put('/api/settings', (req: Request, res: Response) => {
  const updates = req.body;
  // Protect PIN from arbitrary overwrites here (handled via change-pin)
  delete updates.pin;

  db.settings = {
    ...db.settings,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveDb(db);
  res.json({ success: true, settings: db.settings });
});

// ----------------------------------------------------
// Customer Management Endpoints
// ----------------------------------------------------
app.get('/api/customers', (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  let list = db.customers;

  if (query) {
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.taxId.includes(query) ||
        c.address.toLowerCase().includes(query)
    );
  }

  // Sort by recent usage
  list = [...list].sort(
    (a, b) => new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime()
  );

  res.json(list);
});

app.post('/api/customers', (req: Request, res: Response) => {
  const { taxId, name, address, isHeadOffice, branchNumber, branchName, phone, source } = req.body;

  if (!taxId || !name) {
    res.status(400).json({ success: false, message: 'กรุณากรอกเลขผู้เสียภาษีและชื่อกิจการ' });
    return;
  }

  const cleanedTIN = String(taxId).replace(/[^0-9]/g, '');
  const existingIdx = db.customers.findIndex(
    (c) => c.taxId === cleanedTIN && c.branchNumber === (branchNumber || '00000')
  );

  const customerObj: Customer = {
    id: existingIdx >= 0 ? db.customers[existingIdx].id : `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    taxId: cleanedTIN,
    name: name.trim(),
    address: (address || '').trim(),
    isHeadOffice: Boolean(isHeadOffice),
    branchNumber: branchNumber || '00000',
    branchName: branchName || (isHeadOffice ? 'สำนักงานใหญ่' : 'สาขา'),
    phone: phone || '',
    source: source || 'manual',
    lastUsedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    db.customers[existingIdx] = customerObj;
  } else {
    db.customers.unshift(customerObj);
  }

  saveDb(db);
  res.json({ success: true, customer: customerObj });
});

// ----------------------------------------------------
// Invoices Endpoints
// ----------------------------------------------------
app.get('/api/invoices/next-number', (_req: Request, res: Response) => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const datePrefix = `${yyyy}${mm}${dd}`;

  // Find all invoices for today
  const prefix = `INV-${datePrefix}-`;
  const todayInvoices = db.invoices.filter((inv) => inv.invoiceNumber.startsWith(prefix));

  let maxSeq = 0;
  for (const inv of todayInvoices) {
    const seqStr = inv.invoiceNumber.replace(prefix, '');
    const seq = parseInt(seqStr, 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  const nextInvoiceNumber = `${prefix}${nextSeq}`;

  res.json({ nextInvoiceNumber });
});

app.get('/api/invoices', (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  const status = String(req.query.status || '').trim();
  const fromDate = String(req.query.from || '').trim();
  const toDate = String(req.query.to || '').trim();

  let list = db.invoices;

  if (status && status !== 'all') {
    list = list.filter((inv) => inv.status === status);
  }

  if (fromDate) {
    list = list.filter((inv) => inv.date >= fromDate);
  }

  if (toDate) {
    list = list.filter((inv) => inv.date <= toDate);
  }

  if (query) {
    list = list.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(query) ||
        (inv.customerSnapshot?.name || '').toLowerCase().includes(query) ||
        (inv.customerSnapshot?.taxId || '').includes(query) ||
        (inv.refBillNumber || '').toLowerCase().includes(query)
    );
  }

  // Sort by date desc, then createdAt desc
  list = [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json(list);
});

app.get('/api/invoices/:id', (req: Request, res: Response) => {
  const inv = db.invoices.find((i) => i.id === req.params.id);
  if (!inv) {
    res.status(404).json({ success: false, message: 'ไม่พบเอกสารใบกำกับภาษี' });
    return;
  }
  res.json(inv);
});

app.post('/api/invoices', (req: Request, res: Response) => {
  const invoiceData: Invoice = req.body;

  if (!invoiceData.invoiceNumber || !invoiceData.date) {
    res.status(400).json({ success: false, message: 'ข้อมูลเลขที่เอกสารหรือวันที่ไม่ครบถ้วน' });
    return;
  }

  // Check unique invoiceNumber
  const duplicate = db.invoices.find((i) => i.invoiceNumber === invoiceData.invoiceNumber);
  if (duplicate) {
    res.status(409).json({
      success: false,
      message: `เลขที่เอกสาร ${invoiceData.invoiceNumber} มีอยู่ในระบบแล้ว ห้ามออกเลขซ้ำ`,
    });
    return;
  }

  const newId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const finalInvoice: Invoice = {
    ...invoiceData,
    id: newId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    issuedAt: invoiceData.status === 'issued' ? new Date().toISOString() : undefined,
  };

  db.invoices.unshift(finalInvoice);

  // Auto-save/update customer in history if present
  if (finalInvoice.customerSnapshot?.taxId && finalInvoice.customerSnapshot?.name) {
    const custTIN = finalInvoice.customerSnapshot.taxId.replace(/[^0-9]/g, '');
    const cIdx = db.customers.findIndex(
      (c) =>
        c.taxId === custTIN &&
        c.branchNumber === (finalInvoice.customerSnapshot.branchNumber || '00000')
    );
    const updatedCust: Customer = {
      id: cIdx >= 0 ? db.customers[cIdx].id : `cust_${Date.now()}`,
      taxId: custTIN,
      name: finalInvoice.customerSnapshot.name,
      address: finalInvoice.customerSnapshot.address || '',
      isHeadOffice: finalInvoice.customerSnapshot.isHeadOffice,
      branchNumber: finalInvoice.customerSnapshot.branchNumber || '00000',
      branchName: finalInvoice.customerSnapshot.branchName || '',
      phone: finalInvoice.customerSnapshot.phone || '',
      lastUsedAt: new Date().toISOString(),
    };
    if (cIdx >= 0) {
      db.customers[cIdx] = updatedCust;
    } else {
      db.customers.unshift(updatedCust);
    }
  }

  saveDb(db);
  res.status(201).json({ success: true, invoice: finalInvoice });
});

app.put('/api/invoices/:id', (req: Request, res: Response) => {
  const existingIdx = db.invoices.findIndex((i) => i.id === req.params.id);
  if (existingIdx === -1) {
    res.status(404).json({ success: false, message: 'ไม่พบเอกสารใบกำกับภาษี' });
    return;
  }

  const existingInvoice = db.invoices[existingIdx];

  // Enforcement of Thai Revenue Department Tax Rule:
  // Issued invoices CANNOT be edited or directly deleted!
  if (existingInvoice.status === 'issued') {
    res.status(403).json({
      success: false,
      message: 'ไม่อนุญาตให้แก้ไขเอกสารที่ออกแล้ว (Issued) ตามกฎหมายสรรพากร',
    });
    return;
  }

  const updateData = req.body;
  const updatedInvoice: Invoice = {
    ...existingInvoice,
    ...updateData,
    id: existingInvoice.id, // preserve id
    invoiceNumber: existingInvoice.invoiceNumber, // preserve invoiceNumber
    updatedAt: new Date().toISOString(),
    issuedAt: updateData.status === 'issued' ? new Date().toISOString() : existingInvoice.issuedAt,
  };

  db.invoices[existingIdx] = updatedInvoice;
  saveDb(db);

  res.json({ success: true, invoice: updatedInvoice });
});

// ----------------------------------------------------
// Backup & Restore Endpoints
// ----------------------------------------------------
app.get('/api/backup/export', (_req: Request, res: Response) => {
  const exportPayload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    restaurant: db.settings.restaurantName,
    taxId: db.settings.taxId,
    data: {
      settings: db.settings,
      customers: db.customers,
      invoices: db.invoices,
    },
  };

  const filename = `tax-invoice-backup-${new Date().toISOString().split('T')[0]}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

app.post('/api/backup/restore', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || !payload.data) {
      res.status(400).json({ success: false, message: 'รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง' });
      return;
    }

    const { settings, customers, invoices } = payload.data;

    // Save pre-restore backup
    const preRestoreFile = path.join(DATA_DIR, `db.pre-restore.${Date.now()}.json`);
    fs.writeFileSync(preRestoreFile, JSON.stringify(db, null, 2), 'utf-8');

    db = {
      settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
      customers: Array.isArray(customers) ? customers : [],
      invoices: Array.isArray(invoices) ? invoices : [],
    };

    saveDb(db);

    res.json({
      success: true,
      message: `กู้คืนข้อมูลสำเร็จ (เอกสาร ${db.invoices.length} ฉบับ, ลูกค้า ${db.customers.length} ราย)`,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล: ' + (err?.message || 'Invalid format'),
    });
  }
});

// ----------------------------------------------------
// Vite Middleware / Static Server
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
