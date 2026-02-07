const V='5.199',AID='6121396';
let tok=null,post=null,grps=[],mode='copy';

async function api(m,p){
  const u=new URL('https://api.vk.com/method/'+m);
  u.searchParams.set('access_token',tok);
  u.searchParams.set('v',V);
  for(const[k,v]of Object.entries(p))if(v!=null&&v!=='')u.searchParams.set(k,v);
  const r=await fetch(u);const d=await r.json();
  if(d.error)throw new Error(d.error.error_msg);
  return d.response;
}

function ss(t,c){const e=$('st');e.textContent=t;e.className='st s '+c}
function $(id){return document.getElementById(id)}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

async function uploadPhotoToGroup(gid,photo){
  const srv=await api('photos.getWallUploadServer',{group_id:gid});
  const sizes=photo.sizes||[];
  const best=
    sizes.find(s=>s.type==='w')||
    sizes.find(s=>s.type==='z')||
    sizes.find(s=>s.type==='y')||
    sizes.find(s=>s.type==='x')||
    sizes[sizes.length-1];
  if(!best)throw new Error('Не найдено фото для загрузки');
  const blob=await fetch(best.url,{credentials:'include'}).then(r=>r.blob());
  const fd=new FormData();
  fd.append('photo',blob,'photo.jpg');
  const up=await fetch(srv.upload_url,{method:'POST',body:fd}).then(r=>r.json());
  const saved=await api('photos.saveWallPhoto',{group_id:gid,photo:up.photo,server:up.server,hash:up.hash});
  if(saved&&saved[0])return 'photo'+saved[0].owner_id+'_'+saved[0].id;
  throw new Error('Не удалось сохранить фото');
}

// Init
(async()=>{
  const d=await chrome.storage.local.get(['vk_token','vkr_last_post','vkr_last_schedule']);
  if(d.vk_token){
    tok=d.vk_token;
    try{
      const u=(await api('users.get',{}))[0];
      $('as').textContent='✅ '+u.first_name+' '+u.last_name;
      $('as').className='aok';
      $('ba').style.display='none';
      $('ti').style.display='none';
      $('bs').style.display='none';
      show();
    }catch(e){$('as').textContent='❌ Токен недействителен';$('as').className='ano'}
  }
  // Auto URL from content script or current page
  const params=new URLSearchParams(location.search);
  const qp=params.get('post');
  if(qp){
    $('pu').value=qp;
  }else if(d.vkr_last_post){
    $('pu').value=d.vkr_last_post;
    chrome.storage.local.remove('vkr_last_post');
  }else{
    try{
      const[tab]=await chrome.tabs.query({active:true,currentWindow:true});
      if(tab&&tab.url){const m=tab.url.match(/wall(-?\d+_\d+)/);if(m)$('pu').value='https://vk.com/wall'+m[1]}
    }catch(e){}
  }
  
  // Восстанавливаем последнее время отложки
  if(d.vkr_last_schedule){
    const ls=d.vkr_last_schedule;
    if(ls.enabled){
      $('sch').checked=true;
      $('sdw').style.display='block';
      $('sdd').value=ls.date;
      $('sdt').value=ls.time;
    }
  }
})();

chrome.storage.onChanged.addListener((changes)=>{
  if(changes.vk_token&&changes.vk_token.newValue){
    location.reload();
  }
});

function show(){
  $('sp').style.display='block';
}

// Auth
$('ba').onclick=async()=>{
  try{
    await chrome.runtime.sendMessage({type:'start_auth'});
    ss('🔐 Окно авторизации открыто. После подтверждения токен сохранится автоматически.','i');
  }catch(e){
    ss('❌ Не удалось открыть окно авторизации.','e');
  }
};

// Save token
$('bs').onclick=()=>{
  const t=$('ti').value.trim();
  if(!t)return;
  chrome.storage.local.set({vk_token:t},()=>{tok=t;location.reload()});
};

