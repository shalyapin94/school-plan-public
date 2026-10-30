let view = 'week';
let events = [];
const $ = id => document.getElementById(id);
const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const text = (tag, value, className) => {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  return element;
};
const params = new URLSearchParams(location.search);
const initial = params.get('date');
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
  Number.isFinite(+new Date(value + 'T12:00:00')) && iso(new Date(value + 'T12:00:00')) === value;
$('date').value = validDate(initial) ? initial : new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/Moscow'}).format(new Date());
if (['month', 'week', 'day'].includes(params.get('view'))) view = params.get('view');
if (params.has('q')) $('search').value = params.get('q');

function render() {
  let start = new Date($('date').value + 'T12:00:00');
  let end = new Date(start);
  if (!validDate($('date').value)) return;
  if (view === 'week') {
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    end = new Date(start);
    end.setDate(end.getDate() + 6);
  }
  if (view === 'month') {
    start.setDate(1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
  }
  $('period').textContent = `${start.toLocaleDateString('ru-RU')} — ${end.toLocaleDateString('ru-RU')}`;
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const query = $('search').value.toLowerCase();
  const list = events.filter(event => event.date <= iso(end) && (event.end_date || event.date) >= iso(start) &&
    Object.values(event).join(' ').toLowerCase().includes(query) && (!$('campus').value || event.campus === $('campus').value))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  $('events').replaceChildren();
  $('count').textContent = `Мероприятий: ${list.length}`;
  for (const event of list) {
    const card = text('article', '', 'card');
    card.append(text('span', `${event.date}${event.end_date ? ' — ' + event.end_date : ''} · ${event.time || 'В течение дня'}`, 'pill'),
      text('h3', event.title), text('p', event.campus, 'muted'), text('p', event.owner, 'muted'), text('p', event.notes, 'muted'));
    $('events').append(card);
  }
  if (!list.length) $('events').append(text('div', 'В этом периоде нет утверждённых мероприятий.', 'empty'));
  const url = new URL(location.href);
  url.searchParams.set('date', $('date').value);
  url.searchParams.set('view', view);
  for (const [key, value] of [['q', $('search').value], ['campus', $('campus').value]]) {
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  }
  history.replaceState(null, '', url);
  $('share').href = url.href;
}

document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => { view = button.dataset.view; render(); });
for (const id of ['date', 'search', 'campus']) $(id).oninput = render;
for (const [id, direction] of [['prev', -1], ['next', 1]]) $(id).onclick = () => {
  const date = new Date($('date').value + 'T12:00:00');
  if (!Number.isFinite(+date)) return;
  if (view === 'month') { date.setDate(1); date.setMonth(date.getMonth() + direction); }
  else date.setDate(date.getDate() + direction * (view === 'week' ? 7 : 1));
  $('date').value = iso(date);
  render();
};

const endpoint = document.documentElement.dataset.eventsUrl || '/api/events';
fetch(endpoint, {cache: 'no-store'})
  .then(response => { if (!response.ok) throw Error('HTTP ' + response.status); return response.json(); })
  .then(data => {
    if (!Array.isArray(data)) throw Error('Неверный формат плана');
    events = data;
    for (const campus of [...new Set(events.map(event => event.campus))].filter(Boolean).sort()) $('campus').append(new Option(campus, campus));
    if ([...$('campus').options].some(option => option.value === params.get('campus'))) $('campus').value = params.get('campus');
    render();
  })
  .catch(() => { $('count').textContent = 'Не удалось загрузить план. Обновите страницу.'; });
