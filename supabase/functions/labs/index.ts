import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';
import { GatewayError } from 'npm:@lovable.dev/ai-gateway@0.1.11';
import { completion, TextMessage } from '../_shared/ai.ts';
import { isCodingModel } from '../_shared/modelCatalog.ts';
const schema = z.object({ jobId: z.string().uuid(), projectId: z.string().uuid(), prompt: z.string().trim().min(1).max(8000), model: z.string().refine(isCodingModel) });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: {...corsHeaders, 'Content-Type':'application/json'}});
const SYSTEM_PROMPT = `You are Ares Labs — a senior staff engineer that builds and modifies web apps as a SINGLE self-contained HTML document.

HARD RULES:
- Return JSON with exactly two string fields: html (complete HTML) and summary.
- The HTML must include <!doctype html>, <html>, <head>, <body>, all CSS in <style>, all JS in <script>.
- Use Tailwind via the CDN script: <script src="https://cdn.tailwindcss.com"></script>.
- Prefer vanilla JS or React via esm.sh (e.g. import React from "https://esm.sh/react@18") in a <script type="module">.
- The app MUST run inside an <iframe> with no network/back-end. No fetch to private APIs. No localStorage requirement.
- Modern, clean, production-ready UI. Responsive. Accessible. Smooth interactions.
- When the user asks for a CHANGE, modify the prior HTML — keep what works, change what they asked for.
- Keep the document under ~120KB. No giant base64 images. Use inline SVG for graphics; do not hotlink stock images.
- The \`summary\` field is one short sentence describing what changed. No filler.

If the user request is ambiguous, make a confident, tasteful choice and ship it. No clarifying questions.`;


Deno.serve(async req => {
 if(req.method === 'OPTIONS') return new Response(null,{headers:corsHeaders});
 try {
  const token=(req.headers.get('Authorization')??'').replace(/^Bearer /,'');
  const url=Deno.env.get('SUPABASE_URL'); const anon=Deno.env.get('SUPABASE_ANON_KEY'); const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!service) return json({error:'Labs service unavailable'},503);
  const auth=createClient(url,anon); const {data:u}=await auth.auth.getUser(token);
  if(!u.user) return json({error:'Please sign in'},401);
  const parsed=schema.safeParse(await req.json()); if(!parsed.success) return json({error:'Invalid Labs request'},400);
  const {jobId,projectId,prompt,model}=parsed.data; const db=createClient(url,service);
  const {data:project}=await db.from('labs_projects').select('*').eq('id',projectId).eq('user_id',u.user.id).single();
  if(!project) return json({error:'Project not found'},404);
  const {data:existing}=await db.from('labs_jobs').select('id,status').eq('id',jobId).eq('user_id',u.user.id).maybeSingle();
  if(existing) return json({job:existing},202);
  // Expired executions are never replayed: their inference outcome may be unknown.
  await db.from('labs_jobs').update({status:'failed',error:'Build interrupted. Check the project before starting a new request.'}).eq('project_id',projectId).eq('status','running').lt('lease_until',new Date().toISOString());
  const {data:job,error}=await db.from('labs_jobs').insert({id:jobId,project_id:projectId,user_id:u.user.id,prompt,model,status:'running'}).select().single();
  if(error) return json({error:'This project already has a build running.'},409);
  const work=async()=>{
   try {
    const {data:state}=await db.from('labs_jobs').select('status').eq('id',jobId).single();
    if(state?.status!=='running') return;
    const history=z.array(z.object({role:z.enum(['user','assistant']),content:z.string()})).safeParse(project.turns);
    const turns=history.success?history.data.slice(-30):[];
    const messages:TextMessage[]=[{role:'system',content:SYSTEM_PROMPT},...turns,{role:'user',content:`CURRENT HTML:\n${project.html.slice(0,200000)}\nREQUEST:\n${prompt}\nReturn JSON {"html":"...","summary":"..."}.`}];
    let content='';
    if(model.startsWith('groq/')) {
     const key=Deno.env.get('GROQ_API_KEY'); if(!key) throw new Error('Groq is not configured');
     const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:model.slice(5),messages,response_format:{type:'json_object'}})});
     if(!res.ok){const details=await res.text();console.error('Labs Groq',res.status,details);const failure=Object.assign(new Error(`Groq request failed [${res.status}]`),{status:res.status});throw failure;}
     content=(await res.json()).choices?.[0]?.message?.content??'';
    } else { const result=await completion(model,messages); content=result.choices?.[0]?.message?.content??''; }
    const result=z.object({html:z.string().min(1).max(250000),summary:z.string().min(1)}).parse(JSON.parse(content));
    if(!/<html[\s>]/i.test(result.html)) throw new Error('The model did not return a complete app');
    const nextTurns=[...turns,{role:'user',content:prompt},{role:'assistant',content:result.summary}];
    const {error:saveError}=await db.from('labs_projects').update({html:result.html,turns:nextTurns,model,updated_at:new Date().toISOString()}).eq('id',projectId).eq('user_id',u.user.id);
    if(saveError) throw saveError;
    const {error:jobError}=await db.from('labs_jobs').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',jobId).eq('status','running');
    if(jobError) throw jobError;
   } catch(e) {
    const status=e instanceof GatewayError?e.httpStatus:(e instanceof Error&&'status' in e?Number(e.status):500);
    const message=e instanceof Error?e.message:'Build failed'; console.error('Labs job failed',jobId,message);
    await db.from('labs_jobs').update({status:[402,403,429].includes(status??500)?'paused':'failed',error:message,completed_at:new Date().toISOString()}).eq('id',jobId);
   }
  };
  EdgeRuntime.waitUntil(work());
  return json({job},202);
 } catch(e){console.error('Labs',e);return json({error:'Labs request failed'},500);}
});