// Load post
$('bl').onclick=async()=>{
  const url=$('pu').value.trim();
  const m=url.match(/wall(-?\d+_\d+)/)||url.match(/(-?\d+_\d+)/);
  if(!m){ss('❌ Неверная ссылка!','e');return}
  
  $('bl').disabled=true;$('bl').textContent='⏳ Загрузка...';
  
  try{
    const pid=m[1];const pp=pid.split('_');
    const res=await api('wall.getById',{posts:pp[0]+'_'+pp[1]});
    post=res.items?res.items[0]:(res[0]||null);
    if(!post)throw new Error('Пост не найден');
    
    // Preview
    let html=esc(post.text||'[Без текста]');
    if(post.attachments){
      const ph=post.attachments.filter(a=>a.type==='photo');
      ph.forEach(a=>{
        const s=a.photo.sizes||[];
        const b=s.find(x=>x.type==='x')||s[s.length-1];
        if(b)html+='<img src="'+b.url+'">';
      });
      const types=post.attachments.map(a=>{
        if(a.type==='photo')return'🖼';if(a.type==='video')return'🎥';
        if(a.type==='doc')return'📎';return'📁';
      });
      html+='<div style="color:#5181b8;margin-top:4px">'+types.join(' ')+'</div>';
    }
    $('pv').innerHTML=html;
    $('pv').style.display='block';
    $('pt').value=post.text||'';
    
    // Load groups
    const gr=await api('groups.get',{extended:1,filter:'admin,editor',count:100});
    grps=gr.items||gr;
    
    let gh='';
    const saved=await chrome.storage.local.get('vkr_groups');
    const sg=saved.vkr_groups||[];
    
    // Если есть сохранённые группы - используем их, иначе выбираем все
    const autoSelect=sg.length===0;
    
    grps.forEach(g=>{
      const ch=(autoSelect||sg.includes(String(g.id)))?'checked':'';
      gh+='<label class="gi"><input type="checkbox" value="'+g.id+'" '+ch+'><img src="'+g.photo_50+'"><span>'+esc(g.name)+'</span></label>';
    });
    $('gl').innerHTML=gh;
    
    $('sm').style.display='block';
    $('sx').style.display='block';
    $('sd').style.display='block';
    $('sg').style.display='block';
    $('ss').style.display='block';
    
    // Count
    updCnt();
    document.querySelectorAll('#gl input').forEach(c=>c.onchange=updCnt);
    
    $('bl').textContent='✅ Пост загружен!';
    setTimeout(()=>{$('bl').textContent='📌 Загрузить пост';$('bl').disabled=false},2000);
   
  }catch(e){
    ss('❌ '+e.message,'e');
    $('bl').textContent='📌 Загрузить пост';$('bl').disabled=false;
  }
};

function updCnt(){
  const n=document.querySelectorAll('#gl input:checked').length;
  $('gc').textContent=n+' выбрано';
}

// Select all / none
$('ga').onclick=()=>{document.querySelectorAll('#gl input').forEach(c=>c.checked=true);updCnt()};
$('gn').onclick=()=>{document.querySelectorAll('#gl input').forEach(c=>c.checked=false);updCnt()};

// Search
$('sr').oninput=(e)=>{
  const q=e.target.value.toLowerCase();
  document.querySelectorAll('.gi').forEach(el=>{
    el.style.display=el.querySelector('span').textContent.toLowerCase().includes(q)?'flex':'none';
  });
};

// Mode toggle
$('mt').onclick=(e)=>{
  const b=e.target.closest('.mb');if(!b)return;
  mode=b.dataset.m;
  document.querySelectorAll('.mb').forEach(x=>{x.classList.toggle('a',x===b)});
  $('sx').style.display=mode==='repost'?'none':'block';
};

// Schedule toggle
$('sch').onchange=(e)=>{
  $('sdw').style.display=e.target.checked?'block':'none';
  if(e.target.checked&&!$('sdd').value){
    // Устанавливаем время только если не было установлено
    const now=new Date();
    now.setHours(now.getHours()+1);
    $('sdd').value=now.toISOString().split('T')[0];
    $('sdt').value=now.toTimeString().slice(0,5);
  }
  // Сохраняем состояние
  chrome.storage.local.set({
    vkr_last_schedule:{
      enabled:e.target.checked,
      date:$('sdd').value,
      time:$('sdt').value
    }
  });
};

