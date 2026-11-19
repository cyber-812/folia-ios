#!/usr/bin/env python3
import json, os, time, urllib.request

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
    try:
        with open("/proc/net/" + proto) as f:
            lines = f.read().splitlines()[1:]
    except OSError:
        return False
    for ln in lines:
        parts = ln.split()
        if len(parts) > 3 and parts[1].endswith(":" + hexport):
            if proto == "udp" or parts[3] == "0A":
                return True
    return False

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
    data = {"cpu": cpu_pct(), "mem_pct": mp, "mem_used": mu, "mem_total": mt,
            "disk_pct": dp, "disk_used": du, "disk_total": dt,
            "up_days": round(up / 86400, 1), "load": load,
            "singbox": svc("sing-box"), "agh": svc("AdGuardHome"),
            "watch": svc("agh-watch"),
            "hy2": listening("udp", 443), "reality": listening("tcp", 443),
            "egress_ms": egress_ms(), "ts": int(time.time())}
    body = json.dumps({"topic": TOPIC, "title": "tokyo-status",
                       "message": json.dumps(data)}).encode()
    req = urllib.request.Request("https://ntfy.sh/", data=body,
                                 headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=15).read()
    print(json.dumps(data))

main()
