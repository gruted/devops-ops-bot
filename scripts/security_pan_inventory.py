#!/usr/bin/env python3
"""
security_pan_inventory.py

Scan a repository for possible PANs (credit card Primary Account Numbers) and common secret patterns.
Produce a CSV inventory and a JSON rotation-plan template that contains where secrets were found and suggested rotation actions.

Usage:
  python3 scripts/security_pan_inventory.py --repo . --out reports/pan_inventory.csv --report-json reports/pan_report.json

Notes:
- This script is read-only: it does not modify git history or files.
- It detects PAN-like numbers via regex and validates them with Luhn.
- It detects common API key patterns (AWS, GCP, Azure, generic API keys), private key files, and .env exposures.
- Rotation actions are suggestions only. Actual rotation requires provider-specific API calls and credentials.

"""
import re
import os
import sys
import csv
import json
import argparse
from pathlib import Path

# Regexes
PAN_RE = re.compile(r"(?:(?:\d[ -]*?){13,19})")
# AWS Access Key ID (AKIA...)
AWS_KEY_RE = re.compile(r"AKIA[0-9A-Z]{16}")
# GCP service account JSON key file detection: "private_key_id" and "private_key"
GCP_KEY_JSON_RE = re.compile(r'"private_key_id"\s*:\s*"[0-9a-fA-F]+"')
# Azure client id/secrets (simple heuristics)
AZURE_CLIENT_ID_RE = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
# Generic API key: long base64-like token
GENERIC_KEY_RE = re.compile(r"[A-Za-z0-9_\-]{32,}")

# Luhn algorithm for PAN validation

def luhn_checksum(card_number: str) -> bool:
    digits = [int(d) for d in re.sub(r"\D", "", card_number)]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    parity = len(digits) % 2
    for i, d in enumerate(digits):
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0


def is_likely_pan(s: str) -> bool:
    # Clean and check
    s_clean = re.sub(r"[ -]", "", s)
    return luhn_checksum(s_clean)


def scan_file(path: Path):
    results = []
    try:
        text = path.read_text(errors='ignore')
    except Exception:
        return results

    # PANs
    for m in PAN_RE.finditer(text):
        candidate = m.group(0)
        if is_likely_pan(candidate):
            results.append({
                'type': 'PAN',
                'match': candidate,
                'context': text[max(0, m.start()-50):m.end()+50].replace('\n', ' ')
            })

    # AWS key
    for m in AWS_KEY_RE.finditer(text):
        results.append({'type': 'AWS_ACCESS_KEY_ID', 'match': m.group(0), 'context': text[max(0, m.start()-50):m.end()+50].replace('\n', ' ')})

    # GCP JSON key metadata
    if GCP_KEY_JSON_RE.search(text):
        results.append({'type': 'GCP_SERVICE_ACCOUNT_JSON', 'match': 'found', 'context': 'contains private_key_id/private_key fields'})

    # Azure-ish GUIDs (warn only)
    for m in AZURE_CLIENT_ID_RE.finditer(text):
        results.append({'type': 'POSSIBLE_GUID', 'match': m.group(0), 'context': text[max(0, m.start()-50):m.end()+50].replace('\n', ' ')})

    # Generic long tokens (filter out common words and hex long sequences)
    for m in GENERIC_KEY_RE.finditer(text):
        tok = m.group(0)
        if len(tok) >= 40:
            results.append({'type': 'POSSIBLE_API_KEY', 'match': tok[:64], 'context': text[max(0, m.start()-50):m.end()+50].replace('\n', ' ')})

    # .pem / private key blocks
    if 'BEGIN PRIVATE KEY' in text or 'BEGIN RSA PRIVATE KEY' in text:
        results.append({'type': 'PRIVATE_KEY_BLOCK', 'match': 'found', 'context': 'contains PEM private key block'})

    # .env exposures
    if '.env' in path.name or re.search(r"\b[A-Za-z_]+=[^\n]+", text):
        # crude: flag files that look like env files
        for line in text.splitlines():
            if '=' in line and not line.strip().startswith('#') and len(line.split('=', 1)[1].strip())>0:
                key = line.split('=',1)[0].strip()
                val = line.split('=',1)[1].strip()
                if len(val) >= 8:
                    results.append({'type':'ENV_CRED','match':f"{key}=REDACTED","context":path.name})
                    break

    return results


