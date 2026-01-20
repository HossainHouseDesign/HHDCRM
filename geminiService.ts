import { GoogleGenAI, Type } from "@google/genai";
import { Lead, LeadAIAnalysis } from "./types";

export const analyzeLead = async (lead: Lead): Promise<LeadAIAnalysis> => {
  // Use named parameter and direct process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analyze this architectural lead for a house design firm in Bangladesh.
    Lead Context:
    - Client Name: ${lead.client_name}
    - Location: ${lead.address}
    - Land Area: ${lead.land_area}
    
    Technical Brief:
    - Foundation: ${lead.foundation}
    - Units/Floor: ${lead.unit_count}
    - Bedrooms: ${lead.bedroom_count}
    - Bathrooms: ${lead.bathroom_count}
    - Stair: ${lead.stair_details}
    
    Financials:
    - Package: ${lead.package}
    - Client's Budget: ${lead.budget}
    - Firm's Asking Fee: BDT ${lead.asking_fee}
    
    - Source: ${lead.social_media}
    - Notes: ${lead.notes}

    Task: Provide a professional summary, feasibility score (comparing rooms/foundation/budget vs fee), and a technical design strategy. 
    Assess if the client's budget aligns with their technical requirements and our asking fee.
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
            summary: { type: Type.STRING, description: "A concise executive summary." },
            feasibility_score: { type: Type.NUMBER, description: "0-100 score based on fee vs technical requirements." },
            brief: { type: Type.STRING, description: "Technical strategy for the architect." },
            priority_score: { type: Type.NUMBER, description: "0-100 conversion priority." },
            proposal_text: { type: Type.STRING, description: "WhatsApp proposal draft." },
          },
          required: ["summary", "feasibility_score", "brief", "priority_score", "proposal_text"],
        },
      },
    });

    // Access the .text property directly (not a method) as per guidelines
    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error("AI analysis offline.");
  }
};