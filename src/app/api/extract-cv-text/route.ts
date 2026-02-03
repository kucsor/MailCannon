import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/parse-resume";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;

    // Log for debugging
    console.log(`[API] Received file: ${file.name}, type: ${mimeType}, size: ${file.size}`);

    const text = await parseResume(buffer, mimeType);

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Error extracting text:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract text" },
      { status: 500 }
    );
  }
}
