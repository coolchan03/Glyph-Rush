import {getAllDocuments,putDocument,deleteDocument,replaceAllDocuments} from "./db.js";
import {parseFile,cleanText} from "./parsers.js";
document.documentElement.dataset.glyphRushBoot="module-loaded";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const SAMPLE=["# Welcome to Glyph Rush","Glyph Rush helps you read quickly without pretending that faster is always better. Press Space to start or pause, and hold Space whenever you want to reveal the current sentence in context.","# Smart pacing","The reader slows slightly for punctuation, numbers, long words, quotations, and paragraph endings. Smart phrase mode keeps small groups of related words together instead of forcing every word through the screen alone.","# Learn, Read, or Skim","Learn mode emphasizes recall. Read mode balances pace and comprehension. Skim mode moves rapidly when you mainly need the gist. Your position, settings, bookmarks, saved passages, and library are stored automatically in this browser.","# Keyboard controls","Use the up and down arrow keys to change speed. Hold Shift for temporary slowdown. R rewinds about ten seconds, S repeats the sentence, and B adds a bookmark."].join("\n\n");
const presets={learn:{wpm:250,desc:"Prioritizes retention and recall.",checks:true},read:{wpm:375,desc:"Balances speed with comfortable understanding.",checks:false},skim:{wpm:650,desc:"Prioritizes rapid surveying and gist.",checks:false}};
const els={grid:$("#library-grid"),libraryStatus:$("#library-status"),file:$("#file-input"),fileStatus:$("#library-status"),pasteTitle:$("#paste-title"),pasteText:$("#paste-text"),addPaste:$("#add-paste"),exportBtn:$("#export-library"),importState:$("#import-library"),title:$("#doc-title"),meta:$("#doc-meta"),favorite:$("#favorite"),search:$("#search-doc"),searchNext:$("#search-next"),searchStatus:$("#search-status"),chapter:$("#chapter-select"),displayMode:$("#display-mode"),stage:$("#reading-stage"),display:$("#reader-display"),context:$("#reader-context"),peek:$("#context-peek"),peekText:$("#context-text"),goalBadge:$("#goal-badge"),state:$("#state-label"),position:$("#position-label"),progress:$("#progress-bar"),count:$("#word-count"),time:$("#time-left"),play:$("#play-pause"),rewind:$("#rewind-10"),prevSentence:$("#previous-sentence"),replay:$("#replay-sentence"),bookmark:$("#add-bookmark"),passage:$("#save-passage"),font:$("#font-select"),theme:$("#theme-select"),fastFix:$("#fast-fix"),smart:$("#smart-pauses"),ramp:$("#speed-ramp"),checks:$("#recall-checks"),autoPause:$("#auto-pause"),wpm:$("#wpm"),wpmLabel:$("#wpm-label"),goalDesc:$("#goal-description"),goalMinutes:$("#goal-minutes"),goalResult:$("#goal-result"),useGoal:$("#use-goal-speed"),bookmarkList:$("#bookmark-list"),bookmarkCount:$("#bookmark-count"),passageList:$("#passage-list"),passageCount:$("#passage-count"),focus:$("#focus-mode"),exitFocus:$("#exit-focus"),recall:$("#recall-card"),recallQ:$("#recall-question"),recallAnswers:$("#recall-answers"),recallFeedback:$("#recall-feedback"),continueBtn:$("#continue-reading"),toast:$("#toast")};
let docs=[],currentId=null,tokens=[],chapters=[],index=0,mode="learn",playing=false,timer=null,persistTimer=null,lastRamp=Date.now(),wordsSinceCheck=0,sectionStart=0,currentQuestion=null,speedMultiplier=1,spaceTimer=null,spaceHeld=false,spaceWasPlaying=false;
let session={words:0,activeMs:0,lastStart:null,checks:[],speedSamples:[],startedAt:Date.now()};
const escapeHtml=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const newId=()=>crypto.randomUUID?crypto.randomUUID():"doc-"+Date.now()+"-"+Math.random().toString(36).slice(2);
const current=()=>docs.find(d=>d.id===currentId)||null;
function isHeading(line){const t=line.trim();return /^#{1,6}\s+/.test(t)||/^chapter\s+[\divxlc]+\b/i.test(t)||/^\d+(?:\.\d+)*[.)]?\s+[A-Z]/.test(t)||(t.length>2&&t.length<70&&t===t.toUpperCase()&&/[A-Z]/.test(t));}
function tokenize(text){const out=[],heads=[];let wordIndex=0;cleanText(text).split(/\n\s*\n/).forEach((para,pi)=>{para.split("\n").forEach(line=>{if(isHeading(line))heads.push({title:line.replace(/^#{1,6}\s+/,""),index:wordIndex});const ws=line.trim().split(/\s+/).filter(Boolean);ws.forEach((word,wi)=>{out.push({word,para:pi,paraStart:wi===0,paraEnd:wi===ws.length-1});wordIndex++;});});});return{tokens:out,chapters:heads};}
function defaultDoc(name,text){return{id:newId(),name:name||"Untitled",text,progress:0,favorite:false,lastOpen:Date.now(),bookmarks:[],passages:[],settings:null,stats:{words:0,activeMs:0,checksCorrect:0,checksTotal:0}};}
function normalizeDoc(d){return{...defaultDoc(d.name||"Untitled",d.text||""),...d,bookmarks:Array.isArray(d.bookmarks)?d.bookmarks:[],passages:Array.isArray(d.passages)?d.passages:[],stats:{words:0,activeMs:0,checksCorrect:0,checksTotal:0,...(d.stats||{})}};}
function captureSettings(){return{mode,wpm:+els.wpm.value,display:els.displayMode.value,font:els.font.value,theme:els.theme.value,fastFix:els.fastFix.checked,smart:els.smart.checked,ramp:els.ramp.checked,checks:els.checks.checked,autoPause:els.autoPause.checked};}
async function persistCurrent(){const d=current();if(!d)return;d.progress=index;d.lastOpen=Date.now();d.settings=captureSettings();await putDocument(d);}
function schedulePersist(){clearTimeout(persistTimer);persistTimer=setTimeout(()=>persistCurrent().catch(console.error),250);}
function formatAgo(ts){const s=Math.max(1,Math.round((Date.now()-ts)/1000));if(s<60)return"just now";const m=Math.round(s/60);if(m<60)return m+"m ago";const h=Math.round(m/60);if(h<24)return h+"h ago";const d=Math.round(h/24);return d+"d ago";}
function toast(message){els.toast.textContent=message;els.toast.classList.remove("hidden");setTimeout(()=>els.toast.classList.add("hidden"),1800);}
function showTab(name){$$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));["library","reader","stats"].forEach(n=>$("#panel-"+n).classList.toggle("hidden",n!==name));if(name==="stats")updateStats();}
function renderLibrary(){
  els.grid.innerHTML="";
  const sorted=[...docs].sort((a,b)=>(Number(b.favorite)-Number(a.favorite))||(b.lastOpen-a.lastOpen));
  els.libraryStatus.textContent=docs.length+" document"+(docs.length===1?"":"s")+" saved in this browser.";
  for(const d of sorted){
    const parsed=tokenize(d.text),pct=parsed.tokens.length?Math.round((d.progress||0)/parsed.tokens.length*100):0;
    const card=document.createElement("article");card.className="library-card card";
    card.innerHTML='<div class="library-top"><div><h3>'+escapeHtml(d.name)+'</h3><p>'+parsed.tokens.length.toLocaleString()+" words · "+pct+"% · "+formatAgo(d.lastOpen)+'</p></div><button class="icon-button fav" title="Favorite">'+(d.favorite?"★":"☆")+'</button></div><div class="progress-track"><div style="width:'+pct+'%"></div></div><div class="library-actions"><button class="button primary open">'+(pct?"Resume":"Read")+'</button><button class="button delete">Remove</button></div>';
    card.querySelector(".open").addEventListener("click",()=>openDocument(d.id));
    card.querySelector(".fav").addEventListener("click",async()=>{d.favorite=!d.favorite;await putDocument(d);renderLibrary();});
    card.querySelector(".delete").addEventListener("click",async()=>{if(docs.length===1){toast("Keep at least one document in the library.");return;}await deleteDocument(d.id);docs=docs.filter(x=>x.id!==d.id);if(currentId===d.id)await openDocument(docs[0].id);renderLibrary();});
    els.grid.appendChild(card);
  }
}
function populateChapters(){els.chapter.innerHTML="";if(!chapters.length){els.chapter.disabled=true;els.chapter.add(new Option("No headings detected",""));return;}els.chapter.disabled=false;chapters.forEach((c,i)=>els.chapter.add(new Option(c.title,String(i))));}
function applyDocSettings(d){const s=d.settings||{};if(s.wpm)els.wpm.value=s.wpm;if(s.display)els.displayMode.value=s.display;if(s.font)els.font.value=s.font;if(s.theme)els.theme.value=s.theme;if(typeof s.fastFix==="boolean")els.fastFix.checked=s.fastFix;if(typeof s.smart==="boolean")els.smart.checked=s.smart;if(typeof s.ramp==="boolean")els.ramp.checked=s.ramp;if(typeof s.checks==="boolean")els.checks.checked=s.checks;if(typeof s.autoPause==="boolean")els.autoPause.checked=s.autoPause;document.body.dataset.theme=s.theme||"night";applyGoal(s.mode||"learn",false);}
async function openDocument(id){if(currentId&&currentId!==id)await persistCurrent();stop("Ready",false);currentId=id;const d=current();const parsed=tokenize(d.text);tokens=parsed.tokens;chapters=parsed.chapters;index=Math.min(d.progress||0,Math.max(0,tokens.length-1));wordsSinceCheck=0;sectionStart=index;applyDocSettings(d);populateChapters();renderSaved();renderLibrary();showTab("reader");render();}
function fontFamily(){return{fast:'"Fast Sans",Inter,system-ui,sans-serif',system:"Inter,system-ui,sans-serif",serif:"Georgia,Times New Roman,serif",mono:"ui-monospace,SFMono-Regular,Consolas,monospace"}[els.font.value];}
function sentenceBounds(at=index){if(!tokens.length)return[0,0];let a=Math.max(0,Math.min(at,tokens.length-1)),b=a;while(a>0&&!/[.!?][\"')\]]*$/.test(tokens[a-1].word))a--;while(b<tokens.length-1&&!/[.!?][\"')\]]*$/.test(tokens[b].word))b++;return[a,Math.min(tokens.length,b+1)];}
function sentenceText(at=index){const[a,b]=sentenceBounds(at);return tokens.slice(a,b).map(t=>t.word).join(" ");}
function paragraphBounds(at=index){if(!tokens.length)return[0,0];const p=tokens[Math.min(at,tokens.length-1)].para;let a=at,b=at;while(a>0&&tokens[a-1].para===p)a--;while(b<tokens.length&&tokens[b].para===p)b++;return[a,b];}
function smartChunk(){const style=els.displayMode.value;if(style==="word"||style==="traditional")return tokens.slice(index,index+1);const target=style==="line"?7:3,start=tokens[index],out=[];for(let i=index;i<tokens.length&&out.length<target;i++){const t=tokens[i];if(out.length&&t.para!==start.para)break;out.push(t);if(/[.!?;:][\"')\]]*$/.test(t.word))break;if(style==="phrase"&&out.length>=2&&/,[\"')\]]*$/.test(t.word))break;}return out;}
function fixationWord(word){
  if(els.font.value==="fast"||!els.fastFix.checked)return escapeHtml(word);
  const positions=[];
  [...word].forEach((c,i)=>{if(/[A-Za-z0-9]/.test(c))positions.push(i);});
  if(!positions.length)return escapeHtml(word);
  const n=positions.length,count=n<=3?1:n===4?2:Math.max(1,Math.round(n*.4)),cut=positions[Math.min(count-1,n-1)];
  return "<strong>"+escapeHtml(word.slice(0,cut+1))+"</strong>"+escapeHtml(word.slice(cut+1));
}
function render(){
  const d=current();
  if(!d||!tokens.length){els.display.textContent="No document";return;}
  index=Math.max(0,Math.min(index,tokens.length-1));
  els.display.style.fontFamily=fontFamily();
  const style=els.displayMode.value;
  if(style==="traditional"){
    const [a,b]=paragraphBounds(index);
    els.display.classList.add("traditional");
    els.display.innerHTML=tokens.slice(a,b).map((t,i)=>a+i===index?'<span class="current-word">'+fixationWord(t.word)+"</span>":fixationWord(t.word)).join(" ");
  }else{
    els.display.classList.remove("traditional");
    els.display.innerHTML=smartChunk().map(t=>fixationWord(t.word)).join(" ");
  }
  const c=smartChunk();
  const before=tokens.slice(Math.max(0,index-6),index).map(t=>t.word).join(" ");
  const after=tokens.slice(index+c.length,Math.min(tokens.length,index+c.length+6)).map(t=>t.word).join(" ");
  els.context.textContent=(before?before+"  •  ":"")+after;
  updateMeta();
}
function updateMeta(){
  const d=current();if(!d)return;
  const total=tokens.length,pct=total?Math.round(index/total*100):0,speed=+els.wpm.value||250;
  els.title.textContent=d.name;els.meta.textContent=total.toLocaleString()+" words · "+chapters.length+" headings · saved locally";
  els.favorite.textContent=d.favorite?"★":"☆";els.wpmLabel.textContent=speed;
  els.position.textContent=pct+"%";els.progress.style.width=pct+"%";
  els.count.textContent=(Math.min(index+1,total)).toLocaleString()+" / "+total.toLocaleString()+" words";
  const mins=Math.max(0,total-index)/speed;
  els.time.textContent=mins<1?"Remaining: "+Math.max(1,Math.ceil(mins*60))+" sec":"Remaining: "+mins.toFixed(mins<10?1:0)+" min";
  const goal=Math.max(1,+els.goalMinutes.value||20);
  const required=Math.max(100,Math.min(1200,Math.ceil((Math.max(0,total-index)/goal)/25)*25));
  els.goalResult.textContent="Required average: "+required+" WPM";
  updateStats();schedulePersist();
}
function smartFactor(chunk){
  if(!els.smart.checked)return 1;
  let factor=1;const words=chunk.map(t=>t.word),last=words[words.length-1]||"";
  if(/[.!?]["')\]]*$/.test(last))factor*=1.65;else if(/[,;:]["')\]]*$/.test(last))factor*=1.25;
  if(chunk[chunk.length-1]?.paraEnd)factor*=1.25;
  if(words.some(w=>/\d/.test(w)))factor*=1.15;
  if(words.some(w=>/[()]/.test(w)))factor*=1.1;
  if(words.some(w=>w.replace(/[^A-Za-z0-9]/g,"").length>=11))factor*=1.15;
  return factor;
}
function delayFor(chunk){const speed=Math.max(100,(+els.wpm.value||250)*speedMultiplier);return Math.max(55,(60000/speed)*Math.max(1,chunk.length)*smartFactor(chunk));}
function markStart(){if(session.lastStart==null)session.lastStart=performance.now();}
function markStop(){if(session.lastStart!=null){session.activeMs+=performance.now()-session.lastStart;session.lastStart=null;}}
function stop(reason="Paused",save=true){playing=false;if(timer)clearTimeout(timer);timer=null;markStop();els.play.textContent="▶ Resume";els.state.textContent=reason;if(save)schedulePersist();}
function play(){if(!tokens.length)return;if(index>=tokens.length-1)index=0;playing=true;markStart();els.play.textContent="❚❚ Pause";els.state.textContent=speedMultiplier<1?"Reading slowly":"Reading";tick();}
function toggle(){playing?stop("Paused"):play();}
function finish(){stop("Finished");index=Math.max(0,tokens.length-1);els.progress.style.width="100%";els.display.textContent="Done ✓";els.context.textContent="You reached the end of this document.";updateMeta();}
function tick(){
  if(!playing)return;
  if(index>=tokens.length){finish();return;}
  render();
  const chunk=smartChunk();
  timer=setTimeout(()=>{
    session.words+=chunk.length;session.speedSamples.push(+els.wpm.value||250);
    const d=current();d.stats.words+=chunk.length;
    index+=Math.max(1,chunk.length);wordsSinceCheck+=chunk.length;
    if(els.ramp.checked&&Date.now()-lastRamp>=60000){els.wpm.value=Math.min(1200,(+els.wpm.value||250)+25);lastRamp=Date.now();}
    if(mode==="learn"&&els.checks.checked&&wordsSinceCheck>=180&&index<tokens.length-20){showRecall();return;}
    if(index>=tokens.length){finish();return;}
    tick();
  },delayFor(chunk));
}
function rewindSeconds(sec){stop("Rewound",false);const back=Math.max(1,Math.round((+els.wpm.value||250)*sec/60));index=Math.max(0,index-back);render();}
function jumpSentence(previous=false){stop(previous?"Previous sentence":"Replay sentence",false);let [a]=sentenceBounds(index);if(previous&&a>0)[a]=sentenceBounds(a-1);index=a;render();}
function buildRecall(){
  const segment=tokens.slice(sectionStart,Math.min(index,tokens.length)).map(t=>t.word);
  const phrases=[];const stride=Math.max(4,Math.floor(segment.length/7));
  for(let i=0;i+2<segment.length;i+=stride){const p=segment.slice(i,i+3).join(" ").replace(/[^A-Za-z0-9 '\-]/g,"");if(p.length>8)phrases.push(p);}
  if(phrases.length<2)return null;
  const correct=phrases[Math.floor(phrases.length/2)],parts=correct.split(" ");
  const fake1=[...parts].reverse().join(" "),fake2=[parts[0],parts[2]||parts[0],parts[1]||""].join(" ").trim();
  return{correct,options:[correct,fake1,fake2,"none of these"].sort(()=>Math.random()-.5)};
}
function showRecall(){
  stop("Recall check");currentQuestion=buildRecall();wordsSinceCheck=0;sectionStart=index;
  if(!currentQuestion){play();return;}
  els.recallQ.textContent="Which phrase appeared in the section you just read?";
  els.recallAnswers.innerHTML="";els.recallFeedback.textContent="";els.continueBtn.classList.add("hidden");
  currentQuestion.options.forEach(opt=>{const b=document.createElement("button");b.className="button";b.textContent=opt;b.addEventListener("click",()=>answerRecall(opt,b));els.recallAnswers.appendChild(b);});
  els.recall.classList.remove("hidden");
}
function answerRecall(opt){
  if(!currentQuestion)return;
  const ok=opt===currentQuestion.correct,d=current();session.checks.push(ok);d.stats.checksTotal++;if(ok)d.stats.checksCorrect++;
  const next=Math.max(100,Math.min(1200,(+els.wpm.value||250)+(ok?25:-25)));els.wpm.value=next;
  [...els.recallAnswers.children].forEach(b=>{b.disabled=true;if(b.textContent===currentQuestion.correct)b.style.fontWeight="800";});
  els.recallFeedback.textContent=ok?"Correct — speed increased to "+next+" WPM.":"The matching phrase was “"+currentQuestion.correct+"”. Speed reduced to "+next+" WPM.";
  els.continueBtn.classList.remove("hidden");updateMeta();
}
function addBookmark(){
  const d=current();if(!d)return;
  const label=sentenceText(index).slice(0,140);
  if(!d.bookmarks.some(b=>b.index===index))d.bookmarks.push({index,label});
  renderSaved();schedulePersist();toast("Bookmark saved.");
}
function savePassage(){
  const d=current();if(!d)return;
  const text=sentenceText(index);
  if(!d.passages.some(p=>p.text===text))d.passages.push({index,text});
  renderSaved();schedulePersist();toast("Sentence saved.");
}
function savedRow(item,type,i){
  const row=document.createElement("div");row.className="saved-item";
  const jump=document.createElement("button");jump.className="button";jump.textContent=(i+1)+". "+(type==="bookmark"?item.label:item.text).slice(0,150);
  jump.addEventListener("click",()=>{stop(type==="bookmark"?"Bookmark":"Saved passage",false);index=item.index;render();showTab("reader");});
  const del=document.createElement("button");del.className="button";del.textContent="×";del.title="Remove";
  del.addEventListener("click",()=>{const d=current();d[type==="bookmark"?"bookmarks":"passages"]=d[type==="bookmark"?"bookmarks":"passages"].filter(x=>x!==item);renderSaved();schedulePersist();});
  row.append(jump,del);return row;
}
function renderSaved(){
  const d=current();if(!d)return;
  els.bookmarkCount.textContent=d.bookmarks.length;els.passageCount.textContent=d.passages.length;
  els.bookmarkList.innerHTML="";els.passageList.innerHTML="";
  if(!d.bookmarks.length){els.bookmarkList.textContent="No bookmarks yet.";els.bookmarkList.classList.add("empty");}else{els.bookmarkList.classList.remove("empty");d.bookmarks.forEach((b,i)=>els.bookmarkList.appendChild(savedRow(b,"bookmark",i)));}
  if(!d.passages.length){els.passageList.textContent="No passages yet.";els.passageList.classList.add("empty");}else{els.passageList.classList.remove("empty");d.passages.forEach((p,i)=>els.passageList.appendChild(savedRow(p,"passage",i)));}
}
function applyGoal(next,fromPreset=true){
  mode=next;const p=presets[next];
  if(fromPreset){els.wpm.value=p.wpm;els.checks.checked=p.checks;}
  els.goalBadge.textContent=next.toUpperCase();els.goalDesc.textContent=p.desc;
  $$(".goal").forEach(b=>b.classList.toggle("active",b.dataset.goal===next));
  render();
}
function findNext(){
  const q=els.search.value.trim().toLowerCase();if(!q){els.searchStatus.textContent="Enter a term";return;}
  let found=-1;
  for(let i=Math.min(tokens.length,index+1);i<tokens.length;i++){if(tokens[i].word.toLowerCase().includes(q)){found=i;break;}}
  if(found<0)for(let i=0;i<=index&&i<tokens.length;i++){if(tokens[i].word.toLowerCase().includes(q)){found=i;break;}}
  if(found>=0){stop("Search result",false);index=found;els.searchStatus.textContent="Found at word "+(index+1).toLocaleString();render();}else els.searchStatus.textContent="No match";
}
function updateStats(){
  const active=session.activeMs+(session.lastStart!=null?performance.now()-session.lastStart:0),mins=active/60000,actual=mins>0?session.words/mins:0;
  const recall=session.checks.length?session.checks.filter(Boolean).length/session.checks.length:null,adjusted=recall!=null?actual*recall:null;
  $("#stat-words").textContent=session.words.toLocaleString();$("#stat-wpm").textContent=actual?Math.round(actual)+" WPM":"—";$("#stat-recall").textContent=recall!=null?Math.round(recall*100)+"%":"—";$("#stat-adjusted").textContent=adjusted?Math.round(adjusted)+" WPM":"—";
  const saved=Math.max(0,session.words/250-mins),avg=session.speedSamples.length?session.speedSamples.reduce((a,b)=>a+b,0)/session.speedSamples.length:0;
  $("#session-details").innerHTML="<div>Active reading time: "+mins.toFixed(1)+" min</div><div>Estimated time saved vs. 250 WPM: "+saved.toFixed(1)+" min</div><div>Documents in library: "+docs.length+"</div>";
  $("#profile-details").innerHTML="<div>Average selected speed: "+(avg?Math.round(avg)+" WPM":"—")+"</div><div>Current mode: "+escapeHtml(mode)+"</div><div>Use the fastest pace where your recall still stays acceptable.</div>";
}
async function importDocument(file){
  els.libraryStatus.textContent="Opening "+file.name+"…";
  try{
    const text=await parseFile(file,msg=>els.libraryStatus.textContent=msg);
    const d=defaultDoc(file.name,text);docs.push(d);await putDocument(d);
    els.libraryStatus.textContent="Added "+file.name;renderLibrary();await openDocument(d.id);toast("Document imported.");
  }catch(err){els.libraryStatus.textContent="Could not import: "+(err?.message||"unknown error");}
  finally{els.file.value="";}
}
async function addPastedText(){
  const text=cleanText(els.pasteText.value);
  if(!text){toast("Paste some text first.");return;}
  const d=defaultDoc(els.pasteTitle.value.trim()||"Pasted text",text);docs.push(d);await putDocument(d);
  els.pasteTitle.value="";els.pasteText.value="";renderLibrary();await openDocument(d.id);
}
function exportLibrary(){
  persistCurrent().then(()=>{
    const payload={version:1,app:"Glyph Rush",exportedAt:new Date().toISOString(),documents:docs};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="glyph-rush-library.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
}
async function restoreLibrary(file){
  try{
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data.documents))throw new Error("Not a Glyph Rush backup.");
    docs=data.documents.map(normalizeDoc);if(!docs.length)throw new Error("Backup contains no documents.");
    await replaceAllDocuments(docs);renderLibrary();await openDocument(docs[0].id);toast("Library restored.");
  }catch(err){toast(err?.message||"Could not restore backup.");}
  finally{els.importState.value="";}
}
$$(".tab").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
$$(".goal").forEach(b=>b.addEventListener("click",()=>applyGoal(b.dataset.goal,true)));
els.file.addEventListener("change",()=>{const f=els.file.files?.[0];if(f)importDocument(f);});
els.addPaste.addEventListener("click",addPastedText);els.exportBtn.addEventListener("click",exportLibrary);
els.importState.addEventListener("change",()=>{const f=els.importState.files?.[0];if(f)restoreLibrary(f);});
els.play.addEventListener("click",toggle);els.rewind.addEventListener("click",()=>rewindSeconds(10));els.prevSentence.addEventListener("click",()=>jumpSentence(true));els.replay.addEventListener("click",()=>jumpSentence(false));els.bookmark.addEventListener("click",addBookmark);els.passage.addEventListener("click",savePassage);
els.favorite.addEventListener("click",async()=>{const d=current();if(!d)return;d.favorite=!d.favorite;await putDocument(d);renderLibrary();updateMeta();});
els.searchNext.addEventListener("click",findNext);els.search.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();findNext();}});
els.chapter.addEventListener("change",()=>{const c=chapters[+els.chapter.value];if(c){stop("Chapter jump",false);index=c.index;render();}});
els.displayMode.addEventListener("change",render);els.font.addEventListener("change",render);els.fastFix.addEventListener("change",render);
els.wpm.addEventListener("input",updateMeta);els.goalMinutes.addEventListener("input",updateMeta);
els.theme.addEventListener("change",()=>{document.body.dataset.theme=els.theme.value;updateMeta();});
els.useGoal.addEventListener("click",()=>{const req=Math.ceil((Math.max(0,tokens.length-index)/Math.max(1,+els.goalMinutes.value||20))/25)*25;els.wpm.value=Math.max(100,Math.min(1200,req));updateMeta();});
els.continueBtn.addEventListener("click",()=>{els.recall.classList.add("hidden");currentQuestion=null;play();});
els.focus.addEventListener("click",()=>document.body.classList.add("focused"));els.exitFocus.addEventListener("click",()=>document.body.classList.remove("focused"));
document.addEventListener("visibilitychange",()=>{if(document.hidden&&playing&&els.autoPause.checked)stop("Auto-paused");});
document.addEventListener("keydown",e=>{
  const editable=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement;
  if(editable)return;
  if(e.code==="Space"&&!e.repeat){
    e.preventDefault();spaceHeld=false;spaceWasPlaying=playing;
    spaceTimer=setTimeout(()=>{spaceHeld=true;if(playing)stop("Context peek",false);els.peekText.textContent=sentenceText(index);els.peek.classList.remove("hidden");},350);
  }else if(e.key==="ArrowUp"){e.preventDefault();els.wpm.value=Math.min(1200,(+els.wpm.value||250)+25);updateMeta();}
  else if(e.key==="ArrowDown"){e.preventDefault();els.wpm.value=Math.max(100,(+els.wpm.value||250)-25);updateMeta();}
  else if(e.key==="Shift"){speedMultiplier=.65;if(playing)els.state.textContent="Temporary slowdown";}
  else if(e.key.toLowerCase()==="r"){e.preventDefault();rewindSeconds(10);}
  else if(e.key.toLowerCase()==="s"){e.preventDefault();jumpSentence(false);}
  else if(e.key.toLowerCase()==="b"){e.preventDefault();addBookmark();}
});
document.addEventListener("keyup",e=>{
  const editable=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement;
  if(editable)return;
  if(e.code==="Space"){
    e.preventDefault();if(spaceTimer)clearTimeout(spaceTimer);
    if(spaceHeld){els.peek.classList.add("hidden");if(spaceWasPlaying)play();}else toggle();
    spaceTimer=null;spaceHeld=false;
  }else if(e.key==="Shift"){speedMultiplier=1;if(playing)els.state.textContent="Reading";}
});
window.addEventListener("beforeunload",()=>{const d=current();if(d){d.progress=index;d.settings=captureSettings();putDocument(d).catch(()=>{});}});
async function init(){
  try{docs=(await getAllDocuments()).map(normalizeDoc);}catch(err){console.error(err);toast("Local storage could not be opened.");}
  if(!docs.length){const sample=defaultDoc("Getting Started with Glyph Rush",SAMPLE);sample.favorite=true;docs=[sample];await putDocument(sample);}
  currentId=[...docs].sort((a,b)=>b.lastOpen-a.lastOpen)[0].id;
  renderLibrary();await openDocument(currentId);
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(console.warn);
}
init().then(()=>{document.documentElement.dataset.glyphRushBoot="ready";}).catch(err=>{document.documentElement.dataset.glyphRushBoot="error";document.documentElement.dataset.glyphRushError=String(err?.message||err);console.error(err);});
