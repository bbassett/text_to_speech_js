import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

export async function POST(request: NextRequest) {
  try {
    const { fileName } = await request.json();

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { error: "File name is required" },
        { status: 400 }
      );
    }

    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json(
        { error: "Storage bucket not configured" },
        { status: 500 }
      );
    }

    // Initialize Storage client
    const storage = new Storage({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    // Download file content
    const [fileContent] = await file.download();

    // Delete the file after successful download (auto-cleanup)
    try {
      await file.delete();
      console.log(`Successfully deleted file: ${fileName}`);
    } catch (deleteError) {
      console.error(`Failed to delete file ${fileName}:`, deleteError);
      // Don't fail the request if deletion fails
    }

    // Determine content type based on file extension
    const contentType = fileName.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';
    
    // Return the audio file
    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileContent.length.toString(),
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Download Audio Error:", error);
    return NextResponse.json(
      { error: "Failed to download audio file" },
      { status: 500 }
    );
  }
}