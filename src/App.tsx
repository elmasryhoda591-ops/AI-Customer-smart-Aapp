import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PackagePlus, 
  MessageCircleQuestion, 
  ShieldAlert, 
  FileSearch, 
  Headset,
  Sparkles,
  Lock,
  Send,
  CheckCircle2,
  Loader2,
  Paperclip,
  X
} from 'lucide-react';
import { KnowledgeBase } from './components/KnowledgeBase';
import { CustomerInteraction } from './components/CustomerInteraction';
import { UploadedFile } from './types';
import { GoogleGenAI } from '@google/genai';
import { processFile } from './utils/fileUtils';

const TABS = [
  { id: 'order', label: 'طلب جديد', icon: PackagePlus },
  { id: 'inquiries', label: 'استفسارات', icon: MessageCircleQuestion },
  { id: 'complaint', label: 'شكوى', icon: ShieldAlert },
  { id: 'review', label: 'مراجعة الطلب', icon: FileSearch },
  { id: 'support', label: 'خدمة العملاء', icon: Headset },
];

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [isAdmin, setIsAdmin] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden relative" dir="rtl">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-teal-600/20 blur-[150px]" />
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 container mx-auto px-4 pt-12 pb-32 h-screen flex flex-col">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex-1" />
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <Sparkles className="w-5 h-5 text-teal-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent">
              بوابة العملاء الذكية
            </h1>
          </motion.div>
          <div className="flex-1 flex justify-end">
            {/* Hidden Admin Toggle Button */}
            <button 
              onClick={() => setIsAdmin(!isAdmin)}
              className="p-2 rounded-full hover:bg-white/10 text-white/30 hover:text-white/80 transition-colors"
              title="بوابة الشركة (مخفية)"
            >
              <Lock className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 relative overflow-y-auto hide-scrollbar">
          <AnimatePresence mode="wait">
            {isAdmin ? (
              <motion.div
                key="admin-view"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="h-full"
              >
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-rose-400">بوابة الشركة (لوحة التحكم)</h2>
                  <p className="text-gray-400 text-sm">هذه الواجهة مخصصة لموظفي الشركة فقط لإدارة قاعدة المعرفة والرد على العملاء.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
                  <div className="lg:col-span-4 h-full">
                    <KnowledgeBase files={files} setFiles={setFiles} />
                  </div>
                  <div className="lg:col-span-8 h-full">
                    <CustomerInteraction files={files} />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`customer-${activeTab}`}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <TabContent id={activeTab} files={files} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Navigation Bar (Only visible to customers) */}
      {!isAdmin && (
        <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4">
          <nav className="flex items-center gap-2 p-2 rounded-3xl bg-[#111111]/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-x-auto max-w-full hide-scrollbar">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3 rounded-2xl transition-colors whitespace-nowrap ${
                    isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-purple-500/20 rounded-2xl border border-white/10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className="w-5 h-5 relative z-10" />
                  <span className="font-medium text-sm relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

function TabContent({ id, files }: { id: string, files: UploadedFile[] }) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [customerFiles, setCustomerFiles] = useState<UploadedFile[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessage('');
    setIsSubmitted(false);
    setAiResponse('');
    setCustomerFiles([]);
  }, [id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsProcessingFiles(true);
    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < e.target.files.length; i++) {
      try {
        const processed = await processFile(e.target.files[i]);
        if (processed) newFiles.push(processed);
      } catch (err) {
        console.error("Error processing customer file:", err);
      }
    }
    setCustomerFiles(prev => [...prev, ...newFiles]);
    setIsProcessingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeCustomerFile = (fileId: string) => {
    setCustomerFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && customerFiles.length === 0) return;
    setIsSubmitting(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let promptText = `أنت مساعد ذكي لخدمة العملاء.
مهمتك هي الرد على رسالة العميل بناءً على قاعدة المعرفة المرفقة فقط.
إذا لم تجد الإجابة في قاعدة المعرفة، اعتذر بلباقة وأخبره أنك لا تملك هذه المعلومة ولا تخترع إجابة من عندك.
يجب أن ترد بنفس لغة العميل وبأسلوب احترافي وودود.

رسالة العميل:
"""
${message}
"""

قاعدة المعرفة:
`;
      const textFiles = files.filter((f) => f.isText);
      textFiles.forEach((f) => {
        promptText += `\n--- ملف من قاعدة المعرفة: ${f.name} ---\n${f.data}\n`;
      });

      const customerTextFiles = customerFiles.filter((f) => f.isText);
      if (customerTextFiles.length > 0) {
        promptText += `\n\n--- المستندات المرفقة من العميل ---\n`;
        customerTextFiles.forEach((f) => {
          promptText += `\n--- ملف: ${f.name} ---\n${f.data}\n`;
        });
      }

      const parts: any[] = [{ text: promptText }];

      const base64Files = files.filter((f) => !f.isText);
      base64Files.forEach((f) => {
        parts.push({
          inlineData: {
            data: f.data,
            mimeType: f.type,
          },
        });
      });

      const customerBase64Files = customerFiles.filter((f) => !f.isText);
      customerBase64Files.forEach((f) => {
        parts.push({
          inlineData: {
            data: f.data,
            mimeType: f.type,
          },
        });
      });

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: { parts },
      });

      setIsSubmitting(false);
      setIsSubmitted(true);
      setAiResponse("");

      for await (const chunk of responseStream) {
        if (chunk.text) {
          setAiResponse((prev) => prev + chunk.text);
        }
      }
    } catch (err) {
      console.error("Error generating response:", err);
      setAiResponse("عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.");
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  const contentMap: Record<string, { title: string, desc: string, color: string }> = {
    order: {
      title: "تقديم طلب جديد",
      desc: "ابدأ رحلتك معنا بتقديم طلبك بكل سهولة ويسر.",
      color: "from-teal-500 to-emerald-500"
    },
    inquiries: {
      title: "الاستفسارات الشائعة",
      desc: "ابحث عن إجابات لأسئلتك أو اطرح استفساراً جديداً.",
      color: "from-blue-500 to-cyan-500"
    },
    complaint: {
      title: "تقديم شكوى",
      desc: "نحن هنا لسماعك. قدم شكواك وسنقوم بمعالجتها فوراً.",
      color: "from-rose-500 to-orange-500"
    },
    review: {
      title: "مراجعة الطلب",
      desc: "تتبع حالة طلبك وتعرف على آخر التحديثات.",
      color: "from-purple-500 to-indigo-500"
    },
    support: {
      title: "خدمة العملاء",
      desc: "تحدث مع أحد ممثلينا مباشرة للحصول على المساعدة.",
      color: "from-amber-500 to-orange-500"
    }
  };

  const content = contentMap[id] || contentMap.order;

  return (
    <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
      <div className={`w-24 h-24 mb-8 rounded-3xl bg-gradient-to-br ${content.color} p-[2px] mx-auto shadow-2xl overflow-hidden`}>
        <div className="w-full h-full bg-[#111] rounded-[22px] flex items-center justify-center relative">
          <div className={`absolute inset-0 bg-gradient-to-br ${content.color} opacity-20`} />
          <Sparkles className="w-10 h-10 text-white relative z-10" />
        </div>
      </div>
      <h2 className="text-4xl font-bold mb-4 text-white">{content.title}</h2>
      <p className="text-lg text-gray-400 mb-10">{content.desc}</p>
      
      <div className="w-full p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
        {isSubmitted ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">رد المساعد الذكي</h3>
            <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-right mb-6 max-h-[300px] overflow-y-auto hide-scrollbar">
              <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
            </div>
            <button 
              onClick={() => setIsSubmitted(false)}
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors font-medium"
            >
              إرسال رسالة أخرى
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-right">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">
                تفاصيل {content.title.replace('تقديم ', '')}
              </label>
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا بوضوح..."
                  className="w-full h-32 p-4 pb-12 rounded-2xl bg-black/40 border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none transition-all"
                  dir="rtl"
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingFiles}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    title="إرفاق مستند (PDF, Word, Excel, إلخ)"
                  >
                    {isProcessingFiles ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Paperclip className="w-5 h-5" />
                    )}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    multiple 
                  />
                </div>
              </div>

              {customerFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {customerFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-medium border border-white/5">
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button 
                        type="button" 
                        onClick={() => removeCustomerFile(file.id)}
                        className="text-gray-400 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={(!message.trim() && customerFiles.length === 0) || isSubmitting || isProcessingFiles}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${
                (!message.trim() && customerFiles.length === 0) || isSubmitting || isProcessingFiles
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed' 
                  : `bg-gradient-to-r ${content.color} text-white shadow-lg hover:opacity-90 hover:scale-[1.02]`
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 rtl:-scale-x-100" />
                  <span>إرسال</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
