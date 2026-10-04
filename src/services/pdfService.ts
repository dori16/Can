import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { Mission, Profile, Vehicle } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatProfileName, getMissionCoordinatorLabel, formatVehicleLabel } from '@/lib/coordinator';

type EmbeddedAssets = {
  font: PDFFont;
  boldFont: PDFFont;
  logoImage: PDFImage | null;
  logoDims: { width: number; height: number } | null;
  signatureImage: PDFImage | null;
  signatureDims: { width: number; height: number } | null;
};

async function loadAssets(pdfDoc: PDFDocument): Promise<EmbeddedAssets> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let logoImage: PDFImage | null = null;
  let logoDims: { width: number; height: number } | null = null;
  try {
    const response = await fetch('/logo.png');
    const logoBytes = await response.arrayBuffer();
    logoImage = await pdfDoc.embedPng(logoBytes);
    logoDims = logoImage.scaleToFit(200, 70);
  } catch (error) {
    console.error('Error embedding logo:', error);
  }

  let signatureImage: PDFImage | null = null;
  let signatureDims: { width: number; height: number } | null = null;
  try {
    const signatureResponse = await fetch('/firma.jpg');
    const signatureBytes = await signatureResponse.arrayBuffer();
    signatureImage = await pdfDoc.embedJpg(signatureBytes);
    signatureDims = signatureImage.scaleToFit(100, 50);
  } catch (error) {
    console.error('Error embedding signature:', error);
  }

  return { font, boldFont, logoImage, logoDims, signatureImage, signatureDims };
}

