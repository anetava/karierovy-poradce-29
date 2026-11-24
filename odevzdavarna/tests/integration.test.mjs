import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,writeBatch,serverTimestamp,setLogLevel} from 'firebase/firestore';
import {getApps,deleteApp,getApp} from 'firebase/app';
import {getAuth,signInWithCredential,GoogleAuthProvider} from 'firebase/auth';
import {createAuditStore,normalizeRecord,summarize,TEACHER_EMAIL} from '../src/store.js';
import {createDelivery,parseBackup,submissionName,submissionInfo} from '../src/core.js';
let env;const ROOT='courses/pravni-audit-ai/students';
before(async()=>{assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8080');assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');setLogLevel('silent');env=await initializeTestEnvironment({projectId:'demo-pravni-audit',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firebase/firestore.rules','utf8')}});await env.clearFirestore();});
after(async()=>{await env.cleanup();await Promise.all(getApps().map(deleteApp));});
const owner=()=>env.authenticatedContext('owner',{email:TEACHER_EMAIL,email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore();
test('50 simultaneous senders deliver ten cases each under unchanged production rules', {timeout:120000}, async()=>{
 const start=Date.now();
 await Promise.all(Array.from({length:50},async(_,n)=>{
  const uid='load-'+n,db=env.authenticatedContext(uid,{firebase:{sign_in_provider:'anonymous'}}).firestore();
  await setDoc(doc(db,ROOT,uid),{displayName:submissionName('Test '+n,10),joinedAt:serverTimestamp(),noticeVersion:'2026-11-23',lastSavedAt:null,lastCaseId:null,caseSummaries:{}});
  for(let i=0;i<10;i++){
   const id=String(i),mutation=randomUUID(),record=normalizeRecord({ai:`Student ${n}, případ ${i}`}),time=serverTimestamp(),batch=writeBatch(db);
   batch.set(doc(db,ROOT,uid,'cases',id),{record,revision:1,lastMutationId:mutation,savedAt:time});
   batch.set(doc(db,ROOT,uid,'cases',id,'history',mutation),{record,revision:1,baseRevision:0,mutationId:mutation,savedAt:time});
   batch.update(doc(db,ROOT,uid),{lastCaseId:id,lastSavedAt:time,[`caseSummaries.${id}`]:summarize(record,1,time)});
   await batch.commit();
  }
 }));
 const roster=await getDocs(collection(owner(),ROOT));assert.equal(roster.size,50);for(const p of roster.docs){assert.equal(submissionInfo({...p.data(),caseSummaries:Object.fromEntries(Object.entries(p.data().caseSummaries).map(([id,s])=>[id,{...s,savedAt:s.savedAt.toDate().toISOString()}]))}).complete,true);}
 console.log(`50 senders / 500 case submissions: ${Date.now()-start} ms (emulator)`);
});
test('a sender cannot list or read another delivery, and an unrelated Google user cannot read',async()=>{
 const db=env.authenticatedContext('load-0',{firebase:{sign_in_provider:'anonymous'}}).firestore();
 await assertFails(getDocs(collection(db,ROOT)));await assertFails(getDoc(doc(db,ROOT,'load-1','cases','0')));
 const other=env.authenticatedContext('other',{email:'other@example.org',email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore();await assertFails(getDocs(collection(other,ROOT)));
 const publicDb=env.unauthenticatedContext().firestore();await assertFails(getDoc(doc(publicDb,ROOT,'load-0','cases','0')));
});
test('real submission adapter sends once; authorized teacher reads it; sign-out closes access',async()=>{
 const store=createAuditStore({emulator:true,projectId:'demo-pravni-audit',apiKey:'local-demo-key',appId:'local-demo-app',authDomain:'demo-pravni-audit.firebaseapp.com'},{hostname:'127.0.0.1'});
 const payload=parseBackup(JSON.stringify({app:'pravni-audit-ai',version:2,records:{0:{ai:'Práce z odevzdávárny'},9:{advice:'Doporučení'}}}));
 const delivery=createDelivery(store,payload,'Nováková',randomUUID);const receipt=await delivery.send();assert.equal(receipt.count,2);assert.deepEqual(await delivery.send(),receipt);
 assert.equal(getApps().some(a=>a.name==='audit-student'),false,'Existing student app is untouched');
 await assert.rejects(store.studentDetails(receipt.id),{code:'TEACHER_SIGN_IN_REQUIRED'});
 const auth=getAuth(getApp('audit-teacher'));
 await signInWithCredential(auth,GoogleAuthProvider.credential(JSON.stringify({sub:randomUUID(),email:TEACHER_EMAIL,email_verified:true})));
 const result=await store.studentDetails(receipt.id);assert.equal(result.records[0].record.ai,'Práce z odevzdávárny');assert.equal(submissionInfo(result.student).complete,true);
 assert.equal((await store.caseHistory(receipt.id,0)).length,1);
 await store.teacherSignOut();await assert.rejects(store.studentDetails(receipt.id),{code:'TEACHER_SIGN_IN_REQUIRED'});await store.forget();
});
