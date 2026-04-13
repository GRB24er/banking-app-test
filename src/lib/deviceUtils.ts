// src/lib/deviceUtils.ts
// Utilities for parsing user agents and generating device fingerprints
import crypto from 'crypto';

export interface ParsedDevice {
  browser: string;
  os: string;
  device: string;
}

export function parseUserAgent(ua: string): ParsedDevice {
  const result: ParsedDevice = {
    browser: 'Unknown Browser',
    os: 'Unknown OS',
    device: 'Unknown Device',
  };

  if (!ua) return result;

  // Detect browser
  if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    result.browser = `Firefox ${match?.[1]?.split('.')[0] || ''}`.trim();
  } else if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/([\d.]+)/);
    result.browser = `Edge ${match?.[1]?.split('.')[0] || ''}`.trim();
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    result.browser = `Chrome ${match?.[1]?.split('.')[0] || ''}`.trim();
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    const match = ua.match(/Version\/([\d.]+)/);
    result.browser = `Safari ${match?.[1]?.split('.')[0] || ''}`.trim();
  } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
    result.browser = 'Internet Explorer';
  }

  // Detect OS
  if (ua.includes('Windows NT 10')) {
    result.os = 'Windows 10/11';
  } else if (ua.includes('Windows NT')) {
    result.os = 'Windows';
  } else if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X ([\d_]+)/);
    const version = match?.[1]?.replace(/_/g, '.') || '';
    result.os = `macOS ${version}`.trim();
  } else if (ua.includes('Android')) {
    const match = ua.match(/Android ([\d.]+)/);
    result.os = `Android ${match?.[1] || ''}`.trim();
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    const match = ua.match(/OS ([\d_]+)/);
    const version = match?.[1]?.replace(/_/g, '.') || '';
    result.os = `iOS ${version}`.trim();
  } else if (ua.includes('Linux')) {
    result.os = 'Linux';
  }

  // Detect device type
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    result.device = 'Mobile';
  } else if (ua.includes('iPad') || ua.includes('Tablet')) {
    result.device = 'Tablet';
  } else {
    result.device = 'Desktop';
  }

  return result;
}

export function generateDeviceFingerprint(ua: string, ip: string): string {
  // Combine user agent and IP to create a device fingerprint
  const raw = `${ua}|${ip}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export function getClientIp(req: any): string {
  const forwarded = req.headers.get?.('x-forwarded-for') || req.headers?.['x-forwarded-for'];
  if (forwarded) {
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded;
    return ip || '127.0.0.1';
  }
  const realIp = req.headers.get?.('x-real-ip') || req.headers?.['x-real-ip'];
  if (realIp) return realIp;
  return '127.0.0.1';
}

export async function getLocationFromIp(ip: string): Promise<string> {
  // In production, use a real GeoIP service. This is a simple fallback.
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168') || ip.startsWith('10.')) {
    return 'Local Network';
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.city && data.regionName) {
        return `${data.city}, ${data.regionName}`;
      }
      if (data.country) return data.country;
    }
  } catch {
    // GeoIP lookup failed, use fallback
  }
  return 'Unknown Location';
}
