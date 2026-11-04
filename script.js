'use strict';
const POSES={
 front:['assemble','demi_plie','developpe_seconde','echappe','fifth_position','first_position','fourth_position','grand_plie','passe','port_de_bras','preparatory','releve','reverence','saute','second_position','standing','tendu','third_position'],
 side:['arabesque','arabesque_basse','attitude_derriere','attitude_devant','cambre_derriere','developpe_devant','fourth_position','passe','releve','standing','tendu_derriere','tendu_devant']
};
const labels={assemble:'assemblé',demi_plie:'demi-plié',developpe_seconde:'développé à la seconde',echappe:'échappé',fifth_position:'fifth position',first_position:'first position',fourth_position:'fourth position',grand_plie:'grand plié',passe:'passé / retiré',port_de_bras:'port de bras',preparatory:'preparatory',releve:'relevé',reverence:'révérence',saute:'sauté',second_position:'second position',standing:'standing',tendu:'tendu',third_position:'third position',arabesque:'arabesque',arabesque_basse:'arabesque basse',attitude_derriere:'attitude derrière',attitude_devant:'attitude devant',cambre_derriere:'cambré derrière',developpe_devant:'développé devant',tendu_derriere:'tendu derrière',tendu_devant:'tendu devant'};
const $=id=>document.getElementById(id);
const path=(view,name,head='side')=>`poses/${view}/${view}_${name}_head_${head}.png`;
const title=name=>labels[name]||name.replaceAll('_',' ');
const tempos=[['largo',50],['adagio',70],['andante',90],['moderato',110],['allegro',140],['presto',180]];
const EXAMPLE_NOTATION=`title: example ballet
tempo: 90 bpm

front view

1-4    preparatory {front}
5-8    first position
1-4    demi-plié [2], relevé {front} [2]
5-8    fifth position {front}
1-4    port de bras {front}

side view

1-4    tendu devant mirror [2], développé devant mirror [2]
5-8    passé / retiré mirror [1], passé / retiré [1], arabesque [2]
1-4    attitude devant
5-6    passé / retiré {front} [2]

front view

1-2    first position {front} [2]
3-6    révérence {front}`;
const storageKey='little-ballet-choreography-v1';
let state={choreographyTitle:'',view:'front',selection:{view:'front',name:'fifth_position',head:'side',mirror:false},bpm:96,steps:[]};
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&Array.isArray(saved.steps)){state.choreographyTitle=typeof saved.title==='string'?saved.title.slice(0,120).toLowerCase():'';state.bpm=clampBpm(saved.bpm||96);state.steps=saved.steps.filter(validStep).map(s=>({view:s.view,name:s.name,head:s.head==='front'?'front':'side',mirror:!!s.mirror,beats:clampBeats(s.beats)}));}}catch(e){console.warn('could not load saved choreography',e)}
function validStep(s){return s&&POSES[s.view]?.includes(s.name)}
function clampBpm(n){return Math.max(40,Math.min(220,Math.round(Number(n)||96)))}
function clampBeats(n){return Math.max(1,Math.min(64,Math.round(Number(n)||4)))}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({title:state.choreographyTitle,bpm:state.bpm,steps:state.steps}))}catch(e){console.warn('local saving unavailable',e)}}
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node}
function setView(view){state.view=view;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===view));renderLibrary()}
function renderLibrary(){const grid=$('pose-grid');grid.replaceChildren();const names=POSES[state.view];$('pose-count').textContent=``;
for(const name of names){const b=el('button','pose-card'+(state.selection.view===state.view&&state.selection.name===name?' selected':''));b.type='button';b.setAttribute('aria-label',title(name));b.append(el('span','',title(name)));b.addEventListener('click',()=>{state.selection={view:state.view,name,head:'side',mirror:false};renderPreview();renderLibrary()});grid.append(b)} }
function renderPreview(){const s=state.selection;const img=$('preview');img.src=path(s.view,s.name,s.head);img.style.transform=s.mirror?'scaleX(-1)':'none';img.alt=`${title(s.name)}, ${s.view} view, head ${s.head}${s.mirror?', mirrored':''}`;$('preview-name').textContent=title(s.name);document.querySelectorAll('[data-head]').forEach(b=>{b.classList.toggle('active',b.dataset.head===s.head);b.setAttribute('aria-pressed',String(b.dataset.head===s.head))});$('mirror').setAttribute('aria-pressed',String(s.mirror));$('mirror').textContent=s.mirror?'mirrored · undo':'mirror pose'}
function setBpm(n){const previousBpm=state.bpm;state.bpm=clampBpm(n);$('bpm-value').textContent=state.bpm;$('bpm-slider').value=state.bpm;$('bpm-slider').style.setProperty('--tempo-fill',`${(state.bpm-40)/180*100}%`);$('bpm-input').value=state.bpm;let label=tempos[0][0];for(const [name,bpm] of tempos){if(state.bpm>=bpm)label=name}$('tempo-name').textContent=label;document.querySelectorAll('[data-bpm]').forEach(b=>b.classList.toggle('active',Number(b.dataset.bpm)===state.bpm));persist();renderSummary();if(audio.context && (audio.running || playback.running))changeClockTempo(previousBpm)}
function renderSummary(){const beats=state.steps.reduce((sum,s)=>sum+s.beats,0);const seconds=beats*60/state.bpm;$('timeline-summary').textContent=state.steps.length?`${state.steps.length} ${state.steps.length===1?'pose':'poses'} · ${beats} beats · ${seconds.toFixed(1)} seconds`:'no poses yet'}
function updateProgress(p){const value=Math.max(0,Math.min(100,p));$('progress-fill').style.width=value+'%';document.querySelector('.progress-track').setAttribute('aria-valuenow',String(Math.round(value)));document.querySelector('.progress-track').setAttribute('aria-valuetext',`beat ${Math.min(totalChoreographyBeats(),Math.floor(value/100*totalChoreographyBeats())+1)}`)}
let drag=null;
function startStepDrag(event,card,index){
 if(event.button!==undefined&&event.button!==0)return;
 if(drag)return;
 event.preventDefault();stopPlayback();
 const list=$('timeline');
 drag={pointerId:event.pointerId,from:index,card};
 list.setPointerCapture(event.pointerId);
 card.classList.add('dragging');list.classList.add('is-sorting');
}
function moveStepDrag(event){
 if(!drag||event.pointerId!==drag.pointerId)return;
 const list=$('timeline'),bounds=list.getBoundingClientRect();
 const pointerX=event.clientX;
 if(pointerX<bounds.left+36)list.scrollLeft-=12;
 else if(pointerX>bounds.right-36)list.scrollLeft+=12;
 const other=[...list.querySelectorAll('.step')].filter(card=>card!==drag.card);
 let destination=other.findIndex(card=>pointerX<card.getBoundingClientRect().left+card.getBoundingClientRect().width/2);
 if(destination<0)destination=other.length;
 const reference=other[destination]||null;
 const cards=[...list.querySelectorAll('.step')];
 if(cards.indexOf(drag.card)!==destination)list.insertBefore(drag.card,reference);
}
function finishStepDrag(event){
 if(!drag||event.pointerId!==drag.pointerId)return;
 const {from,card,pointerId}=drag;
 const list=$('timeline');
 const to=[...list.querySelectorAll('.step')].indexOf(card);
 drag=null;
 card.classList.remove('dragging');list.classList.remove('is-sorting');
 if(event.type!=='lostpointercapture'&&list.hasPointerCapture(pointerId))list.releasePointerCapture(pointerId);
 if(to>=0&&from!==to)changeSteps(()=>{const [step]=state.steps.splice(from,1);state.steps.splice(to,0,step)});
 else renderTimeline();
}
const ribbon=$('timeline');
ribbon.addEventListener('pointermove',moveStepDrag);
ribbon.addEventListener('pointerup',finishStepDrag);
ribbon.addEventListener('pointercancel',finishStepDrag);
ribbon.addEventListener('lostpointercapture',finishStepDrag);
function renderTimeline(){
 const list=$('timeline');list.replaceChildren();
 if(!state.steps.length)list.append(el('div','timeline-empty','your choreography begins here'));
 state.steps.forEach((s,i)=>{
  const card=el('article','step');card.dataset.index=i;
  const top=el('div','step-top');
  const grip=el('button','step-grip','⠿');grip.type='button';grip.title='drag to rearrange';
  grip.setAttribute('aria-label',`drag to rearrange pose ${i+1}: ${title(s.name)}`);
  grip.addEventListener('pointerdown',event=>startStepDrag(event,card,i));
  top.append(grip,el('span','',`no. ${String(i+1).padStart(2,'0')}`));
  const remove=el('button','step-remove','×');remove.type='button';remove.title='remove pose';
  remove.setAttribute('aria-label',`remove ${title(s.name)}`);
  remove.onclick=()=>changeSteps(()=>state.steps.splice(i,1));top.append(remove);
  const img=el('img');img.src=path(s.view,s.name,s.head);img.alt='';img.draggable=false;
  img.style.transform=s.mirror?'scaleX(-1)':'none';
  const name=el('div','step-name',title(s.name));const controls=el('div','step-controls');
  const mirror=el('button','',s.mirror?'mirrored':'mirror');mirror.title='mirror this pose';
  mirror.onclick=()=>changeSteps(()=>{s.mirror=!s.mirror});
  const beats=el('input');beats.type='number';beats.min=1;beats.max=64;beats.value=s.beats;
  beats.setAttribute('aria-label',`beats for ${title(s.name)}`);
  beats.onchange=()=>changeSteps(()=>{s.beats=clampBeats(beats.value)});
  const head=el('button','',s.head==='front'?'{front}':'{side}');head.title='change head direction';head.setAttribute('aria-label','change head direction');head.onclick=()=>changeSteps(()=>{s.head=s.head==='front'?'side':'front'});controls.append(mirror,head,beats,el('label','','beats'));
  card.append(top,img,name,controls);card.title='jump to this pose';card.addEventListener('click',event=>{if(event.target.closest('button, input, label'))return;let offset=0;for(let n=0;n<i;n++)offset+=state.steps[n].beats;seekToBeat(offset)});list.append(card);
 });renderSummary();
}
function changeSteps(change){stopPlayback();change();persist();renderTimeline()}
const audio={context:null,running:false,timer:null,origin:0,nextBeat:0,token:0,scheduled:[]};
function ensureAudio(){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw new Error('this browser does not support web audio');if(!audio.context)audio.context=new C();if(audio.context.state==='suspended')audio.context.resume();return audio.context}
function tick(time,accent){const ctx=audio.context;if(!ctx)return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(accent?1050:780,time);osc.frequency.exponentialRampToValueAtTime(accent?690:540,time+.035);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(accent?.10:.065,time+.003);gain.gain.exponentialRampToValueAtTime(.0001,time+.055);osc.connect(gain).connect(ctx.destination);osc.start(time);osc.stop(time+.06);audio.scheduled.push({osc,gain,time})}
function silenceScheduled(){if(!audio.context)return;const now=audio.context.currentTime;for(const item of audio.scheduled){if(item.time>now){try{item.gain.gain.cancelScheduledValues(now);item.gain.gain.setValueAtTime(.0001,now);item.osc.stop(now+.001)}catch(e){}}}audio.scheduled=[]}
function clearBeatLights(){document.querySelectorAll('#beat-lights span').forEach(d=>d.classList.remove('on'))}
function lightBeat(index,delay){const token=audio.token;setTimeout(()=>{if(audio.token!==token||!(audio.running||playback.running))return;document.querySelectorAll('#beat-lights span').forEach((dot,i)=>dot.classList.toggle('on',i===index))},Math.max(0,delay*1000))}
function clockActive(){return audio.running||playback.running}
function scheduleTicks(){if(!clockActive()||!audio.context)return;const ctx=audio.context,seconds=60/state.bpm;while(audio.origin+audio.nextBeat*seconds<ctx.currentTime+.10){const when=audio.origin+audio.nextBeat*seconds;if(when>=ctx.currentTime-.015){if(audio.running)tick(Math.max(when,ctx.currentTime),audio.nextBeat%4===0);lightBeat(audio.nextBeat%4,when-ctx.currentTime)}audio.nextBeat++}audio.scheduled=audio.scheduled.filter(item=>item.time>ctx.currentTime-.1)}
function startScheduler(){if(audio.timer===null)audio.timer=setInterval(scheduleTicks,25);scheduleTicks()}
function stopSchedulerIfIdle(){if(clockActive())return;clearInterval(audio.timer);audio.timer=null;audio.token++;silenceScheduled();clearBeatLights()}
function resetClock(){const ctx=ensureAudio();audio.token++;silenceScheduled();audio.origin=ctx.currentTime+.05;audio.nextBeat=0;clearBeatLights();startScheduler()}
function changeClockTempo(previousBpm){const ctx=audio.context;if(!ctx||!clockActive())return;const oldSeconds=60/previousBpm;const elapsedBeats=Math.max(0,(ctx.currentTime-audio.origin)/oldSeconds);audio.token++;silenceScheduled();audio.origin=ctx.currentTime-elapsedBeats*60/state.bpm;audio.nextBeat=Math.max(0,Math.ceil(elapsedBeats));audio.clockBpm=state.bpm;startScheduler()}
function startMetronome(){try{ensureAudio()}catch(e){alert(e.message);return}audio.running=true;if(!playback.running)resetClock();else startScheduler();$('metronome').textContent='♪ mute metronome';$('metronome').setAttribute('aria-pressed','true')}
function stopMetronome(){audio.running=false;audio.token++;silenceScheduled();if(playback.running){audio.nextBeat=Math.max(0,Math.ceil((audio.context.currentTime-audio.origin)*state.bpm/60));startScheduler()}else stopSchedulerIfIdle();$('metronome').textContent='♪ start metronome';$('metronome').setAttribute('aria-pressed','false')}
let playback={running:false,raf:0,index:-1,position:0};
function totalChoreographyBeats(){return state.steps.reduce((sum,step)=>sum+step.beats,0)}
function displayAtBeat(beat){
 const total=totalChoreographyBeats();if(!total)return;
 const bounded=Math.max(0,Math.min(total,beat));let cursor=0,index=state.steps.length-1;
 for(let i=0;i<state.steps.length;i++){cursor+=state.steps[i].beats;if(bounded<cursor){index=i;break}}
 playback.index=index;showPlaybackPose(state.steps[index]);
 document.querySelectorAll('.step').forEach((card,i)=>card.classList.toggle('playing',i===index));
 updateProgress(bounded/total*100);
}
function seekToBeat(beat){
 const total=totalChoreographyBeats();if(!total)return;
 playback.position=Math.max(0,Math.min(total,beat));
 if(playback.running){
  const ctx=audio.context;audio.token++;silenceScheduled();
  audio.origin=ctx.currentTime+.04-playback.position*60/state.bpm;
  audio.nextBeat=Math.max(0,Math.ceil(playback.position-0.00001));
  clearBeatLights();startScheduler();
 }
 displayAtBeat(playback.position);
 if(!playback.running)$('playback-status').textContent='ready to play from here';
}

