"""Linux cgroup v2 / Docker：预热后测量容器工作集，不包含浏览器内存。"""
import argparse
import concurrent.futures
import json
import pathlib
import subprocess
import threading
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("container")
parser.add_argument("url")
parser.add_argument("--requests", type=int, default=1000)
parser.add_argument("--concurrency", type=int, default=10)
args = parser.parse_args()
if args.requests < 1 or args.concurrency < 1:
    parser.error("requests 和 concurrency 必须大于 0")

pid = subprocess.check_output(
    ["docker", "inspect", "--format", "{{.State.Pid}}", args.container], text=True
).strip()
cgroup = next(
    line.removeprefix("0::")
    for line in pathlib.Path(f"/proc/{pid}/cgroup").read_text().splitlines()
    if line.startswith("0::")
)
root = pathlib.Path("/sys/fs/cgroup") / cgroup.lstrip("/")


def memory():
    current = int((root / "memory.current").read_text())
    stats = dict(line.split() for line in (root / "memory.stat").read_text().splitlines())
    # 与 Linux docker stats 类似，减去非活跃文件缓存。
    return max(0, current - int(stats["inactive_file"])) / 1024**2


def request(_):
    with urllib.request.urlopen(args.url, timeout=10) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status}")
        response.read()


for i in range(20):
    request(i)
idle = memory()
samples = [idle]
stop = threading.Event()


def sample():
    while not stop.wait(0.05):
        samples.append(memory())


sampler = threading.Thread(target=sample)
sampler.start()
try:
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        for _ in pool.map(request, range(args.requests)):
            pass
finally:
    stop.set()
    sampler.join()
after = memory()
print(json.dumps({
    "container": args.container,
    "requests": args.requests,
    "concurrency": args.concurrency,
    "warm_idle_mib": round(idle, 2),
    "sampled_peak_mib": round(max(*samples, after), 2),
    "after_mib": round(after, 2),
}, indent=2))
