
import { GoogleGenAI, Type } from "@google/genai";
import { Lead, LeadAIAnalysis } from "./types";

export const analyzeLead = async (lead: Lead): Promise<LeadAIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analyze this architectural lead for a high-end house design firm.
    
    Lead Technical Profile:
    - Client: ${lead.client_name}
    - Location: ${lead.address}, ${lead.upazila}
    - Land Area: ${lead.land_area}
    - Foundation Requirement: ${lead.foundation}
    - Desired Units: ${lead.unit_count}
    - Design Package: ${lead.package}
    - Proposed Fee: BDT ${lead.asking_fee}
    - Client Budget: ${lead.budget}
    - Technical Notes: ${lead.notes || "None provided"}

    Assess the following:
    1. Feasibility: Is the foundation and unit count realistic for the land area?
    2. Financial Alignment: Does our asking fee align with the client's budget?
    3. Design Strategy: Suggest a core architectural concept (e.g., Sustainable Minimalist, Neoclassical, etc.).
    4. Priority: How likely is this to convert based on the detail provided?

    Return the analysis in a structured JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Executive summary of the lead." },
            feasibility_score: { type: Type.NUMBER, description: "0-100 technical feasibility score." },
            brief: { type: Type.STRING, description: "Detailed design brief and strategy for the architect." },
            priority_score: { type: Type.NUMBER, description: "0-100 conversion priority." },
            proposal_text: { type: Type.STRING, description: "A professional WhatsApp/Email draft for initial engagement." },
          },
          required: ["summary", "feasibility_score", "brief", "priority_score", "proposal_text"],
        },
      },
    });

    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error("Lead Analysis Service is currently processing high volume. Please try again.");
  }
};
