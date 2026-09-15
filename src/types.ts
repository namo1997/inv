export interface ShopSettings {
  restaurantName: string;
  taxId: string;
  address: string;
  phone: string;
  isHeadOffice: boolean;
  branchNumber: string; // "00000" for head office or "00001" etc.
  branchName: string;
  logo: string | null; // base64 data url
  vatRate: number; // default 7
  defaultPriceIncludesVat: boolean;
  defaultIssuerName: string;
  pin: string; // for simple login
  updatedAt: string;
}

export interface Customer {
  id: string;
  taxId: string;
  name: string;
  address: string;
  isHeadOffice: boolean;
  branchNumber: string;
  branchName: string;
  phone?: string;
  source?: 'rd_service' | 'manual';
  lastUsedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export type InvoiceStatus = 'draft' | 'issued';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  refBillNumber?: string;
  status: InvoiceStatus;
  priceIncludesVat: boolean;
  vatRate: number;
  
  // Snapshots at time of issuing to preserve historical tax accuracy
  shopSnapshot: {
    restaurantName: string;
    taxId: string;
    address: string;
    phone: string;
    isHeadOffice: boolean;
    branchNumber: string;
    branchName: string;
    logo: string | null;
  };

  customerSnapshot: {
    taxId: string;
    name: string;
    address: string;
    isHeadOffice: boolean;
    branchNumber: string;
    branchName: string;
    phone?: string;
  };

  items: InvoiceItem[];
  
  subtotal: number;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  discountAmount: number;
  totalAfterDiscount: number;
  amountBeforeVat: number;
  vatAmount: number;
  totalAmount: number;
  thaiBahtText: string;
  
  notes?: string;
  issuerName: string;
  
  createdAt: string;
  updatedAt: string;
  issuedAt?: string;
}

export interface RDBranchOption {
  branchNumber: string;
  isHeadOffice: boolean;
  branchName: string;
  address: string;
}

export interface RDLookupResult {
  success: boolean;
  found: boolean;
  name: string;
  taxId: string;
  isHeadOffice: boolean;
  branchNumber: string;
  branchName: string;
  address: string;
  allBranches: RDBranchOption[];
  message?: string;
  rawError?: string;
}
