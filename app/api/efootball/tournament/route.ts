import { NextResponse } from "next/server";

const NPOINT_URL = "https://api.npoint.io/d9d956517b1027a084a8";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  try {
    const res = await fetch(NPOINT_URL, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { headers: corsHeaders() });
  } catch {
    return NextResponse.json(
      { error: "Failed to read tournament data." },
      { status: 500, headers: corsHeaders() },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body.groups || !body.knockout) {
      return NextResponse.json(
        { error: "Invalid payload: 'groups' and 'knockout' are required." },
        { status: 400, headers: corsHeaders() },
      );
    }

    const res = await fetch(NPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`npoint responded with ${res.status}`);
    }

    return NextResponse.json(
      { success: true, message: "Tournament data updated." },
      { headers: corsHeaders() },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to write tournament data." },
      { status: 500, headers: corsHeaders() },
    );
  }
}
