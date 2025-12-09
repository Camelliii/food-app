"""爬取美食天下菜谱详情页 HTML，按递增序号 1.html、2.html... 保存."""
from __future__ import annotations

import logging
import re
import random
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Iterable, Optional
from urllib.parse import urljoin, urlsplit

import requests
from bs4 import BeautifulSoup

BASE_HOST = "https://home.meishichina.com"
BASE_TYPE_URL = "https://home.meishichina.com/recipe-type.html"
# 仅抓取"热菜"分类（递归翻页），避免保存分页页本身，只保存菜谱详情页
TARGET_CATEGORY_URL = "https://home.meishichina.com/recipe/recai/"

# 需要抓取的多个分类URL（每个分类抓取前100页）
TARGET_CATEGORY_URLS = [
    "https://home.meishichina.com/recipe/liangcai/",  # 凉菜
    "https://home.meishichina.com/recipe/tanggeng/",  # 汤羹
    "https://home.meishichina.com/recipe/zhushi/",    # 主食
    "https://home.meishichina.com/recipe/xiaochi/",   # 小吃
    "https://home.meishichina.com/recipe/xican/",     # 西餐
    "https://home.meishichina.com/recipe/hongbei/",   # 烘焙
    "https://home.meishichina.com/recipe/yinpin/",    # 饮品
]

OUTPUT_DIR = Path("/home/zhangpu/food-app/recipe_new")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SEEN_IDS_FILE = OUTPUT_DIR / "seen_ids.txt"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0 Safari/537.36"
)
RECIPE_LINK_RE = re.compile(r"https://home\.meishichina\.com/recipe-\d+\.html")
CATEGORY_LINK_RE = re.compile(
    r"https://home\.meishichina\.com/recipe/[^/]+/?$", re.IGNORECASE
)
# 匹配分类分页链接，如 https://home.meishichina.com/recipe/recai/page/5/
CATEGORY_PAGE_RE = re.compile(
    r"https://home\.meishichina\.com/recipe/[^/]+/page/(\d+)/?", re.IGNORECASE
)
_THREAD_LOCAL = threading.local()
MAX_WORKERS = 3  # 并发数，避免 429 可酌情调低或调高（3~6）
MAX_RETRIES = 3
BACKOFF_BASE = 1.5
BACKOFF_JITTER = 0.2
# 若需强制遍历固定页区间，配置起止页；为 None 时从第 1 页开始，按页面"下一页"解析
# 默认抓取每个分类的前100页
FORCE_START_PAGE: Optional[int] = 1
FORCE_END_PAGE: Optional[int] = 100


def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Referer": BASE_HOST,
            "Accept-Language": "zh-CN,zh;q=0.9",
        }
    )
    return session


def get_thread_session() -> requests.Session:
    """为并发任务提供线程私有 Session，避免跨线程复用。"""
    if not hasattr(_THREAD_LOCAL, "session"):
        _THREAD_LOCAL.session = make_session()
    return _THREAD_LOCAL.session


def discover_category_urls(session: requests.Session) -> list[str]:
    """从菜谱分类页自动发现分类入口（含“常见菜式”等分组）。"""
    html = fetch_html(session, BASE_TYPE_URL)
    if not html:
        logging.warning("分类页获取失败，返回空列表")
        return []
    soup = BeautifulSoup(html, "html.parser")
    urls: set[str] = set()
    for div in soup.find_all("div", class_="category_sub"):
        # 只抓取 href 满足 /recipe/<slug>/ 的入口
        for a in div.find_all("a", href=True):
            href = urljoin(BASE_HOST, a["href"])
            if href.startswith(f"{BASE_HOST}/recipe/") and CATEGORY_LINK_RE.fullmatch(href):
                urls.add(href)
    result = sorted(urls)
    logging.info("已发现分类入口 %s 个", len(result))
    return result


def fetch_html(session: requests.Session, url: str) -> Optional[str]:
    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
        if resp.url != url:
            logging.info("URL 重定向：%s -> %s", url, resp.url)
        resp.encoding = resp.apparent_encoding
        return resp.text
    except Exception as exc:  # noqa: BLE001
        logging.warning("获取失败 %s：%s", url, exc)
        return None


def fetch_with_retry(session: requests.Session, url: str) -> Optional[str]:
    for attempt in range(1, MAX_RETRIES + 1):
        html = fetch_html(session, url)
        if html:
            return html
        sleep_time = (BACKOFF_BASE ** (attempt - 1)) + random.uniform(0, BACKOFF_JITTER)
        time.sleep(sleep_time)
    return None


def extract_recipe_links(html: str, base_url: str) -> set[str]:
    soup = BeautifulSoup(html, "html.parser")
    links: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        if RECIPE_LINK_RE.fullmatch(href):
            links.add(href)
    return links


