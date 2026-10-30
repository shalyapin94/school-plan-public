(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SchoolCalendar = factory();
})(globalThis, function () {
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parse = value => new Date(value + 'T12:00:00');
  function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(+parse(value)) && iso(parse(value)) === value; }
  function addDays(value, count) { const d = parse(value); d.setDate(d.getDate()+count); return iso(d); }
  function monday(value) { const d = parse(value); return addDays(value, -(d.getDay()+6)%7); }
  function monthRows(value) {
    const d = parse(value); const first = iso(new Date(d.getFullYear(), d.getMonth(), 1, 12));
    const last = iso(new Date(d.getFullYear(), d.getMonth()+1, 0, 12));
    const rows = []; let cursor = monday(first);
    while (cursor <= last) { rows.push(Array.from({length:7}, (_, i) => addDays(cursor,i))); cursor=addDays(cursor,7); }
    return rows;
  }
  function bounds(value, view) {
    if (view === 'day') return [value, value];
    if (view === 'week') { const start=monday(value); return [start,addDays(start,6)]; }
    const d=parse(value); return [iso(new Date(d.getFullYear(),d.getMonth(),1,12)), iso(new Date(d.getFullYear(),d.getMonth()+1,0,12))];
  }
  function schoolWeek(value) {
    const days=(Date.parse(monday(value)+'T00:00:00Z')-Date.parse('2026-08-31T00:00:00Z'))/86400000;
    const number=Math.floor(days/7)+1; return number>=1 && number<=39 ? number : null;
  }
  function matches(event, query, campus) {
    const words=String(query || '').toLocaleLowerCase('ru').trim().split(/\s+/).filter(Boolean);
    const haystack=[event.title,event.campus,event.owner,event.notes,event.time].join(' ').toLocaleLowerCase('ru');
    return (!campus || event.campus === campus) && words.every(word => haystack.includes(word));
  }
  function overlaps(event, start, end=start) { return event.date <= end && (event.end_date || event.date) >= start; }
  function timeKey(value) { const found=String(value).match(/^(\d{1,2})[:.](\d{2})/); return found ? +found[1]*60 + +found[2] : -1; }
  function eventsOn(events, day) { return events.filter(e=>overlaps(e,day)).sort((a,b)=>timeKey(a.time)-timeKey(b.time)||a.title.localeCompare(b.title,'ru')); }
  function shift(value, view, direction) {
    const d=parse(value);
    if (view==='month') { d.setDate(1); d.setMonth(d.getMonth()+direction); return iso(d); }
    return addDays(value,direction*(view==='week'?7:1));
  }
  return {iso,parse,validDate,addDays,monday,monthRows,bounds,schoolWeek,matches,overlaps,eventsOn,shift};
});
