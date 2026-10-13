const DB_NAME="glyph-rush";
const DB_VERSION=1;
const STORE="documents";
let dbPromise;
export function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return dbPromise;
}
function requestToPromise(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function getAllDocuments(){const db=await openDb();return requestToPromise(db.transaction(STORE,"readonly").objectStore(STORE).getAll());}
export async function getDocument(id){const db=await openDb();return requestToPromise(db.transaction(STORE,"readonly").objectStore(STORE).get(id));}
export async function putDocument(doc){const db=await openDb();await requestToPromise(db.transaction(STORE,"readwrite").objectStore(STORE).put(doc));return doc;}
export async function deleteDocument(id){const db=await openDb();await requestToPromise(db.transaction(STORE,"readwrite").objectStore(STORE).delete(id));}
export async function clearDocuments(){const db=await openDb();await requestToPromise(db.transaction(STORE,"readwrite").objectStore(STORE).clear());}
export async function replaceAllDocuments(docs){await clearDocuments();for(const doc of docs)await putDocument(doc);}
