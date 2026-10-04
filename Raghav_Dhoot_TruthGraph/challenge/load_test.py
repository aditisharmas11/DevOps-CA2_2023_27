import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import urlopen
from urllib.error import HTTPError, URLError

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8001/metrics"
REQUESTS = int(sys.argv[2]) if len(sys.argv) > 2 else 200
CONCURRENCY = int(sys.argv[3]) if len(sys.argv) > 3 else 20


def make_request(_):
    start = time.perf_counter()

    try:
        with urlopen(URL, timeout=10) as response:
            response.read()
            return response.status, time.perf_counter() - start

    except HTTPError as exc:
        return exc.code, time.perf_counter() - start

    except URLError:
        return 0, time.perf_counter() - start


print(f"Target: {URL}")
print(f"Requests: {REQUESTS}")
print(f"Concurrency: {CONCURRENCY}")
print()

start_time = time.perf_counter()

results = []

with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
    futures = [executor.submit(make_request, i) for i in range(REQUESTS)]

    for future in as_completed(futures):
        results.append(future.result())

elapsed = time.perf_counter() - start_time

successful = sum(1 for status, _ in results if 200 <= status < 400)
failed = REQUESTS - successful

latencies = [latency for _, latency in results]

print("----- RESULTS -----")
print(f"Successful: {successful}")
print(f"Failed:     {failed}")
print(f"Success:    {(successful / REQUESTS) * 100:.2f}%")
print(f"Total time: {elapsed:.2f}s")
print(f"Throughput: {REQUESTS / elapsed:.2f} requests/sec")

if latencies:
    print(f"Average latency: {(sum(latencies) / len(latencies)) * 1000:.2f} ms")
    print(f"Maximum latency: {max(latencies) * 1000:.2f} ms")