// Сохраняем время при изменении
$('sdd').onchange=$('sdt').onchange=()=>{
  chrome.storage.local.set({
    vkr_last_schedule:{
      enabled:$('sch').checked,
      date:$('sdd').value,
      time:$('sdt').value
    }
  });
};

// SEND
$('go').onclick=async()=>{
  const sel=[];
  document.querySelectorAll('#gl input:checked').forEach(c=>sel.push(c.value));
  if(!sel.length){ss('❌ Выберите группы!','e');return}
  if(!post){ss('❌ Сначала загрузите пост!','e');return}
  
  // Сохраняем выбранные группы
  chrome.storage.local.set({vkr_groups:sel});
  
  // Сохраняем настройки отложки
  chrome.storage.local.set({
    vkr_last_schedule:{
      enabled:$('sch').checked,
      date:$('sdd').value,
      time:$('sdt').value
    }
  });
  
  const txt=$('pt').value;
  
  // Проверяем отложку
  let pubDate=null;
  if($('sch').checked){
    const d=$('sdd').value;
    const t=$('sdt').value;
    if(!d||!t){ss('❌ Укажите дату и время!','e');return}
    pubDate=new Date(d+'T'+t).getTime();
    if(pubDate<=Date.now()){ss('❌ Дата должна быть в будущем!','e');return}
  }
  
  const btn=$('go');
  btn.disabled=true;btn.textContent='⏳ Отправка...';
  $('pr').className='pr s';
  
  let ok=0,fail=0;const total=sel.length;
  
  for(let i=0;i<total;i++){
    const gid=sel[i];
    const pct=Math.round(((i+1)/total)*100);
    $('pb').style.width=pct+'%';
    
    const gn=document.querySelector('input[value="'+gid+'"]')?.closest('.gi')?.querySelector('span')?.textContent||gid;
    ss('📤 "'+gn+'" ('+(i+1)+'/'+total+')...','i');
    
    try{
      if(mode==='repost'){
        await api('wall.repost',{object:'wall'+post.owner_id+'_'+post.id,group_id:gid});
      }else{
        // КОПИЯ ОТ ИМЕНИ ГРУППЫ
        const params={owner_id:'-'+gid,from_group:1,message:txt};
        
        // Отложка
        if(pubDate){
          params.publish_date=Math.floor(pubDate/1000);
        }
        
        // Вложения - копируем правильно чтобы не показывался источник
        if(post.attachments&&post.attachments.length){
          const atts=[];
          for(const a of post.attachments){
            const tp=a.type,obj=a[tp];
            if(!obj)continue;
            
            if(tp==='photo'){
              try{
                const uploaded=await uploadPhotoToGroup(gid,obj);
                atts.push(uploaded);
              }catch(e){
                console.error('Photo upload error:',e);
                throw new Error('Не удалось загрузить фото для группы: '+e.message);
              }
            }else if(tp==='video'){
              const ak=obj.access_key?'_'+obj.access_key:'';
              atts.push('video'+obj.owner_id+'_'+obj.id+ak);
            }else if(tp==='doc'){
              atts.push('doc'+obj.owner_id+'_'+obj.id);
            }
          }
          if(atts.length)params.attachments=atts.join(',');
        }
        
        await api('wall.post',params);
      }
      ok++;
    }catch(e){fail++;console.error(gid,e)}
    
    if(i<total-1)await sleep(2500);
  }
  
  $('pb').style.width='100%';
  btn.disabled=false;
  
  if(!fail){
    ss('✅ Отправлено в '+ok+' групп!','o');
    btn.textContent='✅ Готово!';
  }else{
    ss('⚠️ Успешно: '+ok+', Ошибки: '+fail,'e');
    btn.textContent='🔄 Ещё раз';
  }
  
  setTimeout(()=>{btn.textContent='🚀 Отправить в группы'},3000);
};

function esc(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML}