def find_next_page(html: str, base_url: str) -> Optional[str]:
    soup = BeautifulSoup(html, "html.parser")

    def _normalize(href: str) -> str:
        return urljoin(base_url, href)

    base_host = urlsplit(BASE_HOST).netloc

    # 优先使用 rel="next"
    link = soup.find("a", rel="next")
    if link and link.has_attr("href"):
        return _normalize(link["href"])

    # 其次使用“下一页”“下页”或 class 包含 next 的链接
    link = soup.find("a", string=lambda s: s and "下" in s)
    if link and link.has_attr("href"):
        return _normalize(link["href"])
    link = soup.find("a", class_=lambda c: c and "next" in c.lower())
    if link and link.has_attr("href"):
        return _normalize(link["href"])

    # 再尝试分页组件：当前页 a.now_page 的下一个 a
    now = soup.select_one(".ui-page-inner a.now_page")
    if now:
        nxt = now.find_next("a", href=True)
        if nxt:
            return _normalize(nxt["href"])

    # 回退：匹配同一分类下 /page/<num>/ 的链接，寻找大于当前页的最小页码
    path = urlsplit(base_url).path
    cur_page = 1
    if "/page/" in path:
        try:
            cur_page = int(path.rstrip("/").split("/page/")[-1])
        except ValueError:
            cur_page = 1
    # 允许 base_url 为 /recipe/recai/ 无页码
    base_prefix = path.split("/page/")[0].rstrip("/")  # /recipe/recai
    candidates: list[tuple[int, str]] = []
    for a in soup.find_all("a", href=True):
        href = _normalize(a["href"])
        # 过滤域名，避免跳到 www.meishichina.com
        if urlsplit(href).netloc != base_host:
            continue
        m = CATEGORY_PAGE_RE.fullmatch(href)
        if not m:
            continue
        try:
            p = int(m.group(1))
        except ValueError:
            continue
        # 仅保留同分类前缀
        if base_prefix and not urlsplit(href).path.startswith(base_prefix):
            continue
        if p > cur_page:
            candidates.append((p, href))
    if candidates:
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]

    logging.info("未找到下一页：%s", base_url)
    return None


def load_seen_ids() -> set[str]:
    if not SEEN_IDS_FILE.exists():
        return set()
    return {line.strip() for line in SEEN_IDS_FILE.read_text(encoding="utf-8").splitlines() if line.strip()}


def save_recipe_html(
    session: requests.Session,
    url: str,
    seen_ids: set[str],
    next_index: list[int],
    mutex: threading.Lock,
) -> bool:
    if not RECIPE_LINK_RE.fullmatch(url):
        return False
    recipe_id = url.rsplit("-", 1)[-1].split(".")[0]
    with mutex:
        if recipe_id in seen_ids:
            logging.info("跳过已抓取ID：%s", recipe_id)
            return False
        target = OUTPUT_DIR / f"{next_index[0]}.html"
        next_index[0] += 1  # 先占用序号，避免并发写同名
    html = fetch_with_retry(session, url)
    if not html:
        return False
    target.write_text(html, encoding="utf-8")
    logging.info("保存成功：%s (源ID %s)", target.name, recipe_id)
    with mutex:
        seen_ids.add(recipe_id)
        with SEEN_IDS_FILE.open("a", encoding="utf-8") as f:
            f.write(f"{recipe_id}\n")
    return True


def crawl_category(
    session: requests.Session,
    start_url: str,
    seen_ids: set[str],
    next_index: list[int],
    total_saved: list[int],
    delay: float = 1.0,
    start_page: int = 1,
    end_page: Optional[int] = None,
) -> None:
    mutex = threading.Lock()
    visited_pages: set[str] = set()
    # 归一化分类前缀（去掉末尾 /page/N）
    prefix = urlsplit(start_url).path.split("/page/")[0].rstrip("/")
    base_category_url = f"{BASE_HOST}{prefix}/"
    sequential_mode = start_page > 1 or end_page is not None
    page_num = max(start_page, 1)
    page_url: Optional[str] = (
        base_category_url if page_num == 1 else f"{base_category_url}page/{page_num}/"
    )

    while page_url and page_url not in visited_pages:
        visited_pages.add(page_url)
        logging.info("抓取分类页：%s", page_url)
        html = fetch_html(session, page_url)
        if not html:
            break
        recipe_links = extract_recipe_links(html, page_url)
        if recipe_links:
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                futures = []
                for link in sorted(recipe_links):
                    futures.append(
                        executor.submit(
                            save_recipe_html,
                            get_thread_session(),
                            link,
                            seen_ids,
                            next_index,
                            mutex,
                        )
                    )
                for fut in futures:
                    try:
                        if fut.result():
                            total_saved[0] += 1
                    except Exception as exc:  # noqa: BLE001
                        logging.warning("保存失败：%s", exc)
        time.sleep(max(delay, 0.1))
        if sequential_mode:
            page_num += 1
            if end_page and page_num > end_page:
                break
            page_url = f"{base_category_url}page/{page_num}/"
        else:
        next_page = find_next_page(html, page_url)
        if not next_page or next_page in visited_pages:
            break
        page_url = next_page
        time.sleep(max(delay, 0.1))


def crawl_all(
    categories: Iterable[str],
    start_page: int = 1,
    end_page: Optional[int] = None,
) -> int:
    session = make_session()
    # 如未显式传入，则自动发现分类
    if not categories:
        categories = discover_category_urls(session)
    else:
        categories = list(categories)
    seen_ids: set[str] = load_seen_ids()
    total_saved = [0]
    # 从已有文件中确定起始编号
    existing_nums = []
    for p in OUTPUT_DIR.glob("*.html"):
        if p.stem.isdigit():
            existing_nums.append(int(p.stem))
    start_idx = max(existing_nums) + 1 if existing_nums else 1
    next_index = [start_idx]
    for idx, url in enumerate(categories, 1):
        logging.info("=== 分类 %s/%s：%s ===", idx, len(categories), url)
        crawl_category(
            session,
            url,
            seen_ids,
            next_index,
            total_saved,
            start_page=start_page,
            end_page=end_page,
        )
    return total_saved[0]


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.info("开始抓取，输出目录：%s", OUTPUT_DIR.resolve())
    # 抓取多个分类，每个分类抓取前100页
    saved = crawl_all(
        TARGET_CATEGORY_URLS,
        start_page=FORCE_START_PAGE or 1,
        end_page=FORCE_END_PAGE,
    )
    logging.info("全部完成，本次新增 %s 条", saved)


if __name__ == "__main__":
    main()