function stopPlayback(){playback.position=0;playback.running=false;cancelAnimationFrame(playback.raf);playback.index=-1;document.querySelectorAll('.step').forEach(e=>e.classList.remove('playing'));updateProgress(0);$('play').textContent='play';$('playback-status').textContent='ready to compose';stopSchedulerIfIdle()}
function play(){if(playback.running){stopPlayback();return}if(!state.steps.length)return;const startBeat=playback.position;stopPlayback();playback.position=startBeat;try{ensureAudio()}catch(e){alert(e.message);return}playback.running=true;audio.clockBpm=state.bpm;resetClock();if(startBeat>0){audio.token++;silenceScheduled();audio.origin=audio.context.currentTime+.05-startBeat*60/state.bpm;audio.nextBeat=Math.ceil(startBeat);startScheduler()}$('play').textContent='pause';$('playback-status').textContent='playing choreography';const totalBeats=state.steps.reduce((sum,s)=>sum+s.beats,0);
function frame(){if(!playback.running)return;const beat=Math.max(0,(audio.context.currentTime-audio.origin)*state.bpm/60);playback.position=beat;if(beat>=totalBeats){const last=state.steps.at(-1);showPlaybackPose(last);stopPlayback();$('playback-status').textContent='the dance is finished.';updateProgress(100);return}let cursor=0,index=0;for(let i=0;i<state.steps.length;i++){cursor+=state.steps[i].beats;if(beat<cursor){index=i;break}}if(index!==playback.index){playback.index=index;showPlaybackPose(state.steps[index]);document.querySelectorAll('.step').forEach((card,i)=>card.classList.toggle('playing',i===index))}updateProgress(beat/totalBeats*100);playback.raf=requestAnimationFrame(frame)}playback.raf=requestAnimationFrame(frame)}
function showPlaybackPose(s){state.selection={view:s.view,name:s.name,mirror:s.mirror,head:s.head||'side'};renderPreview();setView(s.view)}

