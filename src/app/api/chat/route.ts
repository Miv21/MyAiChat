import { groq } from '@ai-sdk/groq';
import { streamText, convertToCoreMessages } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // 1. Получаем данные из запроса. 
    // Оставляем messages без явного указания CoreMessage[], чтобы избежать конфликта
    const { messages } = await req.json();

    // 2. Используем актуальную модель Llama 3.1
    const result = await streamText({
      model: groq('llama-3.1-8b-instant'),
      // convertToCoreMessages сама превратит входящие данные в нужный формат CoreMessage[]
      messages: convertToCoreMessages(messages),
    });

    // 3. Отправляем поток клиенту
    return result.toDataStreamResponse();
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("GROQ_SERVER_ERROR:", errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: "Ошибка сервера", 
        details: errorMessage 
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}