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