function notation(){
 const lines=[`title: ${state.choreographyTitle.trim()||'untitled choreography'}`,`tempo: ${state.bpm} bpm`,''];
 let view='',count=1,group=[],groupBeats=0;
 const description=s=>`${title(s.name)}${s.mirror?' mirror':''}${s.head==='front'?' {front}':''}${s.beats===4?'':` [${s.beats}]`}`;
 function flush(){
  if(!group.length)return;
  const end=count+groupBeats-1;
  lines.push(`${count}-${end}    ${group.map(description).join(', ')}`);
  count=end+1;if(count>8)count=1;
  group=[];groupBeats=0;
 }
 for(const step of state.steps){
  if(step.view!==view){
   flush();if(view)lines.push('');
   view=step.view;lines.push(`${view} view`,'');count=1;
  }
  if(groupBeats && (groupBeats+step.beats>4 || count+groupBeats+step.beats-1>8))flush();
  group.push(step);groupBeats+=step.beats;
  if(groupBeats>=4 || count+groupBeats>8)flush();
 }
 flush();
 return lines.join('\n').trimEnd();
}
function copyUsingSelection(content){
 // ios safari is more reliable when a copy starts directly in the click event.
 const field=document.createElement('textarea');
 field.value=content;field.setAttribute('readonly','');
 field.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px;';
 document.body.appendChild(field);
 const previous=document.activeElement;
 try{
  field.focus();field.select();field.setSelectionRange(0,field.value.length);
  return document.execCommand('copy');
 }finally{
  field.remove();
  if(previous&&typeof previous.focus==='function')previous.focus({preventScroll:true});
 }
}
async function copyNotation(){
 const content=notation();
 const isiPad=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 let copied=false;
 // Try the synchronous selection route first on ipad, before any await loses the gesture.
 if(isiPad){try{copied=copyUsingSelection(content)}catch(e){console.warn('selection copy unavailable',e)}}
 if(!copied){
  try{await navigator.clipboard.writeText(content);copied=true}catch(e){console.warn('clipboard api unavailable',e)}
 }
 if(!copied&&!isiPad){try{copied=copyUsingSelection(content)}catch(e){console.warn('selection copy unavailable',e)}}
 if(copied){
  $('save').textContent='notation copied !';
  setTimeout(()=>$('save').textContent='♡ copy notation',1800);
 }else{
  const box=$('notation-input');$('notation-heading').textContent='copy choreography';box.value=content;
  $('notation-error').hidden=true;$('notation-load').hidden=true;openNotation();box.focus();box.select();
 }
}
function normalizePose(raw){
 return raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}
