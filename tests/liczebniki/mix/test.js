// Раздел «Mieszane» — заглушки: логика будет по описанию.
[
  { id: 'liczebniki-mix',     title: 'Rzeczownik + czasownik', icon: 'R+C' },
  { id: 'liczebniki-mix-num', title: 'Liczebnik',              icon: '2+' },
  { id: 'liczebniki-mix-mix', title: 'Mieszane',               icon: '⇄' },
].forEach(function (t) {
  Polski.register({ id: t.id, title: t.title, icon: t.icon, soon: true });
});
