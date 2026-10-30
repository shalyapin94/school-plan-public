(() => {
  'use strict';
  const C=window.SchoolCalendar, $=id=>document.getElementById(id);
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow'}).format(new Date());
  let state={date:today,view:'month',q:'',campus:''}, events=[];
  const weekdays=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
  const shortDays=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const fmt=(day,options)=>C.parse(day).toLocaleDateString('ru-RU',options);
  const capitalize=s=>s.charAt(0).toUpperCase()+s.slice(1);
  function element(tag,content,className) { const e=document.createElement(tag); if(content!==undefined)e.textContent=content; if(className)e.className=className; return e; }
  function readLocation() {
    const params=new URLSearchParams(location.search);
    state={date:C.validDate(params.get('date'))?params.get('date'):today,view:['month','week','day'].includes(params.get('view'))?params.get('view'):'month',q:params.get('q')||'',campus:params.get('campus')||''};
    $('date').value=state.date; $('search').value=state.q;
    $('campus').value=[...$('campus').options].some(o=>o.value===state.campus)?state.campus:'';
    state.campus=$('campus').value;
  }
  function urlFor(changes={}) {
    const value={...state,...changes}, url=new URL(location.href); url.search='';
    for(const key of ['date','view','q','campus'])if(value[key])url.searchParams.set(key,value[key]);
    return url;
  }
  function navigate(changes,push=true,focus=false) {
    state={...state,...changes}; $('date').value=state.date;
    if(push)history.pushState(null,'',urlFor()); else history.replaceState(null,'',urlFor());
    render(); if(focus)$('period').focus({preventScroll:true});
  }
  function dateLink(day,label,className) {
    const a=element('a',label,className); a.href=urlFor({date:day,view:'day'});
    a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate({date:day,view:'day'},true,true);}); return a;
  }
  function weekLink(day) {
    const number=C.schoolWeek(day), a=element('a',number===null?'→':String(number),'week-number');
    a.href=urlFor({date:C.monday(day),view:'week'}); a.setAttribute('aria-label',number===null?'Открыть план недели':'Открыть план '+number+'-й недели');
    a.onclick=event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate({date:C.monday(day),view:'week'},true,true);}; return a;
  }
  function monthView(filtered) {
    const table=element('table',undefined,'month-calendar'); table.setAttribute('aria-label',fmt(state.date,{month:'long',year:'numeric'}));
    const head=document.createElement('thead'), tr=document.createElement('tr');
    const weekHead=element('th','Нед.','week-column'); weekHead.scope='col';tr.append(weekHead);
    weekdays.forEach((name,i)=>{const th=element('th',undefined,i>4?'weekend':'');th.scope='col';th.append(element('span',name,'weekday-long'),element('span',shortDays[i],'weekday-short'));tr.append(th);});head.append(tr);table.append(head);
    const body=document.createElement('tbody');
    for(const week of C.monthRows(state.date)) {
      const row=document.createElement('tr'), number=element('th',undefined,'week-column');number.scope='row';number.append(weekLink(week[0]));row.append(number);
      week.forEach((day,index)=>{
        const items=C.eventsOn(filtered,day), td=document.createElement('td');
        td.className=[index>4?'weekend':'',day.slice(0,7)!==state.date.slice(0,7)?'other-month':'',day===today?'is-today':'',day===state.date?'is-selected':''].join(' ');
        const link=dateLink(day,undefined,'day-cell'); link.setAttribute('aria-label',fmt(day,{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'. Мероприятий: '+items.length+'. Открыть план дня');
        const top=element('div',undefined,'day-top'); const number=element('span',String(C.parse(day).getDate()),'day-number');
        if(day===today)number.setAttribute('aria-current','date');top.append(number);
        if(items.length)top.append(element('span',String(items.length),'day-count'));link.append(top);
        if(day.slice(0,7)!==state.date.slice(0,7))link.append(element('span',fmt(day,{month:'short'}),'other-month-label'));
        const previews=element('div',undefined,'day-previews');
        for(const event of items.slice(0,2))previews.append(element('div',event.title,'event-preview'));
        if(items.length>2)previews.append(element('span','Ещё '+(items.length-2),'more-events'));
        link.append(previews);td.append(link);row.append(td);
      });body.append(row);
    }table.append(body);return table;
  }
  function eventCard(event) {
    const card=element('article',undefined,'event-card');
    card.append(element('div',event.time||'В течение дня','event-time'));
    const content=element('div',undefined,'event-content');content.append(element('h3',event.title));
    const meta=element('div',undefined,'event-meta');
    if(event.campus)meta.append(element('span',event.campus,'campus-tag'));
    if(event.owner)meta.append(element('span','Ответственный: '+event.owner));
    content.append(meta);
    if(event.end_date)content.append(element('p','В течение периода: '+fmt(event.date,{day:'numeric',month:'long'})+' — '+fmt(event.end_date,{day:'numeric',month:'long'}),'event-range'));
    if(event.notes)content.append(element('p',event.notes,'event-notes'));card.append(content);return card;
  }
  function weekView(filtered) {
    const list=element('div',undefined,'week-plan'), start=C.monday(state.date);
    for(let i=0;i<7;i++) {
      const day=C.addDays(start,i), items=C.eventsOn(filtered,day), section=element('section',undefined,'week-day'+(day===today?' current-day':'')+(i>4?' weekend-day':''));
      const heading=element('h3',undefined,'week-day-title');heading.append(dateLink(day,capitalize(fmt(day,{weekday:'long',day:'numeric',month:'long'}))));
      section.append(heading,element('span',items.length?'Мероприятий: '+items.length:'Мероприятий нет','day-summary'));
      for(const item of items)section.append(eventCard(item));list.append(section);
    }return list;
  }
  function dayView(filtered) {
    const container=element('div',undefined,'day-plan');
    const breadcrumb=element('button','← К календарю месяца','back-to-month');breadcrumb.onclick=()=>navigate({view:'month'},true,true);container.append(breadcrumb);
    const items=C.eventsOn(filtered,state.date);
    if(!items.length) {
      const empty=element('div',undefined,'empty-state');empty.append(element('h3',state.q||state.campus?'По этим условиям мероприятий нет':'На этот день мероприятий пока нет'),element('p',state.q||state.campus?'Измените поиск или выберите другой корпус.':'Выберите другой день в календаре. Здесь появится утверждённый план.'));container.append(empty);
    }
    for(const item of items)container.append(eventCard(item));return container;
  }
  function render() {
    const filtered=events.filter(e=>C.matches(e,state.q,state.campus));
    const [start,end]=C.bounds(state.date,state.view), visible=filtered.filter(e=>C.overlaps(e,start,end));
    let title;
    if(state.view==='month')title=capitalize(fmt(state.date,{month:'long',year:'numeric'}));
    else if(state.view==='week')title=fmt(start,{day:'numeric',month:'short'})+' — '+fmt(end,{day:'numeric',month:'short',year:'numeric'});
    else title=capitalize(fmt(state.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
    $('period').textContent=title;
    document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===state.view;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    const unit={month:'месяц',week:'неделю',day:'день'}[state.view];
    $('prev').setAttribute('aria-label',state.view==='week'?'Предыдущая неделя':'Предыдущий '+unit);$('next').setAttribute('aria-label',state.view==='week'?'Следующая неделя':'Следующий '+unit);
    $('hint').textContent=state.view==='month'?'Дата открывает план дня. Номер слева — план недели.':state.view==='week'?'Нажмите на дату, чтобы открыть подробный план дня.':'План на выбранный день';
    $('share').textContent={month:'Ссылка на этот месяц',week:'Ссылка на эту неделю',day:'Ссылка на этот день'}[state.view];$('share').href=urlFor();
    $('count').textContent='Мероприятий за '+unit+': '+visible.length+(state.q||state.campus?' · с учётом фильтров':'');
    $('calendar').replaceChildren(state.view==='month'?monthView(filtered):state.view==='week'?weekView(filtered):dayView(filtered));
    document.title=title+' · План работы школы';
  }
  document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>navigate({view:button.dataset.view}));
  $('prev').onclick=()=>navigate({date:C.shift(state.date,state.view,-1)});
  $('next').onclick=()=>navigate({date:C.shift(state.date,state.view,1)});
  $('today').onclick=()=>navigate({date:today});
  $('date').onchange=()=>{if(C.validDate($('date').value))navigate({date:$('date').value});};
  $('search').oninput=()=>navigate({q:$('search').value},false);
  $('campus').onchange=()=>navigate({campus:$('campus').value},false);
  window.addEventListener('popstate',()=>{readLocation();render();});
  readLocation();
  fetch(document.documentElement.dataset.eventsUrl||'/api/events',{cache:'no-store'})
    .then(response=>{if(!response.ok)throw Error('HTTP '+response.status);return response.json();})
    .then(data=>{
      if(!Array.isArray(data))throw Error('Неверный формат плана');events=data;
      for(const campus of [...new Set(events.map(e=>e.campus))].filter(Boolean).sort())$('campus').append(new Option(campus,campus));
      readLocation();history.replaceState(null,'',urlFor());render();
    }).catch(()=>{$('calendar').replaceChildren(element('div','Не удалось загрузить план. Обновите страницу или попробуйте позже.','empty-state'));$('count').textContent='План временно недоступен';});
})();
