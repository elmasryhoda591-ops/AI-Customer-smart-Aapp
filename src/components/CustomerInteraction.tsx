import { useState, useRef } from "react";
import { Send, Mic, Loader2, MessageSquare, AlertCircle, CheckCircle2, HelpCircle, Square } from "lucide-react";
import { GoogleGenAI, Type } from "@google/genai";
import { UploadedFile, AIResponse } from "../types";

interface CustomerInteractionProps {
  files: UploadedFile[];
}

export function CustomerInteraction({ files }: CustomerInteractionProps) {
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(",")[1];
          setAudioData({ base64: base64data, mimeType: "audio/webm" });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("تعذر الوصول إلى الميكروفون. يرجى التحقق من الصلاحيات.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearAudio = () => {
    setAudioData(null);
  };

  const handleAnalyze = async () => {
    if (!message.trim() && !audioData) return;

    setIsAnalyzing(true);
    setError(null);
    setResponse(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      let promptText = `أنت مساعد ذكي لخدمة العملاء (AI Customer Support Agent).
مهمتك هي قراءة أو سماع رسالة العميل، فهمها، تحليلها، والرد عليها بناءً على قاعدة المعرفة المرفقة فقط.
إذا لم تجد الإجابة في قاعدة المعرفة، اعتذر بلباقة وأخبره أنك لا تملك هذه المعلومة.
يجب أن ترد بنفس لغة العميل.
يجب أن تجيب فقط على الأسئلة التي طرحها العميل، وتفصل كل سؤال وإجابته.

رسالة العميل النصية (إن وجدت):
"""
${message}
"""

قاعدة المعرفة (استخدم هذه المعلومات فقط للرد):
`;

      const textFiles = files.filter((f) => f.isText);
      textFiles.forEach((f) => {
        promptText += `\n--- ملف: ${f.name} ---\n${f.data}\n`;
      });

      const parts: any[] = [{ text: promptText }];

      // Add customer audio if exists
      if (audioData) {
        parts.push({
          inlineData: {
            data: audioData.base64,
            mimeType: audioData.mimeType,
          },
        });
      }

      const base64Files = files.filter((f) => !f.isText);
      base64Files.forEach((f) => {
        parts.push({
          inlineData: {
            data: f.data,
            mimeType: f.type,
          },
        });
      });

      const result = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysis: {
                type: Type.OBJECT,
                properties: {
                  requestType: { type: Type.STRING, description: "نوع الطلب (شكوى، استفسار، مشكلة، الخ)" },
                  sentiment: { type: Type.STRING, description: "مشاعر العميل (إيجابي، سلبي، محايد)" },
                  summary: { type: Type.STRING, description: "ملخص قصير لرسالة العميل" },
                },
                required: ["requestType", "sentiment", "summary"],
              },
              response: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING, description: "السؤال الذي طرحه العميل" },
                    answer: { type: Type.STRING, description: "الإجابة بناءً على قاعدة المعرفة" },
                  },
                  required: ["question", "answer"],
                },
                description: "قائمة بالأسئلة وإجاباتها المنفصلة",
              },
              fullReply: { type: Type.STRING, description: "الرد الكامل والمهذب الذي سيتم إرساله للعميل" },
            },
            required: ["analysis", "response", "fullReply"],
          },
        },
      });

      if (result.text) {
        const parsedResponse = JSON.parse(result.text) as AIResponse;
        setResponse(parsedResponse);
      } else {
        throw new Error("لم يتم استلام رد من الذكاء الاصطناعي.");
      }
    } catch (err: any) {
      console.error("Error generating response:", err);
      setError(err.message || "حدث خطأ أثناء تحليل الرسالة.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRequestTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("شكوى") || t.includes("complaint")) return <AlertCircle className="w-5 h-5 text-destructive" />;
    if (t.includes("استفسار") || t.includes("inquiry")) return <HelpCircle className="w-5 h-5 text-blue-500" />;
    return <MessageSquare className="w-5 h-5 text-primary" />;
  };

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-primary" />
        تفاعل العملاء (Customer Interaction)
      </h2>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Input Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب رسالة العميل هنا، أو الصق إيميل/شات..."
            className="w-full min-h-[150px] p-4 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            dir="auto"
          />
          
          {audioData && (
            <div className="absolute top-3 left-3 bg-primary/10 text-primary px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium">
              <Mic className="w-4 h-4" />
              تم تسجيل رسالة صوتية
              <button onClick={clearAudio} className="hover:text-destructive ml-2">
                &times;
              </button>
            </div>
          )}

          <div className="absolute bottom-3 left-3 flex gap-2">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="p-2 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors animate-pulse flex items-center gap-2"
                title="إيقاف التسجيل"
              >
                <Square className="w-4 h-4 fill-current" />
                <span className="text-xs font-medium">إيقاف</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className={`p-2 rounded-full transition-colors ${audioData ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                title="تسجيل رسالة صوتية"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!message.trim() && !audioData)}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري التحليل...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  تحليل والرد
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Results Area */}
        {response && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Analysis Section */}
            <div className="bg-muted/50 rounded-lg p-5 border border-border">
              <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">تحليل الرسالة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-background p-3 rounded-md border border-border">
                  {getRequestTypeIcon(response.analysis.requestType)}
                  <div>
                    <p className="text-xs text-muted-foreground">نوع الطلب</p>
                    <p className="font-medium">{response.analysis.requestType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-background p-3 rounded-md border border-border">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">المشاعر</p>
                    <p className="font-medium">{response.analysis.sentiment}</p>
                  </div>
                </div>
                <div className="md:col-span-2 bg-background p-3 rounded-md border border-border">
                  <p className="text-xs text-muted-foreground mb-1">الملخص</p>
                  <p className="text-sm">{response.analysis.summary}</p>
                </div>
              </div>
            </div>

            {/* Q&A Section */}
            <div className="bg-muted/50 rounded-lg p-5 border border-border">
              <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">الأسئلة والإجابات المنفصلة</h3>
              {response.response.length > 0 ? (
                <div className="space-y-4">
                  {response.response.map((qa, index) => (
                    <div key={index} className="bg-background p-4 rounded-md border border-border">
                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-md mb-2">
                          سؤال {index + 1}
                        </span>
                        <p className="font-medium text-sm">{qa.question}</p>
                      </div>
                      <div className="pl-4 border-l-2 border-primary/30 ml-2 rtl:pl-0 rtl:pr-4 rtl:border-l-0 rtl:border-r-2">
                        <p className="text-sm text-muted-foreground">{qa.answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">لم يتم التعرف على أسئلة محددة.</p>
              )}
            </div>

            {/* Final Reply Section */}
            <div className="bg-primary/5 rounded-lg p-5 border border-primary/20">
              <h3 className="text-lg font-semibold mb-4 border-b border-primary/20 pb-2 text-primary">الرد المقترح للعميل</h3>
              <div className="bg-background p-4 rounded-md border border-border whitespace-pre-wrap text-sm leading-relaxed" dir="auto">
                {response.fullReply}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => navigator.clipboard.writeText(response.fullReply)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
                >
                  نسخ الرد
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
