
import { GoogleGenAI } from "@google/genai";
import { Habit } from "../types";
import { MONTHS } from "../constants";

export const getCoachInsights = async (
  habits: Habit[], 
  progress: number, 
  reflection: { wins: string, improvements: string },
  monthIndex: number
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const monthName = MONTHS[monthIndex];
  const habitSummary = habits.map(h => {
    const monthData = h.data[monthIndex];
    const completed = monthData.filter(Boolean).length;
    const total = monthData.length;
    return `${h.name} (${h.category}): ${completed}/${total} days`;
  }).join('\n');

  const prompt = `
    Act as a world-class Data Analyst and Productivity Coach. 
    Analyze the following habit tracking data for ${monthName} 2026:
    
    Overall Completion: ${progress.toFixed(1)}%
    
    Individual Habit Performance:
    ${habitSummary}
    
    User Reflection:
    Wins: ${reflection.wins || "None listed"}
    Improvements: ${reflection.improvements || "None listed"}
    
    Please provide:
    1. A concise analysis of their performance.
    2. Identification of the 'weakest link' category.
    3. Three high-impact, actionable coaching tips to maintain momentum.
    4. A motivational closing statement.
    
    Keep the tone professional, encouraging, and data-driven. Return as Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Coach error:", error);
    return "I'm having trouble analyzing your data right now. Keep pushing forward—consistency is key!";
  }
};
