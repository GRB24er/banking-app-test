// src/app/api/statements/download/route.ts
// Generates and returns a downloadable PDF bank statement
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function isCreditType(type: string): boolean {
  return ['deposit', 'transfer-in', 'interest', 'adjustment-credit'].includes(type);
}

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { startDate, endDate, accountType } = body;

    if (!startDate || !endDate || !accountType) {
      return NextResponse.json(
        { success: false, error: 'startDate, endDate, and accountType are required' },
        { status: 400 }
      );
    }

    // Fetch transactions for the period
    const transactions = await Transaction.find({
      userId: user._id,
      accountType,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).sort({ date: 1 });

    // Calculate summary
    const deposits = transactions
      .filter((t: any) => isCreditType(t.type))
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const withdrawals = transactions
      .filter((t: any) => !isCreditType(t.type))
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    const balanceField = `${accountType}Balance`;
    const currentBalance = (user as any)[balanceField] || 0;
    const closingBalance = currentBalance;
    const openingBalance = closingBalance - deposits + withdrawals;
    const statementNumber = `ZB-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`;

    // Build the PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // ---- Header bar ----
    doc.setFillColor(15, 23, 42); // navy #0f172a
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Gold accent line
    doc.setFillColor(201, 169, 98); // gold #c9a962
    doc.rect(0, 40, pageWidth, 2, 'F');

    // Bank name
    doc.setTextColor(201, 169, 98);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ZENTRIBANK CAPITAL', 15, 18);

    // Bank address
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('123 Financial District, Suite 500 | New York, NY 10004', 15, 25);
    doc.text('Tel: +1 (800) 123-4567 | www.zentribank.capital', 15, 30);

    // ---- Statement Title ----
    let y = 52;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT STATEMENT', 15, y);

    y += 6;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Confidential - For Account Holder Use Only', 15, y);

    // ---- Account Info ----
    y += 12;
    doc.setFillColor(248, 250, 252);
    doc.rect(15, y - 4, pageWidth - 30, 32, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');

    const col1 = 20;
    const col2 = 110;

    doc.text('ACCOUNT HOLDER', col1, y + 2);
    doc.text('STATEMENT NUMBER', col2, y + 2);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(user.name || 'Account Holder', col1, y + 8);
    doc.text(statementNumber, col2, y + 8);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT TYPE', col1, y + 16);
    doc.text('STATEMENT PERIOD', col2, y + 16);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${accountType.charAt(0).toUpperCase() + accountType.slice(1)} Account`, col1, y + 22);

    const periodStart = new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const periodEnd = new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`${periodStart} - ${periodEnd}`, col2, y + 22);

    // ---- Account Summary ----
    y += 42;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT SUMMARY', 15, y);

    y += 2;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(15, y, pageWidth - 15, y);

    y += 8;
    const summaryData = [
      ['Opening Balance', `$${openingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Total Deposits', `+$${deposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Total Withdrawals', `-$${withdrawals.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      ['Closing Balance', `$${closingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ];

    autoTable(doc, {
      startY: y,
      head: [],
      body: summaryData,
      theme: 'plain',
      margin: { left: 15, right: 15 },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [100, 116, 139] },
        1: { halign: 'right', fontStyle: 'bold', textColor: [30, 41, 59] },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // ---- Transaction Table ----
    y = (doc as any).lastAutoTable.finalY + 12;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TRANSACTION HISTORY (${transactions.length} Transactions)`, 15, y);

    y += 2;
    doc.setDrawColor(203, 213, 225);
    doc.line(15, y, pageWidth - 15, y);

    if (transactions.length === 0) {
      y += 12;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('No transactions found during this statement period.', 15, y);
    } else {
      let runningBalance = openingBalance;
      const tableData = transactions.map((t: any) => {
        const isCredit = isCreditType(t.type);
        runningBalance += isCredit ? t.amount : -t.amount;
        const dateStr = new Date(t.date).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        });
        const amountStr = `${isCredit ? '+' : '-'}$${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const balStr = `$${runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return [dateStr, t.description || '-', t.type.toUpperCase(), amountStr, balStr];
      });

      autoTable(doc, {
        startY: y + 4,
        head: [['DATE', 'DESCRIPTION', 'TYPE', 'AMOUNT', 'BALANCE']],
        body: tableData,
        margin: { left: 15, right: 15 },
        styles: { fontSize: 8, cellPadding: 3.5 },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          fontStyle: 'bold',
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 28 },
          3: { halign: 'right' },
          4: { halign: 'right', fontStyle: 'bold' },
        },
        alternateRowStyles: { fillColor: [252, 252, 253] },
        didParseCell: function (data: any) {
          if (data.section === 'body' && data.column.index === 3) {
            const val = String(data.cell.raw);
            if (val.startsWith('+')) {
              data.cell.styles.textColor = [16, 185, 129];
            } else {
              data.cell.styles.textColor = [239, 68, 68];
            }
          }
        },
      });
    }

    // ---- Footer ----
    const finalY = transactions.length > 0 ? (doc as any).lastAutoTable.finalY + 12 : y + 20;
    const footerY = Math.max(finalY, 240);

    // Check if we need a new page for the footer
    if (footerY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
    }

    const fy = doc.internal.pageSize.getHeight() - 35;
    doc.setFillColor(30, 41, 59);
    doc.rect(0, fy - 5, pageWidth, 40, 'F');

    doc.setTextColor(201, 169, 98);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANT NOTICE', 15, fy + 3);

    doc.setTextColor(180, 180, 180);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Please review this statement carefully. Report any discrepancies within 60 days to +1 (800) 123-4567.',
      15,
      fy + 9
    );
    doc.text(
      `© ${new Date().getFullYear()} ZentriBank Capital. All rights reserved. | Member FDIC | Equal Housing Lender`,
      15,
      fy + 15
    );

    // Output PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ZentriBank_Statement_${accountType}_${startDate}_${endDate}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
