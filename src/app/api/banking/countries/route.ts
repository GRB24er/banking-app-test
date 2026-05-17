// src/app/api/banking/countries/route.ts
// Public registry of countries the bank can send to, plus the rail and
// validation hints the wire form needs.

import { NextResponse } from "next/server";
import { COUNTRIES, regionOf, sanctionsTierOf } from "@/lib/countries";
import { railsFor } from "@/lib/bankingCodes";

export const dynamic = "force-static";

export async function GET() {
  const payload = COUNTRIES.map((c) => ({
    code: c.code,
    name: c.name,
    currency: c.currency,
    emoji: c.emoji,
    phoneCode: c.phoneCode,
    requiresIBAN: c.requiresIBAN,
    requiresSortCode: c.requiresSortCode ?? false,
    requiresRoutingNumber: c.requiresRoutingNumber ?? false,
    extraFields: c.extraFields ?? [],
    bankInfoHint: c.bankInfoHint,
    region: regionOf(c.code),
    sanctionsTier: sanctionsTierOf(c.code),
    rails: railsFor(c.code).map((r) => ({
      rail: r.rail,
      domestic: r.domestic,
      speed: r.speed,
      feeMinor: r.feeMinor.toString(),
    })),
  }));
  return NextResponse.json({ countries: payload });
}
