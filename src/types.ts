export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // The extracted text OR the base64 string
  isText: boolean; // True if 'data' is plain text, false if it's base64 for Gemini
}

export interface AIResponse {
  analysis: {
    requestType: string;
    sentiment: string;
    summary: string;
  };
  response: {
    question: string;
    answer: string;
  }[];
  fullReply: string;
}
