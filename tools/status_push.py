#!/usr/bin/env python3
import json, os, time, urllib.request
from datetime import datetime, timedelta, timezone

BASE = "/opt/agh-watch"
TOPIC = open(os.path.join(BASE, "status_topic.txt")).read().strip()

def cpu_pct():
    def snap():
        with open("/proc/stat") as f:
            parts = f.readline().split()[1:]
        vals = [int(x) for x in parts]
        idle = vals[3] + vals[4]
        return sum(vals), idle
    t1, i1 = snap()
    time.sleep(1)
    t2, i2 = snap()
    dt = t2 - t1
    if dt <= 0:
        return 0.0
    return round(100.0 * (1 - (i2 - i1) / dt), 1)

def mem():
    info = {}
    with open("/proc/meminfo") as f:
        for line in f:
            k, v = line.split(":")
            info[k.strip()] = int(v.split()[0])
    total = info["MemTotal"]
    avail = info.get("MemAvailable", info.get("MemFree", 0))
    used = total - avail
    return round(100.0 * used / total, 1), round(used / 1048576, 2), round(total / 1048576, 2)

def disk():
    st = os.statvfs("/")
    total = st.f_blocks * st.f_frsize
    free = st.f_bavail * st.f_frsize
    used = total - free
    return round(100.0 * used / total, 1), round(used / 1073741824, 1), round(total / 1073741824, 1)

def svc(name):
    return os.system("systemctl is-active --quiet " + name) == 0

def listening(proto, port):
    hexport = "%04X" % port
    for suffix in ("", "6"):
        try:
            with open("/proc/net/" + proto + suffix) as f:
                lines = f.read().splitlines()[1:]
        except OSError:
            continue
        for ln in lines:
            parts = ln.split()
            if len(parts) > 3 and parts[1].endswith(":" + hexport):
                if proto == "udp" or parts[3] == "0A":
                    return True
    return False

def swap_pct():
    info = {}
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                k, v = line.split(":")
                info[k.strip()] = int(v.split()[0])
    except Exception:
        return -1
    total = info.get("SwapTotal", 0)
    if total <= 0:
        return -1
    free = info.get("SwapFree", 0)
    return round(100.0 * (total - free) / total, 1)

def net_gb():
    best = None
    try:
        with open("/proc/net/dev") as f:
            lines = f.read().splitlines()[2:]
    except Exception:
        return -1, -1
    for ln in lines:
        if ":" not in ln:
            continue
        name, rest = ln.split(":", 1)
        name = name.strip()
        if name == "lo":
            continue
        nums = rest.split()
        rx, tx = int(nums[0]), int(nums[8])
        if best is None or rx > best[0]:
            best = (rx, tx)
    if best is None:
        return -1, -1
    return round(best[0] / 1073741824, 2), round(best[1] / 1073741824, 2)

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

def agh_today():
    path = "/opt/AdGuardHome/data/querylog.json"
    cst = timezone(timedelta(hours=8))
    today = datetime.now(cst).date()
    total = 0
    blocked = 0
    try:
        with open(path, errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    e = json.loads(line)
                except Exception:
                    continue
                t = str(e.get("T", ""))
                try:
                    dt = datetime.strptime(t[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
                except Exception:
                    continue
                if dt.astimezone(cst).date() != today:
                    continue
                total += 1
                if entry_blocked(e):
                    blocked += 1
    except Exception:
        return -1, -1
    return total, blocked

def egress_ms():
    t0 = time.time()
    try:
        req = urllib.request.Request("https://www.google.com/generate_204")
        urllib.request.urlopen(req, timeout=6).read()
        return int((time.time() - t0) * 1000)
    except Exception:
        return -1

def main():
    with open("/proc/uptime") as f:
        up = int(float(f.read().split()[0]))
    with open("/proc/loadavg") as f:
        load = f.read().split()[0]
    mp, mu, mt = mem()
    dp, du, dt = disk()
    nrx, ntx = net_gb()
    aq, ab = agh_today()
    data = {"cpu": cpu_pct(), "mem_pct": mp, "mem_used": mu, "mem_total": mt,
            "disk_pct": dp, "disk_used": du, "disk_total": dt,
            "up_days": round(up / 86400, 1), "load": load,
            "singbox": svc("sing-box"), "agh": svc("AdGuardHome"),
            "watch": svc("agh-watch"),
            "hy2": listening("udp", 443), "reality": listening("tcp", 443),
            "egress_ms": egress_ms(), "ts": int(time.time()),
            "swap_pct": swap_pct(), "net_rx_gb": nrx, "net_tx_gb": ntx,
            "agh_queries_today": aq, "agh_blocked_today": ab}
    body = json.dumps({"topic": TOPIC, "title": "tokyo-status",
                       "message": json.dumps(data)}).encode()
    req = urllib.request.Request("https://ntfy.sh/", data=body,
                                 headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=15).read()
    print(json.dumps(data))

main()
