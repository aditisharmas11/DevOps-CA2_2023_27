"""Generate realistic traffic for the dashboards.

Sends real passengers from airline_dataset.csv to /predict and, optionally,
a share of invalid requests (HTTP 422) so the error-rate panel has data.

    python scripts/load_test.py --url http://127.0.0.1:8000 --rps 10 --duration 300 --invalid-ratio 0.03
"""
import argparse
import math
import random
import threading
import time
from collections import Counter
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
FEATURES = ['Gender', 'Customer Type', 'Age', 'Type of Travel', 'Class', 'Flight Distance',
            'Inflight wifi service', 'Departure/Arrival time convenient', 'Ease of Online booking',
            'Gate location', 'Food and drink', 'Online boarding', 'Seat comfort', 'Inflight entertainment',
            'On-board service', 'Leg room service', 'Baggage handling', 'Checkin service', 'Inflight service',
            'Cleanliness', 'Departure Delay in Minutes']


def load_passengers(path, n=2000):
    df = pd.read_csv(path, usecols=FEATURES).sample(n, random_state=7)
    # Missing values are simply left out of the JSON - the API imputes them
    return [{k: v for k, v in row.items() if not (isinstance(v, float) and math.isnan(v))}
            for row in df.to_dict(orient='records')]


def main():
    parser = argparse.ArgumentParser()
    # 127.0.0.1, not localhost: on Windows 'localhost' tries IPv6 first and adds ~2 s per new connection
    parser.add_argument('--url', default='http://127.0.0.1:8000')
    parser.add_argument('--rps', type=float, default=10)
    parser.add_argument('--duration', type=int, default=300, help='seconds')
    parser.add_argument('--invalid-ratio', type=float, default=0.03)
    parser.add_argument('--batch-ratio', type=float, default=0.1)
    parser.add_argument('--data', default=str(ROOT / 'airline_dataset.csv'))
    args = parser.parse_args()

    passengers = load_passengers(args.data)
    counts, lock = Counter(), threading.Lock()
    session = requests.Session()

    def fire():
        roll = random.random()
        try:
            if roll < args.invalid_ratio:
                body = {**random.choice(passengers), 'Class': 'First'}       # not a valid class -> 422
                r = session.post(f'{args.url}/predict', json=body, timeout=5)
            elif roll < args.invalid_ratio + args.batch_ratio:
                r = session.post(f'{args.url}/predict/batch',
                                 json={'passengers': random.sample(passengers, 20)}, timeout=5)
            else:
                r = session.post(f'{args.url}/predict', json=random.choice(passengers), timeout=5)
            status = r.status_code
        except requests.RequestException:
            status = 'conn-error'
        with lock:
            counts[status] += 1

    end, interval = time.time() + args.duration, 1 / args.rps
    print(f'Sending ~{args.rps} req/s to {args.url} for {args.duration}s ...')
    next_report = time.time() + 10
    while time.time() < end:
        threading.Thread(target=fire, daemon=True).start()
        time.sleep(random.expovariate(1 / interval))
        if time.time() >= next_report:
            print(dict(counts), flush=True)
            next_report += 10
    time.sleep(2)
    print('Final:', dict(counts))


if __name__ == '__main__':
    main()
