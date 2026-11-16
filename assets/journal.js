(() => {
  'use strict';
  const key = 'sakin.journal.v1';
  const list = document.getElementById('entries');
  const status = document.getElementById('entryStatus');
  const form = document.getElementById('entryForm');
  const title = document.getElementById('entryName');
  const when = document.getElementById('entryWhen');
  const format = new Intl.DateTimeFormat('ar', {dateStyle:'medium', timeStyle:'short'});
  function load() {
    const entries = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(entries)) throw new Error('Invalid journal');
    return entries;
  }
  function render(entries) {
    list.textContent = '';
    entries.sort((left, right) => left.time - right.time);
    for (const entry of entries) {
      const row = document.createElement('li');
      const details = document.createElement('div');
      const name = document.createElement('strong');
      const time = document.createElement('time');
      name.textContent = entry.title;
      time.textContent = format.format(entry.time);
      details.append(name, time);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'حذف';
      remove.setAttribute('aria-label','حذف موعد ' + entry.title);
      remove.onclick = () => update(items => items.filter(item => item.id !== entry.id), 'تم حذف الموعد');
      row.append(details, remove);
      list.append(row);
    }
  }
  function update(edit, message) {
    try {
      const entries = edit(load());
      localStorage.setItem(key, JSON.stringify(entries));
      render(entries);
      status.textContent = message;
      return true;
    } catch {
      status.textContent = 'تعذّر حفظ التغيير على هذا الجهاز.';
      return false;
    }
  }
  form.onsubmit = event => {
    event.preventDefault();
    const name = title.value.trim();
    const time = new Date(when.value).getTime();
    if (!name || !Number.isFinite(time)) { status.textContent = 'أدخل عنوان الموعد وتاريخه.'; return; }
    const entry = { id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random(), title:name, time };
    if (update(items => items.concat(entry), 'انحفظ الموعد')) form.reset();
  };
  window.SakinJournal = { refresh() {
    try {
      const entries = load();
      render(entries);
      status.textContent = entries.length ? 'مواعيدي' : 'ما عندك مواعيد مسجّلة.';
    } catch { status.textContent = 'تعذّرت قراءة المواعيد المحفوظة.'; }
  }};
})();
