import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Mission } from '@/types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export async function generateMissionPDF(mission: Mission, crewNames: string = 'Nessun equipaggio assegnato', coordinatorName: string = 'N/A') {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const drawText = (text: string, x: number, y: number, size = 10, fontType = font) => {
    page.drawText(text, { x, y, size, font: fontType, color: rgb(0.1, 0.1, 0.1) });
  };

  let logoImage = null;
  let logoDims = null;
  try {
    const response = await fetch('/logo.png');
    const logoBytes = await response.arrayBuffer();
    logoImage = await pdfDoc.embedPng(logoBytes);
    logoDims = logoImage.scaleToFit(200, 70);
  } catch (error) {
    console.error('Error embedding logo:', error);
  }

  const headerHeight = logoDims ? 160 : 100;
  const titleText = 'CAN - Corpo Ambientale Nazionale Sez. di Martina Franca';
  const subtitleText = 'ORDINE DI SERVIZIO / RAPPORTO MISSIONE';
  const titleSize = 14;
  const subtitleSize = 12;

  const titleWidth = boldFont.widthOfTextAtSize(titleText, titleSize);
  const subtitleWidth = font.widthOfTextAtSize(subtitleText, subtitleSize);


  const headerPadding = 20;
  const logoHeight = logoDims ? logoDims.height : 0;

  // Header
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width: width,
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

  // Mission Info Section
  let currentY = height - headerHeight - 40;
  drawText(`ORDINE DI SERVIZIO N. ${mission.orderNumber || mission.id.slice(0, 8)}`, 50, currentY, 12, boldFont);
  currentY -= 25;

  drawText(`Data: ${format(new Date(mission.date), 'dd/MM/yyyy', { locale: it })}`, 50, currentY);
  currentY -= 20;

  drawText(`Ora Inizio: ${mission.startTime}`, 50, currentY);
  drawText(`Ora Fine: ${mission.endTime || 'N/A'}`, 300, currentY);
  currentY -= 20;

  drawText(`Coordinatore: ${coordinatorName}`, 50, currentY, 10, boldFont);
  currentY -= 20;

  drawText(`Equipaggio: ${crewNames}`, 50, currentY, 10, boldFont);
  currentY -= 30;

  // Vehicle Section
  page.drawRectangle({ x: 50, y: currentY - 5, width: width - 100, height: 20, color: rgb(0.9, 0.9, 0.9) });
  drawText('DATI VEICOLO', 55, currentY, 10, boldFont);
  currentY -= 30;

  drawText(`KM Inizio: ${mission.kmStart}`, 50, currentY);
  drawText(`KM Fine: ${mission.kmEnd || 'N/A'}`, 300, currentY);
  currentY -= 20;

  if (mission.kmEnd) {
    drawText(`Totale KM Percorsi: ${mission.kmEnd - mission.kmStart}`, 50, currentY, 10, boldFont);
  }
  currentY -= 30;

  // Tasks Section
  page.drawRectangle({ x: 50, y: currentY - 5, width: width - 100, height: 20, color: rgb(0.9, 0.9, 0.9) });
  drawText('COMPITI ASSEGNATI', 55, currentY, 10, boldFont);
  currentY -= 30;

  const taskLines = mission.assignedTasks.split('\n');
  taskLines.forEach(line => {
    drawText(`• ${line}`, 60, currentY);
    currentY -= 15;
  });
  currentY -= 20;

  // Report Section
  page.drawRectangle({ x: 50, y: currentY - 5, width: width - 100, height: 20, color: rgb(0.9, 0.9, 0.9) });
  drawText('RESOCONTO OPERATIVO', 55, currentY, 10, boldFont);
  currentY -= 30;

  if (mission.missionReport) {
    const reportLines = mission.missionReport.match(/.{1,100}/g) || [mission.missionReport];
    reportLines.forEach(line => {
      drawText(line, 60, currentY);
      currentY -= 15;
    });
  } else {
    drawText('Nessun resoconto inserito.', 60, currentY);
    currentY -= 15;
  }
  currentY -= 30;

  // Footer / Signatures
  currentY = 100;

  // Add Signature Image (firma.jpg)
  try {
    const signatureResponse = await fetch('/firma.jpg');
    const signatureBytes = await signatureResponse.arrayBuffer();
    const signatureImage = await pdfDoc.embedJpg(signatureBytes);
    const signatureDims = signatureImage.scaleToFit(100, 50);
    
    page.drawImage(signatureImage, {
      x: 75,
      y: currentY + 5,
      width: signatureDims.width,
      height: signatureDims.height,
    });
  } catch (error) {
    console.error('Error embedding signature:', error);
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

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeOrderNumber = mission.orderNumber ? mission.orderNumber.replace(/\//g, '_') : mission.id.slice(0, 8);
  link.download = `OdS_${safeOrderNumber}.pdf`;
  link.click();
}
