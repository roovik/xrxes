// XRXES admin: leads from the contact form and anonymous showroom view counts. The key stays in this browser tab only.
(function () {
  var a = document.getElementById('a'), K = ''; try { K = sessionStorage.getItem('xr-admin') || ''; } catch (e) {}
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function signin(err) {
    a.innerHTML = '<form class="form" id="f" style="max-width:420px"><label>Admin key <input name="k" type="password" required autocomplete="current-password"></label><button class="btn" type="submit">Open</button><p class="msg">' + esc(err || '') + '</p></form>';
    document.getElementById('f').onsubmit = function (e) { e.preventDefault(); K = this.k.value; try { sessionStorage.setItem('xr-admin', K); } catch (x) {} load(); };
  }
  function load() {
    if (!K) return signin();
    fetch('/api/admin', { headers: { 'x-admin-key': K } }).then(function (r) { return r.json(); }).then(function (r) {
      if (!r.ok) { try { sessionStorage.removeItem('xr-admin'); } catch (x) {} K = ''; return signin(r.error); }
      a.innerHTML = '<h3>Leads (' + r.leads.length + ')</h3><div class="tw"><table><thead><tr><th>Date</th><th>Name</th><th>Email</th><th>Company</th><th>Interest</th><th>Message</th></tr></thead><tbody>' + r.leads.map(function (l) { return '<tr><td>' + new Date(l.at).toLocaleDateString() + '</td><td>' + esc(l.name) + '</td><td><a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a></td><td>' + esc(l.company) + '</td><td>' + esc(l.interest) + '</td><td>' + esc(l.message) + '</td></tr>'; }).join('') + '</tbody></table></div>'
        + '<h3>Showroom opens by day</h3><div class="tw"><table><tbody>' + r.days.map(function (d) { return '<tr><td>' + esc(d.day) + '</td><td>' + d.n + '</td></tr>'; }).join('') + '</tbody></table></div>'
        + '<h3>Product views</h3><div class="tw"><table><thead><tr><th>Event</th><th>Product</th><th>Count</th></tr></thead><tbody>' + r.events.filter(function (e) { return e.type !== 'open'; }).map(function (e) { return '<tr><td>' + esc(e.type) + '</td><td>' + esc(e.slug) + '</td><td>' + e.n + '</td></tr>'; }).join('') + '</tbody></table></div>';
    });
  }
  load();
})();
