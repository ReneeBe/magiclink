export function dashboardPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MagicLink Analytics</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a12;
      color: #e2e2f0;
      min-height: 100dvh;
      padding: 2rem;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    h1 { font-size: 1.8rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    .subtitle { font-size: 0.85rem; color: #7070a0; margin-bottom: 2rem; }
    .login-card {
      max-width: 360px; margin: 4rem auto;
      background: #1a1a24; border: 1px solid #2e2e3e; border-radius: 1rem; padding: 2rem;
    }
    .login-card h2 { font-size: 1.1rem; margin-bottom: 1rem; }
    .login-card input {
      width: 100%; padding: 0.6rem 0.8rem; border-radius: 0.5rem;
      border: 1px solid #2e2e3e; background: #12121a; color: #e2e2f0;
      font-size: 0.85rem; outline: none; margin-bottom: 0.75rem;
    }
    .login-card input:focus { border-color: #7c6af7; }
    .login-card button {
      width: 100%; padding: 0.6rem; border-radius: 0.5rem; border: none;
      background: #7c6af7; color: #fff; font-weight: 600; font-size: 0.85rem;
      cursor: pointer;
    }
    .login-card button:hover { opacity: 0.9; }
    .login-error { color: #f38ba8; font-size: 0.8rem; margin-bottom: 0.5rem; }

    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card {
      background: #1a1a24; border: 1px solid #2e2e3e; border-radius: 0.75rem; padding: 1.25rem;
    }
    .stat-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #7070a0; margin-bottom: 0.35rem; }
    .stat-value { font-size: 1.8rem; font-weight: 800; font-family: ui-monospace, monospace; }
    .stat-value.purple { color: #7c6af7; }
    .stat-value.green { color: #a6e3a1; }
    .stat-value.amber { color: #f6c177; }
    .stat-value.pink { color: #f38ba8; }

    .section { margin-bottom: 2rem; }
    .section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #7070a0; margin-bottom: 0.75rem; }

    .bar-chart { display: flex; flex-direction: column; gap: 0.4rem; }
    .bar-row { display: flex; align-items: center; gap: 0.75rem; }
    .bar-label { font-size: 0.8rem; color: #9090b0; min-width: 160px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-track { flex: 1; height: 24px; background: #12121a; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; background: #7c6af7; border-radius: 4px; transition: width 0.3s; display: flex; align-items: center; padding-left: 0.5rem; }
    .bar-fill span { font-size: 0.7rem; font-weight: 600; color: #fff; white-space: nowrap; }

    .timeline { display: flex; flex-direction: column; gap: 0.3rem; }
    .timeline-row { display: flex; align-items: center; gap: 0.75rem; }
    .timeline-date { font-size: 0.75rem; color: #7070a0; min-width: 80px; font-family: ui-monospace, monospace; }
    .timeline-bar { flex: 1; height: 20px; background: #12121a; border-radius: 3px; overflow: hidden; }
    .timeline-fill { height: 100%; background: #a6e3a1; border-radius: 3px; display: flex; align-items: center; padding-left: 0.4rem; }
    .timeline-fill span { font-size: 0.65rem; font-weight: 600; color: #0a0a12; }
    .timeline-fill.all { background: #7c6af7; }
    .timeline-fill.all span { color: #fff; }

    table { width: 100%; border-collapse: collapse; }
    th { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #7070a0; text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #2e2e3e; }
    td { font-size: 0.8rem; color: #9090b0; padding: 0.5rem 0.75rem; border-bottom: 1px solid #1e1e2e; }
    tr:hover td { color: #e2e2f0; }
    .badge {
      display: inline-block; padding: 0.15rem 0.5rem; border-radius: 0.25rem;
      font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .badge.recruiter { background: rgba(124,106,247,0.15); color: #b0a4f7; }
    .badge.visitor { background: rgba(166,227,161,0.15); color: #a6e3a1; }
    .badge.personal { background: rgba(246,193,119,0.15); color: #f6c177; }

    .tokens-table { margin-top: 1rem; }
    .token-mono { font-family: ui-monospace, monospace; font-size: 0.75rem; color: #7070a0; }
    .usage-bar { display: inline-block; width: 60px; height: 6px; background: #1e1e2e; border-radius: 3px; overflow: hidden; vertical-align: middle; margin-left: 0.5rem; }
    .usage-bar-fill { height: 100%; background: #7c6af7; border-radius: 3px; }

    .loading { text-align: center; color: #7070a0; padding: 3rem; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container" id="app">
    <div class="login-card" id="login">
      <h2>Analytics Dashboard</h2>
      <div class="login-error" id="login-error" style="display:none"></div>
      <input type="password" id="password" placeholder="Admin password" />
      <button onclick="doLogin()">Log in</button>
    </div>
  </div>

  <script>
    var PASSWORD = '';
    var BASE = '';

    function doLogin() {
      PASSWORD = document.getElementById('password').value;
      if (!PASSWORD) return;
      document.getElementById('login').style.display = 'none';
      loadDashboard();
    }

    document.getElementById('password').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
    });

    async function apiFetch(path) {
      var res = await fetch(path, { headers: { 'X-Admin-Password': PASSWORD } });
      if (res.status === 401) {
        document.getElementById('login').style.display = '';
        document.getElementById('login-error').textContent = 'Wrong password';
        document.getElementById('login-error').style.display = '';
        throw new Error('Unauthorized');
      }
      return res.json();
    }

    async function loadDashboard() {
      var app = document.getElementById('app');
      app.innerHTML = '<div class="loading">Loading analytics...</div>';

      try {
        var [analytics, stats] = await Promise.all([
          apiFetch('/admin/analytics?days=90'),
          apiFetch('/admin/stats')
        ]);

        var tokens = stats.tokens || [];
        var recruiterTokens = tokens.filter(function(t) { return t.type === 'recruiter'; });
        var activeTokens = recruiterTokens.filter(function(t) { return new Date(t.expiresAt) > new Date() && t.totalUses < (t.limit || 20); });

        var totalUses = analytics.total || 0;
        var visitorUses = (analytics.byType && analytics.byType.visitor) || 0;
        var recruiterUses = (analytics.byType && analytics.byType.recruiter) || 0;
        var personalUses = (analytics.byType && analytics.byType.personal) || 0;

        // Build project bars
        var byProject = analytics.byProject || {};
        var projectKeys = Object.keys(byProject).sort(function(a, b) { return byProject[b] - byProject[a]; });
        var maxProject = projectKeys.length ? byProject[projectKeys[0]] : 1;

        var projectBars = projectKeys.map(function(p) {
          var pct = Math.round((byProject[p] / maxProject) * 100);
          return '<div class="bar-row">'
            + '<span class="bar-label">' + p + '</span>'
            + '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"><span>' + byProject[p] + '</span></div></div>'
            + '</div>';
        }).join('');

        // Build timelines
        var byDay = analytics.byDay || {};
        var dayKeys = Object.keys(byDay).sort();

        // Last 14 days (zoomed in)
        var last14 = dayKeys.slice(-14);
        var maxDay14 = Math.max.apply(null, last14.map(function(d) { return byDay[d]; }).concat([1]));
        var timelineBars14 = last14.map(function(d) {
          var pct = Math.round((byDay[d] / maxDay14) * 100);
          return '<div class="timeline-row">'
            + '<span class="timeline-date">' + d.slice(5) + '</span>'
            + '<div class="timeline-bar"><div class="timeline-fill" style="width:' + pct + '%"><span>' + byDay[d] + '</span></div></div>'
            + '</div>';
        }).join('');

        // All time
        var maxDayAll = Math.max.apply(null, dayKeys.map(function(d) { return byDay[d]; }).concat([1]));
        var timelineBarsAll = dayKeys.map(function(d) {
          var pct = Math.round((byDay[d] / maxDayAll) * 100);
          return '<div class="timeline-row">'
            + '<span class="timeline-date">' + d.slice(5) + '</span>'
            + '<div class="timeline-bar"><div class="timeline-fill all" style="width:' + pct + '%"><span>' + byDay[d] + '</span></div></div>'
            + '</div>';
        }).join('');

        // Build recent events table
        var events = (analytics.recentEvents || []).slice(0, 30);
        var eventRows = events.map(function(e) {
          var time = new Date(e.timestamp);
          var timeStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          return '<tr>'
            + '<td>' + timeStr + '</td>'
            + '<td>' + e.projectId + '</td>'
            + '<td><span class="badge ' + e.tokenType + '">' + e.tokenType + '</span></td>'
            + '<td class="token-mono">' + (e.tokenPrefix || '') + '</td>'
            + '</tr>';
        }).join('');

        // Build tokens table
        var tokenRows = recruiterTokens.sort(function(a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); }).slice(0, 20).map(function(t) {
          var expired = new Date(t.expiresAt) < new Date();
          var uses = t.totalUses || 0;
          var limit = t.limit || 20;
          var pct = Math.min(Math.round((uses / limit) * 100), 100);
          var created = new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return '<tr>'
            + '<td class="token-mono">' + t.token.slice(0, 12) + '...</td>'
            + '<td>' + (t.email || '') + '</td>'
            + '<td>' + t.source + '</td>'
            + '<td>' + uses + '/' + limit + '<span class="usage-bar"><span class="usage-bar-fill" style="width:' + pct + '%"></span></span></td>'
            + '<td>' + created + '</td>'
            + '<td>' + (expired ? '<span style="color:#f38ba8">expired</span>' : '<span style="color:#a6e3a1">active</span>') + '</td>'
            + '</tr>';
        }).join('');

        app.innerHTML = '<h1>MagicLink Analytics</h1>'
          + '<p class="subtitle">Last 30 days</p>'

          // Stat cards
          + '<div class="grid">'
          + '<div class="stat-card"><div class="stat-label">Total API Calls</div><div class="stat-value purple">' + totalUses + '</div></div>'
          + '<div class="stat-card"><div class="stat-label">Visitor Uses</div><div class="stat-value green">' + visitorUses + '</div></div>'
          + '<div class="stat-card"><div class="stat-label">Recruiter Uses</div><div class="stat-value amber">' + recruiterUses + '</div></div>'
          + '<div class="stat-card"><div class="stat-label">Active Tokens</div><div class="stat-value pink">' + activeTokens.length + '</div></div>'
          + '</div>'

          // Usage by project
          + '<div class="section">'
          + '<div class="section-title">Usage by Project</div>'
          + '<div class="bar-chart">' + (projectBars || '<p style="color:#7070a0;font-size:0.85rem;">No data yet</p>') + '</div>'
          + '</div>'

          // Daily timeline (zoomed)
          + '<div class="section">'
          + '<div class="section-title">Last 14 Days</div>'
          + '<div class="timeline">' + (timelineBars14 || '<p style="color:#7070a0;font-size:0.85rem;">No data yet</p>') + '</div>'
          + '</div>'

          // All time timeline
          + '<div class="section">'
          + '<div class="section-title">All Time</div>'
          + '<div class="timeline">' + (timelineBarsAll || '<p style="color:#7070a0;font-size:0.85rem;">No data yet</p>') + '</div>'
          + '</div>'

          // Tokens
          + '<div class="section">'
          + '<div class="section-title">Recruiter Tokens</div>'
          + '<table class="tokens-table"><thead><tr><th>Token</th><th>Email</th><th>Source</th><th>Usage</th><th>Created</th><th>Status</th></tr></thead>'
          + '<tbody>' + (tokenRows || '<tr><td colspan="6" style="color:#7070a0">No tokens yet</td></tr>') + '</tbody></table>'
          + '</div>'

          // Recent events
          + '<div class="section">'
          + '<div class="section-title">Recent Events</div>'
          + '<table><thead><tr><th>Time</th><th>Project</th><th>Type</th><th>Token</th></tr></thead>'
          + '<tbody>' + (eventRows || '<tr><td colspan="4" style="color:#7070a0">No events yet</td></tr>') + '</tbody></table>'
          + '</div>';

      } catch (e) {
        if (e.message !== 'Unauthorized') {
          app.innerHTML = '<div class="login-card"><h2>Error</h2><p style="color:#f38ba8">' + e.message + '</p></div>';
        }
      }
    }
  </script>
</body>
</html>`
}
