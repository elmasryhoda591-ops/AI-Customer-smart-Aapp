import { FileText, FileSpreadsheet, FileAudio, File, Trash2, UploadCloud, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import { UploadedFile } from "../types";

interface KnowledgeBaseProps {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
}

export function KnowledgeBase({ files, setFiles }: KnowledgeBaseProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file: File): Promise<UploadedFile | null> => {
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
        // Unsupported or fallback to base64 if we want to try
        alert(`Unsupported file type: ${file.name}`);
        resolve(null);
      }
    });
  };

  const handleFiles = async (newFiles: FileList | File[]) => {
    setIsProcessing(true);
    const processedFiles: UploadedFile[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      try {
        const processed = await processFile(newFiles[i]);
        if (processed) {
          processedFiles.push(processed);
        }
      } catch (err) {
        console.error("Error processing file:", newFiles[i].name, err);
        alert(`Failed to process ${newFiles[i].name}`);
      }
    }
    setFiles((prev) => [...prev, ...processedFiles]);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const getFileIcon = (fileName: string, type: string) => {
    if (fileName.endsWith('.pdf')) return <File className="w-5 h-5 text-red-500" />;
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (type.startsWith('audio/')) return <FileAudio className="w-5 h-5 text-purple-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <UploadCloud className="w-6 h-6 text-primary" />
        قاعدة المعرفة (Knowledge Base)
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        قم برفع ملفات PDF, Excel, Word, Text, أو مقاطع صوتية لتدريب التطبيق على الرد.
      </p>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,audio/*"
        />
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span>جاري معالجة الملفات...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="w-8 h-8 mb-2" />
            <span className="font-medium text-foreground">اسحب وأفلت الملفات هنا</span>
            <span className="text-sm">أو انقر لاختيار الملفات</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex-1 overflow-y-auto">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">الملفات المرفوعة ({files.length})</h3>
        {files.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground bg-muted/30 rounded-lg border border-border border-dashed">
            لا توجد ملفات مرفوعة بعد.
          </div>
        ) : (
          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {getFileIcon(file.name, file.type)}
                  <div className="truncate">
                    <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  aria-label="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