function drawMissionPage(
  page: PDFPage,
  mission: Mission,
  crewNames: string,
  coordinatorName: string,
  vehicleLabel: string | undefined,
  assets: EmbeddedAssets
) {
  const { width, height } = page.getSize();
  const { font, boldFont, logoImage, logoDims, signatureImage, signatureDims } = assets;

  const drawText = (text: string, x: number, y: number, size = 10, fontType = font) => {
    const safe = text.replace(/\0/g, '');
    page.drawText(safe, { x, y, size, font: fontType, color: rgb(0.1, 0.1, 0.1) });
  };

  const headerHeight = logoDims ? 160 : 100;
  const titleText = 'CAN - Corpo Ambientale Nazionale Sez. di Martina Franca';
  const subtitleText = 'ORDINE DI SERVIZIO / RAPPORTO MISSIONE';
  const titleSize = 14;
  const subtitleSize = 12;

  const titleWidth = boldFont.widthOfTextAtSize(titleText, titleSize);
  const subtitleWidth = font.widthOfTextAtSize(subtitleText, subtitleSize);
  const headerPadding = 20;
  const logoHeight = logoDims ? logoDims.height : 0;

  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width,
    height: headerHeight,
    color: rgb(0.1, 0.3, 0.6),
  });

  if (logoImage && logoDims) {
    page.drawImage(logoImage, {
      x: (width - logoDims.width) / 2,
      y: height - headerPadding - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });
  }

  page.drawText(titleText, {
    x: (width - titleWidth) / 2,
    y: height - headerPadding - logoHeight - 20,
    size: titleSize,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(subtitleText, {
    x: (width - subtitleWidth) / 2,
    y: height - headerPadding - logoHeight - 40,
    size: subtitleSize,
    font: font,
    color: rgb(1, 1, 1),
  });

  let currentY = height - headerHeight - 40;
  drawText(`ORDINE DI SERVIZIO N. ${mission.orderNumber || mission.id.slice(0, 8)}`, 50, currentY, 12, boldFont);
  currentY -= 25;

  const missionDate = (() => {
    try {
      const d = parseISO(mission.date);
      return isValid(d) ? format(d, 'dd/MM/yyyy', { locale: it }) : mission.date;
    } catch {
      return mission.date;
    }
  })();

  drawText(`Data: ${missionDate}`, 50, currentY);
  currentY -= 20;

  drawText(`Ora Inizio: ${mission.startTime}`, 50, currentY);
  drawText(`Ora Fine: ${mission.endTime || 'N/A'}`, 300, currentY);
  currentY -= 20;

  drawText(`Coordinatore: ${coordinatorName}`, 50, currentY, 10, boldFont);
  currentY -= 20;

  drawText(`Equipaggio: ${crewNames}`, 50, currentY, 10, boldFont);
  currentY -= 30;

  page.drawRectangle({ x: 50, y: currentY - 5, width: width - 100, height: 20, color: rgb(0.9, 0.9, 0.9) });
  drawText('DATI VEICOLO', 55, currentY, 10, boldFont);
  currentY -= 30;

  drawText(`KM Inizio: ${mission.kmStart}`, 50, currentY);
  drawText(`KM Fine: ${mission.kmEnd || 'N/A'}`, 300, currentY);
  currentY -= 20;

  if (vehicleLabel) {
    drawText(`Veicolo: ${vehicleLabel}`, 50, currentY, 10, boldFont);
    currentY -= 20;
  }

  if (mission.kmEnd) {
    drawText(`Totale KM Percorsi: ${mission.kmEnd - mission.kmStart}`, 50, currentY, 10, boldFont);
  }
  currentY -= 30;

  page.drawRectangle({ x: 50, y: currentY - 5, width: width - 100, height: 20, color: rgb(0.9, 0.9, 0.9) });
  drawText('COMPITI ASSEGNATI', 55, currentY, 10, boldFont);
  currentY -= 30;

  const taskLines = (mission.assignedTasks || '').split('\n');
  taskLines.forEach(line => {
    if (currentY < 140) return;
    drawText(`• ${line}`, 60, currentY);
    currentY -= 15;
  });
  currentY -= 20;

  if (currentY > 160) {
    page.drawRectangle({ x: 50, y: currentY - 5, width: width - 100, height: 20, color: rgb(0.9, 0.9, 0.9) });
    drawText('RESOCONTO OPERATIVO', 55, currentY, 10, boldFont);
    currentY -= 30;

    if (mission.missionReport) {
      const reportLines = mission.missionReport.match(/.{1,100}/g) || [mission.missionReport];
      reportLines.forEach(line => {
        if (currentY < 140) return;
        drawText(line, 60, currentY);
        currentY -= 15;
      });
    } else {
      drawText('Nessun resoconto inserito.', 60, currentY);
    }
  }

  currentY = 100;

  if (signatureImage && signatureDims) {
    page.drawImage(signatureImage, {
      x: 75,
      y: currentY + 5,
      width: signatureDims.width,
      height: signatureDims.height,
    });
  }

  page.drawLine({
    start: { x: 50, y: currentY },
    end: { x: 200, y: currentY },
    thickness: 1,
  });
  drawText('Firma Coordinatore', 50, currentY - 15);

  drawText(crewNames, 350, currentY + 5, 8);
  page.drawLine({
    start: { x: 350, y: currentY },
    end: { x: 500, y: currentY },
    thickness: 1,
  });
  drawText('Firma Operatori', 350, currentY - 15);
}

function downloadBlob(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printBlob(bytes: Uint8Array) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error('Impossibile aprire la finestra di stampa. Controlla il blocco popup.');
  }

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } finally {
      // Keep URL alive long enough for the print dialog / viewer
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  // Some browsers need a short delay before print is available on the PDF viewer
  printWindow.addEventListener('load', () => {
    window.setTimeout(triggerPrint, 400);
  });
  window.setTimeout(triggerPrint, 800);
}

