import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const chatCompletion = await groq.chat.completions.create({
      // Модель Llama 3.3 70B — очень мощная и бесплатная на Groq
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    const reply = chatCompletion.choices[0]?.message?.content || "";

    return NextResponse.json({ text: reply });
  } catch (error) {
    console.error("Groq API Error:", error);
    return NextResponse.json({ error: "Ошибка на стороне сервера" }, { status: 500 });
  }
}