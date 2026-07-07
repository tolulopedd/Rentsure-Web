import { apiFetch } from "@/lib/api";
import { getErrorCode } from "@/lib/errors";

type PublicDocumentType =
  | "PASSPORT_PHOTO"
  | "IDENTITY_DOCUMENT"
  | "EMPLOYMENT_DOCUMENT"
  | "PAYSLIP"
  | "UTILITY_BILL"
  | "PAYMENT_RECEIPT"
  | "OTHER";

type PresignResponse = {
  objectKey: string;
  uploadUrl: string;
  method: "PUT";
  requiredHeaders?: Record<string, string>;
};

function normalizedUploadFileName(file: File, blob: Blob) {
  if (blob.type === "image/jpeg") {
    return file.name.replace(/\.[^.]+$/, "") + ".jpg";
  }
  return file.name;
}

export async function uploadPublicAccountDocument(input: {
  documentType: PublicDocumentType;
  file: File | Blob;
  fileName: string;
  contentType: string;
}) {
  try {
    const presign = await apiFetch<PresignResponse>("/api/storage/public-account-documents/presign", {
      method: "POST",
      body: JSON.stringify({
        documentType: input.documentType,
        fileName: input.fileName,
        contentType: input.contentType,
        fileSize: input.file.size
      })
    });

    const uploadResponse = await fetch(presign.uploadUrl, {
      method: presign.method || "PUT",
      headers: presign.requiredHeaders || { "Content-Type": input.contentType },
      body: input.file
    });

    if (!uploadResponse.ok) {
      let details = "";
      try {
        details = (await uploadResponse.text()).slice(0, 300);
      } catch {
        // Ignore upload error parsing failures.
      }
      throw new Error(`S3 upload failed (${uploadResponse.status})${details ? `: ${details}` : ""}`);
    }

    return {
      objectKey: presign.objectKey,
      fileName: input.fileName,
      mimeType: input.contentType,
      fileSize: input.file.size
    };
  } catch (error: unknown) {
    const code = getErrorCode(error);
    if (code !== "STORAGE_NOT_CONFIGURED") {
      throw error;
    }

    const base64Data = await blobToBase64(input.file);
    const localUpload = await apiFetch<{
      objectKey: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }>("/api/storage/public-account-documents/local-upload", {
      method: "POST",
      body: JSON.stringify({
        documentType: input.documentType,
        fileName: input.fileName,
        contentType: input.contentType,
        fileSize: input.file.size,
        base64Data
      })
    });

    return localUpload;
  }
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

export async function compressToMaxBytes(file: File, maxBytes = 300 * 1024): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = URL.createObjectURL(file);
  });

  const maxW = 720;
  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.85;

  const toBlob = (q: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        q
      );
    });

  let blob = await toBlob(quality);
  while (blob.size > maxBytes && quality > 0.35) {
    quality -= 0.1;
    blob = await toBlob(quality);
  }

  if (blob.size > maxBytes) {
    throw new Error("Could not compress image enough. Try another photo.");
  }

  return blob;
}

export async function preparePassportPhotoUpload(file: File) {
  const isCompressible = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  const preparedFile = isCompressible ? await compressToMaxBytes(file, 350 * 1024) : file;
  const fileName = normalizedUploadFileName(file, preparedFile);

  return {
    file: preparedFile,
    fileName,
    mimeType: preparedFile.type || file.type || "image/jpeg",
    fileSize: preparedFile.size
  };
}