export async function generateMissionPDF(
  mission: Mission,
  crewNames: string = 'Nessun equipaggio assegnato',
  coordinatorName: string = 'N/A',
  vehicleLabel?: string
) {
  const pdfDoc = await PDFDocument.create();
  const assets = await loadAssets(pdfDoc);
  const page = pdfDoc.addPage([595, 842]);
  drawMissionPage(page, mission, crewNames, coordinatorName, vehicleLabel, assets);

  const pdfBytes = await pdfDoc.save();
  const safeOrderNumber = mission.orderNumber ? mission.orderNumber.replace(/\//g, '_') : mission.id.slice(0, 8);
  downloadBlob(pdfBytes, `OdS_${safeOrderNumber}.pdf`);
}

export function filterMissionsByMonth(missions: Mission[], year: number, month: number): Mission[] {
  return missions
    .filter(m => {
      try {
        const d = parseISO(m.date);
        return isValid(d) && d.getFullYear() === year && d.getMonth() + 1 === month;
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.orderNumber || '').localeCompare(b.orderNumber || ''));
}

async function buildMonthlyMissionsPdfBytes(
  missions: Mission[],
  year: number,
  month: number,
  profiles: Profile[],
  vehicles: Vehicle[]
): Promise<{ bytes: Uint8Array; count: number }> {
  const monthMissions = filterMissionsByMonth(missions, year, month);
  if (monthMissions.length === 0) {
    throw new Error('Nessun OdS trovato per il mese selezionato');
  }

  const pdfDoc = await PDFDocument.create();
  const assets = await loadAssets(pdfDoc);
  const coordinatorName = getMissionCoordinatorLabel(profiles);

  for (const mission of monthMissions) {
    const crewNames = mission.crewIds?.map(cid => {
      const p = profiles.find(pr => pr.id === cid);
      return p ? formatProfileName(p) : 'Sconosciuto';
    }).join(', ') || 'Nessun equipaggio assegnato';

    const vehicle = vehicles.find(v => v.id === mission.vehicleId);
    const vehicleLabel = vehicle ? formatVehicleLabel(vehicle) : undefined;

    const page = pdfDoc.addPage([595, 842]);
    drawMissionPage(page, mission, crewNames, coordinatorName, vehicleLabel, assets);
  }

  const bytes = await pdfDoc.save();
  return { bytes, count: monthMissions.length };
}

export async function generateMonthlyMissionsPDF(
  missions: Mission[],
  year: number,
  month: number,
  profiles: Profile[],
  vehicles: Vehicle[]
) {
  const { bytes, count } = await buildMonthlyMissionsPdfBytes(missions, year, month, profiles, vehicles);
  const monthLabel = String(month).padStart(2, '0');
  downloadBlob(bytes, `OdS_${year}_${monthLabel}.pdf`);
  return count;
}

export async function printMonthlyMissionsPDF(
  missions: Mission[],
  year: number,
  month: number,
  profiles: Profile[],
  vehicles: Vehicle[]
) {
  const { bytes, count } = await buildMonthlyMissionsPdfBytes(missions, year, month, profiles, vehicles);
  printBlob(bytes);
  return count;
}

const REPORT_PAGE_WIDTH = 595;
const REPORT_PAGE_HEIGHT = 842;
const REPORT_MARGIN_X = 40;
const REPORT_MARGIN_BOTTOM = 46;
const REPORT_TABLE_WIDTH = REPORT_PAGE_WIDTH - REPORT_MARGIN_X * 2;
const REPORT_COL_WIDTHS = [78, 108, REPORT_TABLE_WIDTH - 186];
const REPORT_FONT_SIZE = 9;
const REPORT_LINE_HEIGHT = 12;
const REPORT_CELL_PAD_X = 6;
const REPORT_CELL_PAD_Y = 6;
const REPORT_HEADER_ROW_HEIGHT = 22;

function sanitizePdfText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '');
}

function wrapPdfText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const safe = sanitizePdfText(text).replace(/\t/g, ' ');
  const paragraphs = safe.split(/\r?\n/);
  const lines: string[] = [];

  const pushLongWord = (word: string) => {
    let chunk = '';
    for (const char of word) {
      const next = chunk + char;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        chunk = next;
      } else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    return chunk;
  };

  paragraphs.forEach((paragraph, index) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      if (index < paragraphs.length - 1) lines.push('');
      return;
    }

    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        current = pushLongWord(word);
      } else {
        current = word;
      }
    }
    if (current) lines.push(current);
  });

  return lines.length > 0 ? lines : ['-'];
}

