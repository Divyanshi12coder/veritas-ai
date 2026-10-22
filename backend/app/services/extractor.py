"""Safe article extraction from a URL.

Security: only http(s), no credentials in the URL, every hop (including redirects) is DNS-resolved and rejected
if it points at loopback / private / link-local / reserved address space (SSRF protection), response size and
time are capped, and only HTML/text content types are accepted.
"""
from __future__ import annotations

import ipaddress
import json
import logging
import socket
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from ..config import get_settings

log = logging.getLogger(__name__)

USER_AGENT = "VeritraceBot/1.0 (+article analysis for research; respects robots by user-initiated fetch only)"
MAX_REDIRECTS = 4


class ExtractionError(Exception):
    """Raised with a message that is safe to show to the end user."""


def _is_public_ip(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    return not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved or addr.is_multicast or addr.is_unspecified)


def validate_public_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        raise ExtractionError("Only http:// and https:// URLs are supported.")
    if not parsed.hostname:
        raise ExtractionError("The URL does not contain a valid host name.")
    if parsed.username or parsed.password:
        raise ExtractionError("URLs containing credentials are not allowed.")
    if parsed.port not in (None, 80, 443, 8080, 8443):
        raise ExtractionError("Non-standard ports are not allowed.")
    try:
        infos = socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == "https" else 80), proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise ExtractionError("The host name could not be resolved.") from exc
    for info in infos:
        if not _is_public_ip(info[4][0]):
            raise ExtractionError("That address is not publicly routable and cannot be fetched.")
    return parsed.geturl()


def fetch_html(url: str, client: httpx.Client | None = None) -> tuple[str, str]:
    """Return (final_url, html). Follows redirects manually so each hop is validated."""
    s = get_settings()
    own = client is None
    client = client or httpx.Client(timeout=s.fetch_timeout_s, follow_redirects=False, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    try:
        current = validate_public_url(url)
        for _ in range(MAX_REDIRECTS + 1):
            try:
                with client.stream("GET", current) as resp:
                    if resp.status_code in (301, 302, 303, 307, 308) and resp.headers.get("location"):
                        current = validate_public_url(urljoin(current, resp.headers["location"]))
                        continue
                    if resp.status_code >= 400:
                        raise ExtractionError(f"The site responded with HTTP {resp.status_code}; it may block automated access.")
                    ctype = resp.headers.get("content-type", "").lower()
                    if "html" not in ctype and "text" not in ctype:
                        raise ExtractionError("The URL does not point to an HTML article.")
                    buf = bytearray()
                    for chunk in resp.iter_bytes():
                        buf.extend(chunk)
                        if len(buf) > s.fetch_max_bytes:
                            break
                    return current, buf.decode(resp.encoding or "utf-8", errors="replace")
            except httpx.TimeoutException as exc:
                raise ExtractionError("The site took too long to respond.") from exc
            except httpx.HTTPError as exc:
                raise ExtractionError("The page could not be downloaded.") from exc
        raise ExtractionError("Too many redirects.")
    finally:
        if own:
            client.close()


def _meta(soup: BeautifulSoup, *names: str) -> str | None:
    for n in names:
        tag = soup.find("meta", attrs={"property": n}) or soup.find("meta", attrs={"name": n})
        if tag and tag.get("content"):
            return tag["content"].strip()
    return None


def parse_article(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    ld: dict = {}
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        for node in data if isinstance(data, list) else [data]:
            if isinstance(node, dict) and str(node.get("@type", "")).lower().endswith("article"):
                ld = node
                break
    title = _meta(soup, "og:title", "twitter:title") or ld.get("headline") or (soup.title.string.strip() if soup.title and soup.title.string else None)
    author = _meta(soup, "author", "article:author") or None
    if not author and ld.get("author"):
        a = ld["author"]
        a = a[0] if isinstance(a, list) and a else a
        author = a.get("name") if isinstance(a, dict) else (a if isinstance(a, str) else None)
    published = _meta(soup, "article:published_time", "date", "pubdate") or ld.get("datePublished")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form", "noscript", "figure", "iframe"]):
        tag.decompose()
    container = soup.find("article") or soup.find(attrs={"itemprop": "articleBody"}) or soup.find("main") or soup.body or soup
    paras = [p.get_text(" ", strip=True) for p in container.find_all("p")]
    paras = [p for p in paras if len(p.split()) >= 6]
    body = "\n\n".join(paras)
    if len(body.split()) < 60:
        raise ExtractionError("Not enough article text could be extracted from that page (it may be paywalled, dynamic or not an article). Paste the text instead.")
    if not title:
        raise ExtractionError("Could not find an article headline on that page.")
    return {"title": title[:300], "body": body[:60_000], "author": (author or None) and author[:200],
            "published_at": (published or None) and str(published)[:64], "source_url": url}


def extract_from_url(url: str, client: httpx.Client | None = None) -> dict:
    final_url, html = fetch_html(url, client)
    return parse_article(html, final_url)
