// src/app/api/chat/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Chat from '@/models/Chat';
import User from '@/models/User';

const authOptions = {
  secret: 'b3bc4dcf9055e490cef86fd9647fc8acd61d6bbe07dfb85fb6848bfe7f4f3926',
};

const ADMIN_EMAILS = ['admin@zentribank.capital', 'your-email@example.com'];

export async function DELETE(req: NextRequest) {
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

    const isAdmin = user.role === 'admin' || ADMIN_EMAILS.includes(session.user.email.toLowerCase());

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { chatId } = await req.json();

    if (!chatId) {
      return NextResponse.json({ success: false, error: 'Chat ID is required' }, { status: 400 });
    }

    await Chat.findByIdAndDelete(chatId);

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Delete chat error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete chat' },
      { status: 500 }
    );
  }
}