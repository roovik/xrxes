// XRXES company site: the contact form. Messages go to /api/contact and are read at /admin/.
(function () {
  var f = document.getElementById('cf'); if (!f) return;
  f.addEventListener('submit', function (e) {
    e.preventDefault(); var d = {}; [].forEach.call(f.elements, function (i) { if (i.name) d[i.name] = i.value; });
    var b = f.querySelector('button'), m = f.querySelector('.msg'); b.disabled = true; m.textContent = '';
    fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) }).then(function (r) { return r.json(); }).then(function (r) {
      b.disabled = false; m.textContent = r.ok ? 'Thank you. We will be in touch soon.' : (r.error || 'That did not go through. Please try again.'); if (r.ok) f.reset();
    }, function () { b.disabled = false; m.textContent = 'No connection. Please try again.'; });
  });
})();
