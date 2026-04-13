// src/app/api/security/devices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import connectDB from '@/lib/mongodb';
import TrustedDevice from '@/models/TrustedDevice';

// GET - List all trusted devices
export async function GET() {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const devices = await TrustedDevice.find({ userId: session.user.id, trusted: true })
      .sort({ lastUsedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, devices });
  } catch (error: any) {
    console.error('Devices fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

// DELETE - Revoke a trusted device
export async function DELETE(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const device = await TrustedDevice.findOne({
      _id: deviceId,
      userId: session.user.id,
    });

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    device.trusted = false;
    await device.save();

    return NextResponse.json({
      success: true,
      message: 'Device revoked successfully',
    });
  } catch (error: any) {
    console.error('Device revoke error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke device' },
      { status: 500 }
    );
  }
}
