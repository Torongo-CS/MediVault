import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

async function buildPDF() {
  const mdPath = path.resolve('PROJECT_STRUCTURE.md');
  const pdfPath = path.resolve('PROJECT_STRUCTURE.pdf');
  const content = fs.readFileSync(mdPath, 'utf8');

  console.log('Generating PDF using PDFKit...');

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    bufferPages: true,
    info: {
      Title: 'MediVault Project Structure & Architectural Documentation',
      Author: 'MediVault Team',
    }
  });

  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        inCodeBlock = false;
        doc.moveDown(0.2);
        doc
          .font('Courier')
          .fontSize(8.5)
          .fillColor('#24292e');
        
        const codeText = codeBuffer.join('\n');
        const boxHeight = doc.heightOfString(codeText, { width: 500 }) + 10;

        // Draw background rectangle
        const startY = doc.y;
        if (startY + boxHeight > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
        }
        
        const currY = doc.y;
        doc
          .rect(40, currY, 515, boxHeight)
          .fill('#f6f8fa');

        doc
          .fillColor('#24292e')
          .text(codeText, 45, currY + 5, { width: 505 });

        doc.y = currY + boxHeight + 8;
        codeBuffer = [];
      } else {
        // Start code block
        inCodeBlock = true;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Skip horizontal rules
    if (line.trim() === '---') {
      doc.moveDown(0.5);
      doc
        .strokeColor('#e1e4e8')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();
      doc.moveDown(0.5);
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      doc.moveDown(0.5);
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#0969da')
        .text(line.replace('# ', '').trim());
      doc.moveDown(0.3);
    } else if (line.startsWith('## ')) {
      doc.moveDown(0.5);
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#0969da')
        .text(line.replace('## ', '').trim());
      doc.moveDown(0.2);
    } else if (line.startsWith('### ')) {
      doc.moveDown(0.4);
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#1f2328')
        .text(line.replace('### ', '').trim());
      doc.moveDown(0.2);
    } else if (line.startsWith('#### ')) {
      doc.moveDown(0.3);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#24292e')
        .text(line.replace('#### ', '').trim());
      doc.moveDown(0.1);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor('#24292e')
        .text(`  •  ${line.substring(2).trim()}`, { indent: 10 });
    } else if (line.trim().length > 0) {
      // Normal paragraph
      const cleanText = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor('#24292e')
        .text(cleanText, { lineGap: 2 });
    } else {
      doc.moveDown(0.3);
    }
  }

  // Add Page numbers
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#8c959f')
      .text(
        `MediVault Project Structure Documentation | Page ${i + 1} of ${pages.count}`,
        40,
        doc.page.height - 30,
        { align: 'center', width: 515 }
      );
  }

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log('PDF exported successfully to: ' + pdfPath);
      resolve(pdfPath);
    });
    writeStream.on('error', reject);
  });
}

buildPDF().catch(console.error);