def scan_repo(repo_root: Path, exclude_dirs=None):
    inventory = []
    for root, dirs, files in os.walk(repo_root):
        # simple excludes
        if exclude_dirs:
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
        # skip .git
        if '.git' in root.split(os.sep):
            continue
        for f in files:
            p = Path(root) / f
            # skip binary-ish
            if p.suffix in ['.png', '.jpg', '.jpeg', '.gif', '.exe', '.dll', '.so', '.pyc']:
                continue
            findings = scan_file(p)
            for fi in findings:
                inventory.append({
                    'path': str(p.relative_to(repo_root)),
                    'type': fi['type'],
                    'match': fi['match'],
                    'context': fi.get('context','')
                })
    return inventory


def suggest_rotation_action(item):
    t = item['type']
    if t == 'PAN':
        return 'Remove PAN from repo, mark as incident, and follow PCI-DSS breach notification. If this is a stored card under your control move customers to a compliant vault (e.g., Stripe, Braintree) and re-issue cards if required.'
    if t == 'AWS_ACCESS_KEY_ID':
        return 'Disable the exposed AWS Access Key, create a new key with least privilege, update deployment secrets (CI/Vault), rotate any running services using it, then delete old key.'
    if t == 'GCP_SERVICE_ACCOUNT_JSON':
        return 'Revoke/disable the service account key in GCP IAM, create a new key, store in secret manager or vault, update deployments, and monitor.'
    if t == 'PRIVATE_KEY_BLOCK':
        return 'Treat as highly sensitive. Revoke certificates / keys, generate new keys, and replace in all services. Rotate any credentials derived from this key.'
    if t == 'ENV_CRED' or t == 'POSSIBLE_API_KEY' or t == 'POSSIBLE_GUID':
        return 'Identify the credential type, rotate the secret in the provider, and update secret stores (Vault/Bitwarden/CI).' 
    return 'Manual review required.'


def write_reports(inventory, csv_path: Path, json_path: Path):
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.parent.mkdir(parents=True, exist_ok=True)

    with csv_path.open('w', newline='') as cf:
        writer = csv.DictWriter(cf, fieldnames=['path','type','match','context'])
        writer.writeheader()
        for it in inventory:
            row = it.copy()
            # redact long matches for CSV
            if len(str(row.get('match',''))) > 80:
                row['match'] = str(row['match'])[:80] + '...'
            writer.writerow(row)

    # Build JSON report with rotation suggestions
    report = {'summary': {}, 'items': []}
    counts = {}
    for it in inventory:
        counts[it['type']] = counts.get(it['type'], 0) + 1
        report['items'].append({
            'path': it['path'],
            'type': it['type'],
            'match': it['match'] if len(str(it['match']))<200 else str(it['match'])[:200]+'...',
            'context': it.get('context','')[:400],
            'suggested_action': suggest_rotation_action(it)
        })
    report['summary'] = {'total_findings': len(inventory), 'by_type': counts}

    with json_path.open('w') as jf:
        json.dump(report, jf, indent=2)

    print(f"Wrote CSV: {csv_path}")
    print(f"Wrote JSON: {json_path}")


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--repo', default='.', help='Path to repo root')
    p.add_argument('--out', default='reports/pan_inventory.csv', help='CSV output path')
    p.add_argument('--report-json', default='reports/pan_report.json', help='JSON report path')
    p.add_argument('--exclude', default='.venv,.venv3,node_modules,dist,build', help='Comma-separated dirs to exclude')
    return p.parse_args()


def main():
    args = parse_args()
    repo = Path(args.repo).resolve()
    out = Path(args.out)
    repjson = Path(args.report_json)
    exclude = [d.strip() for d in args.exclude.split(',') if d.strip()]

    print(f"Scanning repo: {repo}")
    inventory = scan_repo(repo, exclude_dirs=exclude)
    write_reports(inventory, out, repjson)

    if any(i['type']=='PAN' for i in inventory):
        print('\nWARNING: PAN(s) found. Follow PCI-DSS incident response and remove data immediately.')


if __name__ == '__main__':
    main()