function formatMissionDate(date: string): string {
  try {
    const parsed = parseISO(date);
    return isValid(parsed) ? format(parsed, 'dd/MM/yyyy', { locale: it }) : date;
  } catch {
    return date;
  }
}

function formatShift(mission: Mission): string {
  if (mission.startTime && mission.endTime) return `${mission.startTime} - ${mission.endTime}`;
  return mission.startTime || '-';
}

function formatActivities(mission: Mission): string {
  const performed = mission.missionReport?.trim();
  if (performed) return performed;
  const assigned = mission.assignedTasks?.trim();
  return assigned || '-';
}

function monthReferenceLabel(year: number, month: number): string {
  const label = format(new Date(year, month - 1, 1), 'LLLL yyyy', { locale: it });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type ActivityRow = {
  date: string;
  shift: string;
  activities: string[];
};

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: PDFFont,
  color = rgb(0.1, 0.1, 0.1)
) {
  const safe = sanitizePdfText(text);
  const textWidth = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, {
    x: (REPORT_PAGE_WIDTH - textWidth) / 2,
    y,
    size,
    font,
    color,
  });
}

function drawReportTableHeader(page: PDFPage, yTop: number, boldFont: PDFFont): number {
  const yBottom = yTop - REPORT_HEADER_ROW_HEIGHT;
  page.drawRectangle({
    x: REPORT_MARGIN_X,
    y: yBottom,
    width: REPORT_TABLE_WIDTH,
    height: REPORT_HEADER_ROW_HEIGHT,
    color: rgb(0.1, 0.3, 0.6),
  });

  const labels = ['Data', 'Turno', 'Attività svolte'];
  let x = REPORT_MARGIN_X;
  labels.forEach((label, index) => {
    page.drawText(label, {
      x: x + REPORT_CELL_PAD_X,
      y: yBottom + 7,
      size: REPORT_FONT_SIZE,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    x += REPORT_COL_WIDTHS[index];
  });

  return yBottom;
}

function drawActivityRow(page: PDFPage, yTop: number, row: ActivityRow, striped: boolean, font: PDFFont): number {
  const lineCount = Math.max(row.activities.length, 1);
  const rowHeight = lineCount * REPORT_LINE_HEIGHT + REPORT_CELL_PAD_Y * 2;
  const yBottom = yTop - rowHeight;
  const border = rgb(0.78, 0.8, 0.84);

  if (striped) {
    page.drawRectangle({
      x: REPORT_MARGIN_X,
      y: yBottom,
      width: REPORT_TABLE_WIDTH,
      height: rowHeight,
      color: rgb(0.96, 0.97, 0.98),
    });
  }

  page.drawRectangle({
    x: REPORT_MARGIN_X,
    y: yBottom,
    width: REPORT_TABLE_WIDTH,
    height: rowHeight,
    borderColor: border,
    borderWidth: 0.6,
  });

  let dividerX = REPORT_MARGIN_X;
  for (let index = 0; index < REPORT_COL_WIDTHS.length - 1; index += 1) {
    dividerX += REPORT_COL_WIDTHS[index];
    page.drawLine({
      start: { x: dividerX, y: yBottom },
      end: { x: dividerX, y: yTop },
      thickness: 0.6,
      color: border,
    });
  }

  const columns = [[row.date], [row.shift], row.activities];
  let x = REPORT_MARGIN_X;
  columns.forEach((lines, index) => {
    lines.forEach((line, lineIndex) => {
      if (!line) return;
      page.drawText(sanitizePdfText(line), {
        x: x + REPORT_CELL_PAD_X,
        y: yTop - REPORT_CELL_PAD_Y - REPORT_FONT_SIZE - lineIndex * REPORT_LINE_HEIGHT,
        size: REPORT_FONT_SIZE,
        font,
        color: rgb(0.12, 0.12, 0.12),
      });
    });
    x += REPORT_COL_WIDTHS[index];
  });

  return yBottom;
}

async function buildMonthlyActivityReportPdfBytes(
  missions: Mission[],
  year: number,
  month: number
): Promise<{ bytes: Uint8Array; count: number }> {
  const monthMissions = filterMissionsByMonth(missions, year, month);
  if (monthMissions.length === 0) {
    throw new Error('Nessuna attività trovata per il mese selezionato');
  }

  const pdfDoc = await PDFDocument.create();
  const { font, boldFont, logoImage } = await loadAssets(pdfDoc);
  const monthLabel = monthReferenceLabel(year, month);
  const activityWidth = REPORT_COL_WIDTHS[2] - REPORT_CELL_PAD_X * 2;

  const rows: ActivityRow[] = monthMissions.map(mission => ({
    date: formatMissionDate(mission.date),
    shift: formatShift(mission),
    activities: wrapPdfText(formatActivities(mission), font, REPORT_FONT_SIZE, activityWidth),
  }));

  let page = pdfDoc.addPage([REPORT_PAGE_WIDTH, REPORT_PAGE_HEIGHT]);
  let y = REPORT_PAGE_HEIGHT - 36;
  let rowIndex = 0;

  const startContinuationPage = () => {
    page = pdfDoc.addPage([REPORT_PAGE_WIDTH, REPORT_PAGE_HEIGHT]);
    y = REPORT_PAGE_HEIGHT - 40;
    drawCenteredText(page, `Report mensile — ${monthLabel}`, y - 12, 11, boldFont);
    y -= 28;
    y = drawReportTableHeader(page, y, boldFont);
  };

  const drawFirstPageHeader = () => {
    if (logoImage) {
      const logo = logoImage.scaleToFit(78, 78);
      page.drawImage(logoImage, {
        x: (REPORT_PAGE_WIDTH - logo.width) / 2,
        y: y - logo.height,
        width: logo.width,
        height: logo.height,
      });
      y -= logo.height + 16;
    }

    drawCenteredText(page, 'Report mensile', y - 14, 16, boldFont);
    y -= 28;
    drawCenteredText(page, monthLabel, y - 12, 13, font, rgb(0.2, 0.28, 0.4));
    y -= 32;
    y = drawReportTableHeader(page, y, boldFont);
  };

  drawFirstPageHeader();

  for (const row of rows) {
    let remaining = row.activities;

    while (remaining.length > 0) {
      const minRowHeight = REPORT_LINE_HEIGHT + REPORT_CELL_PAD_Y * 2;
      if (y - minRowHeight < REPORT_MARGIN_BOTTOM) {
        startContinuationPage();
      }

      const available = y - REPORT_MARGIN_BOTTOM;
      const maxLines = Math.max(
        1,
        Math.floor((available - REPORT_CELL_PAD_Y * 2) / REPORT_LINE_HEIGHT)
      );
      const chunk = remaining.slice(0, maxLines);
      remaining = remaining.slice(maxLines);

      y = drawActivityRow(
        page,
        y,
        {
          date: row.date,
          shift: row.shift,
          activities: chunk,
        },
        rowIndex % 2 === 1,
        font
      );

      if (remaining.length > 0) {
        startContinuationPage();
      }
    }

    rowIndex += 1;
  }

  const pages = pdfDoc.getPages();
  pages.forEach((reportPage, index) => {
    const label = `${index + 1} / ${pages.length}`;
    const labelWidth = font.widthOfTextAtSize(label, 8);
    reportPage.drawText(label, {
      x: (REPORT_PAGE_WIDTH - labelWidth) / 2,
      y: 24,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });
  });

  const bytes = await pdfDoc.save();
  return { bytes, count: monthMissions.length };
}

export async function generateMonthlyActivityReportPDF(
  missions: Mission[],
  year: number,
  month: number
) {
  const { bytes, count } = await buildMonthlyActivityReportPdfBytes(missions, year, month);
  const monthLabel = String(month).padStart(2, '0');
  downloadBlob(bytes, `Report_${year}_${monthLabel}.pdf`);
  return count;
}

export async function printMonthlyActivityReportPDF(
  missions: Mission[],
  year: number,
  month: number
) {
  const { bytes, count } = await buildMonthlyActivityReportPdfBytes(missions, year, month);
  printBlob(bytes);
  return count;
}
