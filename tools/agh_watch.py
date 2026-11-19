#!/usr/bin/env python3
import json, os, re, time, urllib.request

BASE = "/opt/agh-watch"
LOG = "/opt/AdGuardHome/data/querylog.json"
YAML = "/opt/AdGuardHome/AdGuardHome.yaml"
STATE_F = os.path.join(BASE, "state.json")
PENDING = os.path.join(BASE, "pending.jsonl")
TOPIC = open(os.path.join(BASE, "topic.txt")).read().strip()

WHITELIST = {"restapi.amap.com", "www.amap.com", "map.amap.com", "mps.amap.com",
             "cache.amap.com", "ditu.amap.com", "wap.amap.com", "html5.amap.com",
             "mobile.amap.com", "m.amap.com", "api.amap.com"}
SUFFIXES = (".amap.com", ".alicdn.com", ".tanx.com", ".umeng.com", ".mmstat.com",
            ".alibaba.com", ".taobao.com", ".tmall.com")
ROOTS = {"amap.com", "alicdn.com", "tanx.com", "umeng.com", "mmstat.com",
         "alibaba.com", "taobao.com", "tmall.com"}
KEYWORDS = {"ad", "ads", "adiu", "tanx", "umeng", "mmstat", "beacon", "track",
            "tracking", "stat", "stats", "analytics", "log", "logs", "alog",
            "ulogs", "promo", "promotion", "click", "opehs", "atanx"}

def load_rules():
    rules = set()
    try:
        txt = open(YAML).read()
        for m in re.finditer(r"\|\|([a-z0-9.\-]+)\^", txt):
            rules.add(m.group(1).lower())
    except Exception:
        pass
    return rules

def blocked_by_rules(qh, rules):
    parts = qh.split(".")
    for i in range(len(parts) - 1):
        if ".".join(parts[i:]) in rules:
            return True
    return False

def entry_blocked(e):
    if "0.0.0.0" in str(e.get("Answer", "")):
        return True
    r = e.get("Result") or {}
    if isinstance(r, dict):
        if r.get("Rule") or r.get("Service"):
            return True
        reason = str(r.get("Reason", ""))
        return reason not in ("", "0", "NotFiltered", "Not filtered")
    return False

def watched(qh):
    if qh in WHITELIST or qh in ROOTS:
        return False
    return qh.endswith(SUFFIXES)

def tier_of(qh):
    if any(label in KEYWORDS for label in qh.split(".")):
        return 1
    return 2

def ntfy(title, msg):
    data = json.dumps({"topic": TOPIC, "title": title, "message": msg,
                       "tags": ["warning"]}).encode()
    req = urllib.request.Request("https://ntfy.sh/", data=data,
                                 headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=15).read()

def main():
    fresh = not os.path.exists(STATE_F)
    state = {"offset": 0, "reported": {}, "last_bark": 0}
    if not fresh:
        try:
            state = json.load(open(STATE_F))
        except Exception:
            pass
    if fresh:
        try:
            state["offset"] = os.path.getsize(LOG)
        except Exception:
            state["offset"] = 0
    rules = load_rules()
    rules_ts = time.time()
    print("agh-watch started, offset", state["offset"], flush=True)
    while True:
        try:
            if time.time() - rules_ts > 3600:
                rules = load_rules()
                rules_ts = time.time()
            size = os.path.getsize(LOG)
            if size < state["offset"]:
                state["offset"] = 0
            with open(LOG, "rb") as f:
                f.seek(state["offset"])
                chunk = f.read()
            if chunk:
                state["offset"] += len(chunk)
                dirty = False
                for line in chunk.decode("utf-8", "ignore").splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        e = json.loads(line)
                    except Exception:
                        continue
                    qh = (e.get("QH") or "").lower().rstrip(".")
                    if not qh or not watched(qh):
                        continue
                    if blocked_by_rules(qh, rules) or entry_blocked(e):
                        continue
                    if qh in state["reported"]:
                        continue
                    t = tier_of(qh)
                    state["reported"][qh] = int(time.time())
                    dirty = True
                    rec = {"domain": qh, "tier": t, "time": e.get("T", ""),
                           "ts": int(time.time())}
                    with open(PENDING, "a") as pf:
                        pf.write(json.dumps(rec) + "\n")
                    print("candidate", qh, "tier", t, flush=True)
                    if t == 1 and time.time() - state.get("last_bark", 0) > 1200:
                        state["last_bark"] = int(time.time())
                        dirty = True
                        try:
                            ntfy("gaode-ad-alert",
                                 qh + " was just requested by Amap and NOT blocked (suspected ad domain). Logged to the pending list; waiting for the user to tap Add-block in chat.")
                        except Exception as ex:
                            print("ntfy fail", ex, flush=True)
                if dirty:
                    json.dump(state, open(STATE_F, "w"))
        except Exception as ex:
            print("loop error", ex, flush=True)
        time.sleep(5)

main()
