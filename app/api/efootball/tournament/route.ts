import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(
  process.cwd(),
  "app",
  "data",
  "efootball_tournament.json",
);

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
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data, { headers: corsHeaders() });
  } catch {
    return NextResponse.json(
      { error: "Failed to read tournament data." },
      { status: 500, headers: corsHeaders() },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate basic structure
    if (!body.groups || !body.knockout) {
      return NextResponse.json(
        { error: "Invalid payload: 'groups' and 'knockout' are required." },
        { status: 400, headers: corsHeaders() },
      );
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(body, null, 2), "utf-8");

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
