import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import { UploadedFile } from "../types";

export const processFile = async (file: File): Promise<UploadedFile | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read file"));

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'txt' || fileExtension === 'csv') {
      reader.onload = (e) => {
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || "text/plain",
          size: file.size,
          data: e.target?.result as string,
          isText: true,
        });
      };
      reader.readAsText(file);
    } else if (fileExtension === 'docx') {
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: file.size,
            data: result.value,
            isText: true,
          });
        } catch (err) {
          console.error("Error parsing DOCX:", err);
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          let allText = "";
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            allText += `Sheet: ${sheetName}\n${csv}\n\n`;
          });
          resolve({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size: file.size,
            data: allText,
            isText: true,
          });
        } catch (err) {
          console.error("Error parsing Excel:", err);
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileExtension === 'pdf' || file.type.startsWith('audio/') || file.type.startsWith('image/')) {
      // For PDF, Audio, Images, we pass base64 to Gemini
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || (fileExtension === 'pdf' ? "application/pdf" : "application/octet-stream"),
          size: file.size,
          data: base64Data,
          isText: false,
        });
      };
      reader.readAsDataURL(file);
    } else {
      // Fallback: pass as raw binary/base64 without interrupting the user
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          data: base64Data,
          isText: false,
        });
      };
      reader.readAsDataURL(file);
    }
  });
};
