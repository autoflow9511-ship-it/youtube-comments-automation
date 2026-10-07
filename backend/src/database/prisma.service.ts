import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MongoClient, Db, Collection, Filter, Sort, UpdateFilter } from 'mongodb';
import { randomUUID } from 'crypto';

type Query = any;
type ModelName = string;

const COLLECTIONS: Record<string,string> = {
  user:'users', apiKey:'api_keys', channel:'channels', automation:'automations',
  automationAction:'automation_actions', automationExecution:'automation_executions',
  actionExecution:'action_executions', comment:'comments', commentReply:'comment_replies',
  emailCapture:'email_captures', emailSequence:'email_sequences', emailSequenceStep:'email_sequence_steps',
  emailEnrollment:'email_enrollments', emailLog:'email_logs', landingPage:'landing_pages',
  landingPageSubmission:'landing_page_submissions', video:'videos', formSubmission:'form_submissions',
  webhookEvent:'webhook_events', analyticsEvent:'analytics_events', notification:'notifications',
  auditLog:'audit_logs', systemConfig:'system_configs',
};

const PARENT_RELATIONS: Record<string,Record<string,string>> = {
  user:{channels:'channel',automations:'automation',emailCaptures:'emailCapture',emailSequences:'emailSequence',landingPages:'landingPage',notifications:'notification',apiKeys:'apiKey',emailLogs:'emailLog',analyticsEvents:'analyticsEvent',videos:'video',formSubmissions:'formSubmission',auditLogs:'auditLog',performedAudits:'auditLog'},
  channel:{automations:'automation',comments:'comment',webhookEvents:'webhookEvent',emailCaptures:'emailCapture',landingPages:'landingPage',analyticsEvents:'analyticsEvent',videos:'video',formSubmissions:'formSubmission',user:'user'},
  automation:{actions:'automationAction',executions:'automationExecution',emailCaptures:'emailCapture',analyticsEvents:'analyticsEvent',formSubmissions:'formSubmission',channel:'channel',user:'user'},
  automationAction:{executions:'actionExecution',automation:'automation'},
  automationExecution:{actions:'actionExecution',automation:'automation',triggerComment:'comment'},
  actionExecution:{execution:'automationExecution',action:'automationAction'},
  comment:{replies:'commentReply',channel:'channel',automationExecution:'automationExecution',formSubmissions:'formSubmission'},
  commentReply:{comment:'comment'},
  emailCapture:{emailLogs:'emailLog',enrollments:'emailEnrollment',formSubmissions:'formSubmission',user:'user',channel:'channel',automation:'automation',landingPage:'landingPage',landingPageSubmissions:'landingPageSubmission'},
  emailSequence:{steps:'emailSequenceStep',enrollments:'emailEnrollment',user:'user'},
  emailSequenceStep:{sequence:'emailSequence',logs:'emailLog'},
  emailEnrollment:{sequence:'emailSequence',emailCapture:'emailCapture',logs:'emailLog'},
  emailLog:{user:'user',emailCapture:'emailCapture',enrollment:'emailEnrollment',sequenceStep:'emailSequenceStep',formSubmission:'formSubmission'},
  landingPage:{submissions:'landingPageSubmission',emailCaptures:'emailCapture',formSubmissions:'formSubmission',user:'user',channel:'channel'},
  landingPageSubmission:{landingPage:'landingPage',emailCapture:'emailCapture'},
  video:{user:'user',channel:'channel',formSubmissions:'formSubmission'},
  formSubmission:{user:'user',automation:'automation',form:'landingPage',channel:'channel',video:'video',comment:'comment',emailCapture:'emailCapture',emailLog:'emailLog'},
  webhookEvent:{channel:'channel'},
  analyticsEvent:{user:'user',channel:'channel',automation:'automation'},
  notification:{user:'user'},
  auditLog:{user:'user',admin:'user'},
  systemConfig:{},
};

const FK: Record<string,string> = {
  channel:'channelId', automation:'automationId', automationAction:'automationId',
  automationExecution:'automationId', actionExecution:'executionId', comment:'commentId',
  commentReply:'commentId', emailCapture:'emailCaptureId', emailSequenceStep:'sequenceId',
  emailEnrollment:'sequenceId', emailLog:'userId', landingPage:'landingPageId',
  landingPageSubmission:'landingPageId', video:'channelId', formSubmission:'automationId',
  webhookEvent:'channelId', analyticsEvent:'userId', notification:'userId', auditLog:'userId',
};

