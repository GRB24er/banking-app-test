// src/app/api/creditcard/admin/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import CreditCardApplication from '@/models/CreditCardApplication';
import User from '@/models/User';
import { sendSimpleEmail } from '@/lib/mail';

const ADMIN_EMAILS = [
  'admin@zentribank.capital',
  'your-email@example.com',
];

const authOptions = {
  secret: 'b3bc4dcf9055e490cef86fd9647fc8acd61d6bbe07dfb85fb6848bfe7f4f3926',
};

const CARD_ISSUERS = {
  platinum: { issuer: 'Visa', prefix: '4532' },
  gold: { issuer: 'Mastercard', prefix: '5425' },
  silver: { issuer: 'Discover', prefix: '6011' },
  basic: { issuer: 'Visa', prefix: '4532' },
  student: { issuer: 'Discover', prefix: '6011' },
  secured: { issuer: 'Mastercard', prefix: '5425' },
  business: { issuer: 'American Express', prefix: '3782' }
};

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    const isAdmin = user?.role === 'admin' || ADMIN_EMAILS.includes(session.user.email.toLowerCase());

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await req.json();
    const { applicationNumber, action, reason, creditLimit, interestRate, annualFee } = data;

    if (!applicationNumber || !action) {
      return NextResponse.json(
        { success: false, error: 'Application number and action are required' },
        { status: 400 }
      );
    }

    const application: any = await CreditCardApplication.findOne({ applicationNumber });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    if (!application.workflow) {
      application.workflow = {};
    }

    if (action === 'approve') {
      application.status = 'approved';
      
      application.workflow.decision = {
        type: 'approved',
        madeBy: session.user.email,
        madeAt: new Date(),
        reason: reason || 'Application approved',
        conditions: []
      };

      const cardType = application.cardPreferences?.cardType || 'basic';
      const issuerInfo = CARD_ISSUERS[cardType as keyof typeof CARD_ISSUERS] || CARD_ISSUERS.basic;

      const cardNumber = generateCardNumber(issuerInfo.prefix);
      const cvv = generateCVV();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 3);

      application.workflow.approval = {
        creditLimit: creditLimit || 5000,
        interestRate: interestRate || 18.99,
        annualFee: annualFee || 0,
        issuer: issuerInfo.issuer,
        cardDetails: {
          cardType: cardType,
          cardNumber: cardNumber,
          expiryDate: expiryDate,
          cvv: cvv,
          pin: '',
          isActive: false,
          activatedAt: undefined
        },
        termsAccepted: false,
        cardShipped: false,
        cardDelivered: false
      };

    } else if (action === 'reject') {
      application.status = 'declined';

      application.workflow.decision = {
        type: 'declined',
        madeBy: session.user.email,
        madeAt: new Date(),
        reason: reason || 'Application declined',
        conditions: []
      };

    } else if (action === 'request_documents') {
      application.status = 'documents_pending';

    } else if (action === 'manual_review') {
      application.status = 'manual_review';
    }

    application.workflow.lastUpdatedAt = new Date();
    await application.save();

    // Notify the user when their application is declined
    if (action === 'reject') {
      try {
        const applicant = await User.findById(application.userId);
        const applicantEmail = applicant?.email || application.personalInfo?.email;
        const applicantName = applicant?.name || application.personalInfo?.firstName || 'Valued Client';
        const declineReason = reason || 'Application declined';
        const cardType = application.cardPreferences?.cardType || 'credit card';

        if (applicantEmail) {
          const text = `Dear ${applicantName},

We have completed the review of your ${cardType} application (Reference: ${application.applicationNumber}).

After careful consideration, we are unable to approve your application at this time.

Reason: ${declineReason}

You may reapply after 90 days. If you have any questions about this decision, please contact our support team.

Thank you for considering ZentriBank.`;

          const html = `
            <p>Dear ${applicantName},</p>
            <p>We have completed the review of your <strong>${cardType}</strong> application (Reference: <strong>${application.applicationNumber}</strong>).</p>
            <p>After careful consideration, we are unable to approve your application at this time.</p>
            <p><strong>Reason:</strong> ${declineReason}</p>
            <p>You may reapply after 90 days. If you have any questions about this decision, please contact our support team.</p>
            <p>Thank you for considering ZentriBank.</p>
          `;

          await sendSimpleEmail(applicantEmail, 'Credit Card Application Declined', text, html);
        }
      } catch (emailError) {
        console.error('Failed to send credit card decline email:', emailError);
        // Continue even if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Application ${action}d successfully`,
      data: {
        applicationNumber: application.applicationNumber,
        status: application.status,
        decision: application.workflow.decision,
        issuer: application.workflow.approval?.issuer
      }
    });

  } catch (error: any) {
    console.error('❌ Admin update application error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update application' },
      { status: 500 }
    );
  }
}

function generateCardNumber(prefix: string): string {
  let number = prefix;
  const remainingDigits = 16 - prefix.length;
  
  for (let i = 0; i < remainingDigits; i++) {
    number += Math.floor(Math.random() * 10);
  }
  
  return number;
}

function generateCVV(): string {
  return Math.floor(100 + Math.random() * 900).toString();
}