function readPose(raw,view,lineNo){
 let text=raw.trim(),head='side',mirror=false,beats=null;
 const duration=text.match(/\[(\d+)\]/);
 if(duration){beats=Number(duration[1]);text=text.replace(duration[0],'').trim()}
 if(/\{front\}/i.test(text)){head='front';text=text.replace(/\{front\}/ig,'').trim()}
 else if(/\{side\}/i.test(text)){text=text.replace(/\{side\}/ig,'').trim()}
 if(/\bmirror\b/i.test(text)){mirror=true;text=text.replace(/\bmirror\b/ig,'').trim()}
 
 if(/(?:^|\s)~(?:\s|$)/.test(text)){mirror=true;text=text.replace(/(?:^|\s)~(?=\s|$)/g,' ').trim()}
 if(/\^/.test(text)){head='front';text=text.replace(/\^/g,'').trim()}
 text=text.replace(/(?:^|\s)>(?=\s|$)/g,' ').trim();
 const explicit=text.match(/^(front|side)\s+(.+)$/i);
 if(explicit){view=explicit[1].toLowerCase();text=explicit[2].trim()}
 if(!view)throw Error(`line ${lineNo}: add a “front view” or “side view” heading before the poses.`);
 const key=normalizePose(text);
 const name=POSES[view].find(n=>normalizePose(title(n))===key||n===key);
 if(!name)throw Error(`line ${lineNo}: “${text}” is not a ${view}-view pose in the cabinet.`);
 if(beats!==null&&(beats<1||beats>64))throw Error(`line ${lineNo}: beats must be between 1 and 64.`);
 return {view,name,mirror,head,beats};
}
function parseNotation(raw){
 // Accept text pasted from browsers that unexpectedly URL-encode clipboard content.
 // Only decode when the entire notation looks encoded, never ordinary '%' characters.
 const pasted=raw.trim();
 if(/^title%3a/i.test(pasted)&&/%0a/i.test(pasted)){
  try{raw=decodeURIComponent(pasted)}catch(e){/* keep the original for validation */}
 }
 const lines=raw.replaceAll('\r','').split('\n');let name='',bpm=null,view=null;
 const steps=[];let expectedCount=null;
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line)continue;
  const titleMatch=line.match(/^title\s*:\s*(.*)$/i);
  if(titleMatch){name=titleMatch[1].trim().slice(0,120).toLowerCase();continue}
  const tempoMatch=line.match(/^tempo\s*:\s*(?:(?:largo|adagio|andante|moderato|allegro|presto)\s*\(?\s*)?(\d{2,3})\s*bpm\s*\)?$/i);
  if(tempoMatch){bpm=Number(tempoMatch[1]);if(bpm<40||bpm>220)throw Error('tempo must be between 40 and 220 bpm.');continue}
  if(/^(title|tempo)\s*:/i.test(line))throw Error(`line ${i+1}: invalid title or tempo.`);
  const heading=line.match(/^(front|side)\s+view\s*:?\s*$/i);
  if(heading){view=heading[1].toLowerCase();expectedCount=null;continue}
  const countMatch=line.match(/^(\d+)\s*[-–]\s*(\d+)\s+(.+)$/);
  let phrase=line,range=null;
  if(countMatch){
   const start=Number(countMatch[1]),end=Number(countMatch[2]);
   if(start<1||end<start)throw Error(`line ${i+1}: invalid count range.`);
   range=end-start+1;phrase=countMatch[3];
   if(expectedCount!==null && start!==expectedCount && start!==1)
    throw Error(`line ${i+1}: expected the next count to be ${expectedCount}, or restart at 1.`);
   expectedCount=end+1;
  }else{expectedCount=null}
  const entries=phrase.split(',').map(x=>x.trim()).filter(Boolean);
  if(!entries.length)throw Error(`line ${i+1}: no poses found.`);
  const parsed=entries.map(entry=>readPose(entry,view,i+1));
  if(range!==null){
   const known=parsed.reduce((sum,s)=>sum+(s.beats||0),0);
   const missing=parsed.filter(s=>s.beats===null);
   if(missing.length===1){const remainder=range-known;if(remainder<1||remainder>64)throw Error(`line ${i+1}: the durations do not fit counts ${countMatch[1]}-${countMatch[2]}.`);missing[0].beats=remainder}
   else if(missing.length>1)throw Error(`line ${i+1}: use [beats] for all but one pose in a shared count range.`);
   if(parsed.reduce((sum,s)=>sum+s.beats,0)!==range)throw Error(`line ${i+1}: pose durations do not match the count range.`);
  }else{
   parsed.forEach(s=>{if(s.beats===null)s.beats=4});
  }
  steps.push(...parsed);
 }
 if(bpm===null)throw Error('please include a tempo, for example: tempo: 84 bpm');
 if(!steps.length)throw Error('please include at least one pose.');
 return {title:name,bpm,steps};
}
function closeNotation(){$('notation-panel').hidden=true;$('import-open').textContent='↑ import notation';$('import-open').setAttribute('aria-expanded','false')}
function openNotation(){$('notation-panel').hidden=false;$('import-open').textContent='× close import box';$('import-open').setAttribute('aria-expanded','true')}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-head]').forEach(b=>b.onclick=()=>{state.selection.head=b.dataset.head;renderPreview()});$('mirror').onclick=()=>{state.selection.mirror=!state.selection.mirror;renderPreview()};$('add').onclick=()=>changeSteps(()=>state.steps.push({...state.selection,beats:4}));
$('bpm-slider').oninput=e=>setBpm(e.target.value);$('bpm-input').onchange=e=>setBpm(e.target.value);$('bpm-minus').onclick=()=>setBpm(state.bpm-1);$('bpm-plus').onclick=()=>setBpm(state.bpm+1);document.querySelectorAll('[data-bpm]').forEach(b=>b.onclick=()=>setBpm(b.dataset.bpm));
const progressTrack=document.querySelector('.progress-track');
progressTrack.addEventListener('pointerdown',event=>{if(!state.steps.length)return;const bounds=progressTrack.getBoundingClientRect();seekToBeat((event.clientX-bounds.left)/bounds.width*totalChoreographyBeats());});
progressTrack.addEventListener('keydown',event=>{if(!state.steps.length)return;const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();const total=totalChoreographyBeats();seekToBeat(event.key==='Home'?0:event.key==='End'?total:playback.position+(event.key==='ArrowRight'?1:-1));});
$('metronome').onclick=()=>audio.running?stopMetronome():startMetronome();$('play').onclick=play;$('stop').onclick=stopPlayback;
$('choreography-title').value=state.choreographyTitle;$('choreography-title').addEventListener('input',e=>{state.choreographyTitle=e.target.value.toLowerCase();e.target.value=state.choreographyTitle;persist()});$('clear').onclick=()=>{if(!(state.steps.length||state.choreographyTitle.trim()))return;if(!confirm('clear the whole choreography ribbon and its title ?'))return;changeSteps(()=>{state.steps=[];state.choreographyTitle='';$('choreography-title').value='';})};
$('save').onclick=copyNotation;
$('import-open').setAttribute('aria-controls','notation-panel');$('import-open').setAttribute('aria-expanded','false');
$('import-open').onclick=()=>{if(!$('notation-panel').hidden){closeNotation();return} $('notation-heading').textContent='import choreography';$('notation-load').hidden=false;$('notation-error').hidden=true;openNotation()};
$('notation-cancel').onclick=closeNotation;

$('notation-input').value=EXAMPLE_NOTATION;
function applyNotation(data){
 stopPlayback();
 state.choreographyTitle=data.title;state.steps=data.steps;
 $('choreography-title').value=state.choreographyTitle;
 setBpm(data.bpm);persist();renderTimeline();closeNotation();
}
$('example-play').onclick=()=>{
 if((state.steps.length||state.choreographyTitle.trim())&&!confirm('replace the current choreography with the example ballet ?'))return;
 try{applyNotation(parseNotation(EXAMPLE_NOTATION));play()}
 catch(e){alert(e.message)}
};
$('notation-load').onclick=()=>{
 try{
  applyNotation(parseNotation($('notation-input').value));
 }catch(e){$('notation-error').textContent=e.message;$('notation-error').hidden=false}
};
setBpm(state.bpm);renderPreview();setView('front');renderTimeline();
