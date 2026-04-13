// src/lib/authOptions.ts
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import LoginHistory from '@/models/LoginHistory';
import TrustedDevice from '@/models/TrustedDevice';
import bcrypt from 'bcryptjs';
import { parseUserAgent, generateDeviceFingerprint, getLocationFromIp } from '@/lib/deviceUtils';

const AUTH_SECRET = 'b3bc4dcf9055e490cef86fd9647fc8acd61d6bbe07dfb85fb6848bfe7f4f3926';

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    checkingBalance?: number;
    savingsBalance?: number;
    investmentBalance?: number;
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      checkingBalance?: number;
      savingsBalance?: number;
      investmentBalance?: number;
    };
  }
}

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('Missing credentials');
            throw new Error('Email and password required');
          }

          await dbConnect();

          // Use lowercase email for consistency
          const email = credentials.email.toLowerCase().trim();
          const password = credentials.password.trim();

          // Extract request metadata for login tracking
          const userAgent = (req?.headers as any)?.['user-agent'] || '';
          const forwarded = (req?.headers as any)?.['x-forwarded-for'] || '';
          const ipAddress = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '127.0.0.1';
          const parsed = parseUserAgent(userAgent);

          console.log('🔍 Auth attempt for:', email);

          const user = await User.findOne({ email }).select('+password');

          if (!user) {
            console.log('❌ User not found:', email);
            // Record failed login
            try {
              await LoginHistory.create({
                email,
                status: 'failed',
                ipAddress,
                device: parsed.device,
                browser: parsed.browser,
                os: parsed.os,
                userAgent,
                failureReason: 'User not found',
                isNewDevice: false,
              });
            } catch (e) { /* non-blocking */ }
            throw new Error('Invalid credentials');
          }

          console.log('✅ User found:', user.email);

          // Compare password
          const isMatch = await bcrypt.compare(password, user.password);

          console.log('🔐 Password match:', isMatch);

          if (!isMatch) {
            // Record failed login
            try {
              await LoginHistory.create({
                userId: user._id,
                email,
                status: 'failed',
                ipAddress,
                device: parsed.device,
                browser: parsed.browser,
                os: parsed.os,
                userAgent,
                failureReason: 'Invalid password',
                isNewDevice: false,
              });
            } catch (e) { /* non-blocking */ }
            throw new Error('Invalid credentials');
          }

          console.log('✅ Authentication successful for:', user.email);

          // Check if this is a new/unrecognized device
          const fingerprint = generateDeviceFingerprint(userAgent, ipAddress);
          let isNewDevice = false;
          try {
            const existingDevice = await TrustedDevice.findOne({
              userId: user._id,
              deviceFingerprint: fingerprint,
              trusted: true,
            });

            if (!existingDevice) {
              isNewDevice = true;
              // Get location for the new device
              let location = 'Unknown Location';
              try {
                location = await getLocationFromIp(ipAddress);
              } catch (e) { /* non-blocking */ }

              // Register the new device as trusted
              await TrustedDevice.create({
                userId: user._id,
                deviceFingerprint: fingerprint,
                deviceName: `${parsed.browser} on ${parsed.os}`,
                browser: parsed.browser,
                os: parsed.os,
                ipAddress,
                location,
                lastUsedAt: new Date(),
                trusted: true,
              });

              // Send new device alert email (non-blocking)
              try {
                const { sendSimpleEmail } = require('@/lib/mail');
                const alertHtml = `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: white;">
                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 40px 30px; text-align: center; border-bottom: 4px solid #c9a962;">
                      <h1 style="margin: 0; font-size: 24px; color: #c9a962;">ZENTRIBANK</h1>
                      <p style="margin: 16px 0 0; font-size: 16px; opacity: 0.9;">New Device Login Alert</p>
                    </div>
                    <div style="padding: 30px;">
                      <p style="font-size: 16px; color: #1e293b;">Hello ${user.name},</p>
                      <p style="color: #475569; line-height: 1.6;">We detected a login to your account from a new device. If this was you, no action is needed.</p>
                      <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 0 0 8px; font-weight: 700; color: #92400e;">Login Details:</p>
                        <p style="margin: 4px 0; color: #78350f;"><strong>Device:</strong> ${parsed.device}</p>
                        <p style="margin: 4px 0; color: #78350f;"><strong>Browser:</strong> ${parsed.browser}</p>
                        <p style="margin: 4px 0; color: #78350f;"><strong>Operating System:</strong> ${parsed.os}</p>
                        <p style="margin: 4px 0; color: #78350f;"><strong>IP Address:</strong> ${ipAddress}</p>
                        <p style="margin: 4px 0; color: #78350f;"><strong>Location:</strong> ${location}</p>
                        <p style="margin: 4px 0; color: #78350f;"><strong>Time:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
                      </div>
                      <p style="color: #dc2626; font-weight: 600;">If this wasn't you, please secure your account immediately by changing your password and contacting support at +1 (800) 123-4567.</p>
                    </div>
                    <div style="background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e5e7eb;">
                      <p>This is an automated security alert from ZentriBank Capital.</p>
                    </div>
                  </div>
                `;
                sendSimpleEmail(
                  user.email,
                  'ZentriBank Security Alert - New Device Login',
                  `A new device was used to sign in to your account. Device: ${parsed.browser} on ${parsed.os}. IP: ${ipAddress}. If this wasn't you, contact support immediately.`,
                  alertHtml
                );
              } catch (emailError) {
                console.error('Failed to send new device alert email:', emailError);
              }
            } else {
              // Update last used timestamp
              existingDevice.lastUsedAt = new Date();
              existingDevice.ipAddress = ipAddress;
              await existingDevice.save();
            }
          } catch (deviceError) {
            console.error('Device tracking error:', deviceError);
          }

          // Record successful login
          try {
            let location = 'Unknown Location';
            try { location = await getLocationFromIp(ipAddress); } catch (e) { /* non-blocking */ }

            await LoginHistory.create({
              userId: user._id,
              email,
              status: 'success',
              ipAddress,
              location,
              device: parsed.device,
              browser: parsed.browser,
              os: parsed.os,
              userAgent,
              isNewDevice,
            });
          } catch (e) {
            console.error('Failed to record login history:', e);
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            checkingBalance: user.checkingBalance || 0,
            savingsBalance: user.savingsBalance || 0,
            investmentBalance: user.investmentBalance || 0,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.checkingBalance = (user as any).checkingBalance;
        token.savingsBalance = (user as any).savingsBalance;
        token.investmentBalance = (user as any).investmentBalance;
      }
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.checkingBalance = token.checkingBalance;
      session.user.savingsBalance = token.savingsBalance;
      session.user.investmentBalance = token.investmentBalance;
      return session;
    }
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },

  events: {
    async signIn({ user }) {
      console.log(`✅ User signed in: ${user?.email}`);
    },
    async signOut({ token }) {
      console.log(`❌ User signed out: ${token?.email}`);
    }
  },

  debug: false,
};