function idOf(v:any){ return v?.id ?? v?._id; }
function clone(v:any){ return v==null ? v : structuredClone(v); }

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger=new Logger(PrismaService.name);
  private client!: MongoClient;
  private db!: Db;
  private models: Record<string,MongoModel>={};

  async onModuleInit(){
    const uri=process.env.MONGODB_URI;
    if(!uri) throw new Error('MONGODB_URI is required');
    this.client=new MongoClient(uri);
    await this.client.connect();
    this.db=this.client.db();
    for(const name of Object.keys(COLLECTIONS)) this.models[name]=new MongoModel(this,name);
    await this.ensureIndexes();
    this.logger.log('MongoDB connected successfully');
  }
  async onModuleDestroy(){ if(this.client) await this.client.close(); }
  getModel(name:string){ return this.models[name] || (this.models[name]=new MongoModel(this,name)); }
  [key:string]: any;
  private async ensureIndexes(){
    const indexes=[
      ['user',{email:1},{unique:true}],['channel',{youtubeChannelId:1},{unique:true}],['landingPage',{slug:1},{unique:true}],
      ['comment',{youtubeCommentId:1},{unique:true}],['video',{youtubeVideoId:1},{unique:true}],
      ['emailCapture',{userId:1,email:1},{unique:true}],['systemConfig',{key:1},{unique:true}],
      ['automationExecution',{triggerCommentId:1},{unique:true,sparse:true}],['emailEnrollment',{sequenceId:1,emailCaptureId:1},{unique:true}],
    ];
    for(const [m,key,opt] of indexes) try{await this.getCollection(m as string).createIndex(key as any,opt as any);}catch{}
    try{await this.getCollection('formSubmission').createIndex({automationId:1,email:1,videoId:1},{unique:true,sparse:true});}catch{}
  }
  getCollection(name:string):Collection{ return this.db.collection(COLLECTIONS[name]||name); }
  async resolveWhere(model:string, where:any):Promise<any>{
    if(!where) return {};
    const out:any={};
    for(const [k,v] of Object.entries(where)){
      if(k==='AND'){out.$and=await Promise.all((v as any[]).map(x=>this.resolveWhere(model,x)));continue;}
      if(k==='OR'){out.$or=await Promise.all((v as any[]).map(x=>this.resolveWhere(model,x)));continue;}
      if(k==='NOT'){out.$nor=await Promise.all((v as any[]).map(x=>this.resolveWhere(model,x)));continue;}
      const rel=PARENT_RELATIONS[model]?.[k];
      if(rel && v && typeof v==='object' && !Array.isArray(v)){
        const foreign=FK[model] || (model==='auditLog'&&k==='admin'?'adminId':undefined);
        if(foreign){
          const ids=await this.getModel(rel).findMany({where:v,select:{id:true}});
          out[foreign]={$in:ids.map((x:any)=>x.id)};
        }
      } else out[k]=this.translateFilter(v);
    }
    return out;
  }
  translateFilter(v:any):any{
    if(v===null || typeof v!=='object' || Array.isArray(v)) return v;
    const o:any={};
    for(const [k,val] of Object.entries(v)){
      const nk={contains:'$regex',startsWith:'$regex',endsWith:'$regex',gte:'$gte',gt:'$gt',lte:'$lte',lt:'$lt',in:'$in',notIn:'$nin',not:'$ne',equals:'$eq',hasSome:'$in',hasEvery:'$all'}[k]||k;
      if(k==='contains'||k==='startsWith'||k==='endsWith'){o[nk]=new RegExp((k==='startsWith'?'^':'')+String(val).replace(/[.*+?^{}()|[\]\\]/g,'\\$&')+(k==='endsWith'?'$':''),'i');}
      else if(k==='mode') continue; else if(k==='has') return val; else if(k==='not'&&val===null)o.$ne=null; else o[nk]=this.translateFilter(val);
    }
    return o;
  }
  getModels(){return this.models;}
}

