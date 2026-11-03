import type {} from './generated/models.d.ts';
import { generateChatCompletion, streamChatCompletion } from 'npm:@lovable.dev/ai-gateway@0.1.11';

export type TextMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export function completion(model: string, messages: TextMessage[]) {
  if (model === 'openai/gpt-5.5') return generateChatCompletion({ model: 'openai/gpt-5.5', messages, response_format: { type: 'json_object' } });
  if (model === 'google/gemini-3.1-pro-preview') return generateChatCompletion({ model: 'google/gemini-3.1-pro-preview', messages, response_format: { type: 'json_object' } });
  return generateChatCompletion({ model: 'google/gemini-3-flash-preview', messages, response_format: { type: 'json_object' } });
}

export function textStream(model: string, messages: TextMessage[]) {
  if (model === 'openai/gpt-5.5') return streamChatCompletion({ model: 'openai/gpt-5.5', messages });
  if (model === 'google/gemini-3.1-pro-preview') return streamChatCompletion({ model: 'google/gemini-3.1-pro-preview', messages });
  return streamChatCompletion({ model: 'google/gemini-3-flash-preview', messages });
}