/**
 * 格子自动寻路（八方向），对应原作点击地面寻路。
 */
(function (root) {
  function key(x, y) { return x + ',' + y; }

  function astar(walkable, w, h, sx, sy, gx, gy) {
    sx = Math.max(0, Math.min(w - 1, sx | 0));
    sy = Math.max(0, Math.min(h - 1, sy | 0));
    gx = Math.max(0, Math.min(w - 1, gx | 0));
    gy = Math.max(0, Math.min(h - 1, gy | 0));
    if (!walkable(gx, gy)) {
      var found = null, best = 99;
      for (var r = 1; r <= 6 && !found; r++) {
        for (var dy = -r; dy <= r; dy++) {
          for (var dx = -r; dx <= r; dx++) {
            var nx = gx + dx, ny = gy + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && walkable(nx, ny)) {
              var d = Math.abs(dx) + Math.abs(dy);
              if (d < best) { best = d; found = { x: nx, y: ny }; }
            }
          }
        }
      }
      if (!found) return [];
      gx = found.x; gy = found.y;
    }
    if (!walkable(sx, sy)) return [{ x: gx, y: gy }];

    var open = [{ x: sx, y: sy, g: 0, f: Math.abs(gx - sx) + Math.abs(gy - sy) }];
    var came = {};
    var gScore = {};
    gScore[key(sx, sy)] = 0;
    var closed = {};
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    var guard = 0;

    while (open.length && guard++ < 2500) {
      open.sort(function (a, b) { return a.f - b.f; });
      var cur = open.shift();
      var ck = key(cur.x, cur.y);
      if (closed[ck]) continue;
      closed[ck] = true;
      if (cur.x === gx && cur.y === gy) {
        var out = [{ x: cur.x, y: cur.y }];
        var p = came[ck];
        while (p) {
          out.push({ x: p.x, y: p.y });
          p = came[key(p.x, p.y)];
        }
        out.reverse();
        return out;
      }
      for (var i = 0; i < dirs.length; i++) {
        var tx = cur.x + dirs[i][0], ty = cur.y + dirs[i][1];
        if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
        if (!walkable(tx, ty)) continue;
        if (dirs[i][0] && dirs[i][1] && (!walkable(cur.x + dirs[i][0], cur.y) || !walkable(cur.x, cur.y + dirs[i][1]))) continue;
        var tk = key(tx, ty);
        if (closed[tk]) continue;
        var ng = cur.g + (dirs[i][0] && dirs[i][1] ? 1.4 : 1);
        if (gScore[tk] != null && ng >= gScore[tk]) continue;
        gScore[tk] = ng;
        came[tk] = { x: cur.x, y: cur.y };
        open.push({ x: tx, y: ty, g: ng, f: ng + Math.abs(gx - tx) + Math.abs(gy - ty) });
      }
    }
    return [];
  }

  function mapRoute(portals, from, to) {
    if (from === to) return [];
    var q = [{ map: from, via: null, prev: null }];
    var seen = {};
    seen[from] = 1;
    while (q.length) {
      var cur = q.shift();
      var edges = portals[cur.map] || [];
      for (var i = 0; i < edges.length; i++) {
        var e = edges[i];
        if (seen[e.to]) continue;
        var node = { map: e.to, via: e, prev: cur };
        if (e.to === to) {
          var steps = [];
          var n = node;
          while (n && n.via) {
            steps.unshift({ from: n.prev.map, portal: n.via });
            n = n.prev;
          }
          return steps;
        }
        seen[e.to] = 1;
        q.push(node);
      }
    }
    return null;
  }

  root.PathFind = { astar: astar, mapRoute: mapRoute };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PathFind;
})(typeof window !== 'undefined' ? window : global);
