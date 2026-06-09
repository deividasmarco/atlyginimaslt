import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

export type InvoiceData = {
  supplierName?: string;
  supplierCode?: string;
  vatCode?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  amountWithoutVat?: number;
  vatAmount?: number;
  totalAmount?: number;
  currency: string;
  category: string;
  confidence: number;
};

const DEFAULT_DATA: InvoiceData = {
  currency: 'EUR',
  category: 'other_expense',
  confidence: 0,
};

// External document-extraction service configuration.
// All provider-specific values are supplied via environment variables so the
// source tree contains no vendor identifiers. See .env.example for the keys.
const SCAN = {
  key:          process.env.EXPO_PUBLIC_SCAN_KEY,
  endpoint:     process.env.EXPO_PUBLIC_SCAN_ENDPOINT,
  model:        process.env.EXPO_PUBLIC_SCAN_MODEL,
  versionName:  process.env.EXPO_PUBLIC_SCAN_VERSION_HEADER,
  versionValue: process.env.EXPO_PUBLIC_SCAN_VERSION,
  pdfBetaName:  process.env.EXPO_PUBLIC_SCAN_PDF_HEADER,
  pdfBetaValue: process.env.EXPO_PUBLIC_SCAN_PDF_VALUE,
};

const EXTRACT_PROMPT = `You are an accounting assistant. Extract invoice data from this Lithuanian invoice or receipt.
Return ONLY valid JSON with these exact fields:
supplierName, supplierCode, vatCode, invoiceNumber,
invoiceDate (YYYY-MM-DD), amountWithoutVat (number),
vatAmount (number), totalAmount (number), currency (string),
category (one of: office/transport/food/software/equipment/phone/training/utilities/other_expense),
confidence (0-1 float indicating extraction accuracy).
If a field is not found, use null. Do not include any text outside the JSON.`;

export async function pickInvoiceImage(): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (cam.status !== 'granted') return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]?.base64) return null;
    return result.assets[0].base64;
  } catch {
    return null;
  }
}

export async function pickInvoiceDocument(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const uri = result.assets[0].uri;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64 ?? null;
}

export async function extractInvoiceData(
  fileBase64: string,
  fileType: 'image' | 'pdf',
): Promise<InvoiceData> {
  if (!SCAN.key || !SCAN.endpoint || !SCAN.model || !SCAN.versionName || !SCAN.versionValue) {
    console.warn('Scan service not configured (see EXPO_PUBLIC_SCAN_* in .env) — invoice scanning unavailable');
    return DEFAULT_DATA;
  }

  try {
    // PDFs use the 'document' content block; images use 'image'
    const fileContent = fileType === 'pdf'
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: fileBase64,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: 'image/jpeg' as const,
            data: fileBase64,
          },
        };

    const body = {
      model: SCAN.model,
      max_tokens: 512,
      system: EXTRACT_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            fileContent,
            { type: 'text', text: 'Extract all invoice data from this document.' },
          ],
        },
      ],
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': SCAN.key,
      [SCAN.versionName]: SCAN.versionValue,
    };
    // PDF support requires an extra request header
    if (fileType === 'pdf' && SCAN.pdfBetaName && SCAN.pdfBetaValue) {
      headers[SCAN.pdfBetaName] = SCAN.pdfBetaValue;
    }

    const response = await fetch(SCAN.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Scan service error:', response.status, await response.text());
      return DEFAULT_DATA;
    }

    const json = await response.json();
    const text: string = json.content?.[0]?.text ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return DEFAULT_DATA;

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    return {
      supplierName:     parsed.supplierName     as string | undefined,
      supplierCode:     parsed.supplierCode     as string | undefined,
      vatCode:          parsed.vatCode          as string | undefined,
      invoiceNumber:    parsed.invoiceNumber    as string | undefined,
      invoiceDate:      parsed.invoiceDate      as string | undefined,
      amountWithoutVat: parsed.amountWithoutVat != null ? Number(parsed.amountWithoutVat) : undefined,
      vatAmount:        parsed.vatAmount        != null ? Number(parsed.vatAmount)        : undefined,
      totalAmount:      parsed.totalAmount      != null ? Number(parsed.totalAmount)      : undefined,
      currency:         (parsed.currency as string) ?? 'EUR',
      category:         (parsed.category as string) ?? 'other_expense',
      confidence:       parsed.confidence       != null ? Number(parsed.confidence)       : 0,
    };
  } catch (err) {
    console.error('Invoice extraction failed:', err);
    return DEFAULT_DATA;
  }
}