class MongoModel {
  constructor(private db:PrismaService, private name:ModelName){}
  private col(){return this.db.getCollection(this.name);}
  private async where(w:any){return this.db.resolveWhere(this.name,w||{});}
  private projection(sel:any){ if(!sel) return undefined; const p:any={}; for(const [k,v] of Object.entries(sel)){if(k==='_count')continue;if(v===true)p[k]=1;} return Object.keys(p).length?p:undefined;}
  private async related(doc:any,key:string,conf:any){
    const rel=PARENT_RELATIONS[this.name]?.[key]; if(!rel)return undefined;
    const fk=(this.name==='auditLog'&&key==='admin')?'adminId':this.name==='automationExecution'&&key==='triggerComment'?'triggerCommentId':FK[this.name];
    if(!fk)return undefined;
    const targetId=doc[fk];
    const base=conf===true?{}:(conf||{});
    if(Array.isArray(targetId)) return this.db.getModel(rel).findMany({where:{id:{$in:targetId}},...base});
    if(targetId==null)return null;
    return this.db.getModel(rel).findUnique({where:{id:targetId},...base});
  }
  private async hydrate(doc:any,opt:any):Promise<any>{
    if(!doc)return doc;
    const out=clone(doc);
    if(opt?.select){const p=this.projection(opt.select); if(p){for(const k of Object.keys(out))if(!(p as any)[k]&&k!=='id')delete out[k];} }
    if(opt?.include){
      for(const [k,c] of Object.entries(opt.include as any)){
        if(k==='_count'){
          out._count={};
          for(const [rk,rc] of Object.entries((c as any).select||{})){const rel=PARENT_RELATIONS[this.name]?.[rk]; if(rel){const fk=FK[this.name]; out._count[rk]=fk?await this.db.getModel(rel).count({where:{[fk]:out.id}}):0;}}
        } else out[k]=await this.related(out,k,c);
      }
    }
    return out;
  }
  async findUnique(o:Query={}){const w=await this.where(o.where||{});const d=await this.col().findOne(w,{projection:this.projection(o.select)});return this.hydrate(d,o);}
  async findFirst(o:Query={}){const w=await this.where(o.where||{});let c=this.col().find(w);if(o.orderBy)c=c.sort(this.sort(o.orderBy));if(o.skip)c=c.skip(o.skip);const d=await c.limit(1).next();return this.hydrate(d,o);}
  async findMany(o:Query={}){const w=await this.where(o.where||{});let c=this.col().find(w);if(o.orderBy)c=c.sort(this.sort(o.orderBy));if(o.skip)c=c.skip(o.skip);if(o.take)c=c.limit(o.take);const ds=await c.toArray();return Promise.all(ds.map(d=>this.hydrate(d,o)));}
  async count(o:Query={}){return this.col().countDocuments(await this.where(o.where||{}));}
  async create(o:Query={}){const d=await this.normalizeCreate(o.data||{});await this.col().insertOne(d);return this.hydrate(d,o);}
  async createMany(o:Query={}){const ds=await Promise.all((o.data||[]).map((d:any)=>this.normalizeCreate(d)));if(ds.length)await this.col().insertMany(ds);return {count:ds.length};}
  async update(o:Query={}){const w=await this.where(o.where||{});const u=this.buildUpdate(o.data||{});await this.col().updateOne(w,u);const d=await this.col().findOne(w);return this.hydrate(d,o);}
  async updateMany(o:Query={}){const w=await this.where(o.where||{});await this.col().updateMany(w,this.buildUpdate(o.data||{}));return {count:await this.col().countDocuments(w)};}
  async delete(o:Query={}){const w=await this.where(o.where||{});const d=await this.col().findOne(w);await this.col().deleteOne(w);return this.hydrate(d,o);}
  async deleteMany(o:Query={}){const w=await this.where(o.where||{});const r=await this.col().deleteMany(w);return {count:r.deletedCount};}
  async upsert(o:Query={}){const w=await this.where(o.where||{});const d=await this.normalizeCreate({...o.create});const u=this.buildUpdate(o.update||{});await this.col().updateOne(w,{$setOnInsert:d,...u},{upsert:true});const found=await this.col().findOne(w);return this.hydrate(found,o);}
  async groupBy(o:Query={}){const docs=await this.findMany({where:o.where});const groups=new Map<string,any>();for(const d of docs){const key=(o.by||[]).map((k:string)=>String(d[k])).join('|');if(!groups.has(key))groups.set(key,{...Object.fromEntries((o.by||[]).map((k:string)=>[k,d[k]])),_count:{}});const g=groups.get(key);for(const k of Object.keys(o._count||{}))g._count[k]=(g._count[k]||0)+1;}return [...groups.values()];}
  private sort(order:any):Sort{const s:any={};for(const [k,v] of Object.entries(order)){if(k==='_count')continue;s[k]=v==='desc'?-1:1;}return s;}
  private async normalizeCreate(data:any):Promise<any>{
    const d=clone(data); if(!d.id)d.id=randomUUID(); const now=new Date(); if(!d.createdAt)d.createdAt=now;if(!d.updatedAt)d.updatedAt=now;
    for(const [k,v] of Object.entries(d)){if(v&&typeof v==='object'&&'create' in (v as any)){const rel=PARENT_RELATIONS[this.name]?.[k];if(rel){const arr=Array.isArray((v as any).create)?(v as any).create:[(v as any).create];const created=[];for(const child of arr)created.push(await this.db.getModel(rel).create({data:{...child,[FK[rel]]:d.id}}));d[k]=created.map(x=>x.id);}}else if(v&&typeof v==='object'&&'createMany' in (v as any)){const rel=PARENT_RELATIONS[this.name]?.[k];if(rel){await this.db.getModel(rel).createMany({data:(v as any).createMany.data.map((x:any)=>({...x,[FK[rel]]:d.id}))});delete d[k];}}}
    return d;
  }
  private buildUpdate(data:any){const $set:any={},$unset:any={},$inc:any={},$addToSet:any={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(v===null)$unset[k]='';else if(v&&typeof v==='object'&&'increment' in (v as any))$inc[k]=Number((v as any).increment);else if(v&&typeof v==='object'&&'push' in (v as any))$addToSet[k]={$each:Array.isArray((v as any).push)?(v as any).push:[(v as any).push]};else $set[k]=v;}const u:any={};if(Object.keys($set).length)u.$set=$set;if(Object.keys($unset).length)u.$unset=$unset;if(Object.keys($inc).length)u.$inc=$inc;if(Object.keys($addToSet).length)u.$addToSet=$addToSet;return u;}
}
