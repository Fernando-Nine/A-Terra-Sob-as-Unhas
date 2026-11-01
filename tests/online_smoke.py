"""Browser smoke test with a simulated Supabase API; no external requests."""
import copy
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BUILT = (ROOT / 'site/index.html').read_text()
HTML = re.sub(r'window\.ATSU_ONLINE = .*?;', "window.ATSU_ONLINE = { url: '', key: '' };", BUILT, count=1, flags=re.S)
CONFIGURED = HTML.replace("{ url: '', key: '' }", "{ url: 'https://example.supabase.co', key: 'public-test' }")
rows = {}
calls = []
failure = False


def api(route):
    request = route.request
    calls.append((request.method, request.url))
    if failure:
        route.fulfill(status=503, json={'message': 'offline'})
        return
    if '/auth/v1/otp' in request.url:
        route.fulfill(json={})
    elif '/auth/v1/verify' in request.url or '/auth/v1/token' in request.url:
        route.fulfill(json={'access_token': 'test-session', 'refresh_token': 'test-refresh',
                            'expires_in': 3600, 'user': {'id': 'owner-a', 'email': 'a@example.com'}})
    elif '/auth/v1/logout' in request.url:
        route.fulfill(status=204)
    elif '/rest/v1/fichas' in request.url:
        from urllib.parse import parse_qs, urlsplit
        query = parse_qs(urlsplit(request.url).query)
        if request.method == 'POST':
            row = {**request.post_data_json, 'revision': 1}
            rows[row['id']] = row
            route.fulfill(json=[row])
        elif request.method == 'PATCH':
            row = rows[query['id'][0][3:]]
            if row['revision'] != int(query['revision'][0][3:]):
                route.fulfill(json=[])
            else:
                row.update(request.post_data_json)
                route.fulfill(json=[row])
        else:
            selected = [rows[query['id'][0][3:]]] if 'id' in query else list(rows.values())
            route.fulfill(json=copy.deepcopy(selected))
    else:
        raise AssertionError(request.url)


def open_page(browser, configured=True):
    context = browser.new_context()
    context.route('https://example.supabase.co/**', api)
    context.route('https://atsu.test/**', lambda route: route.fulfill(
        content_type='text/html', body=CONFIGURED if configured else HTML))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('https://atsu.test/site/')
    page.wait_for_selector('#charName')
    return context, page, errors


def login(page):
    page.fill('#onlineEmail', 'a@example.com')
    page.click('#sendCode')
    page.wait_for_selector('#onlineCode')
    page.fill('#onlineCode', '123456')
    page.locator('#verifyCode button').click()
    page.wait_for_selector('#onlineUpload')


def confirm(page):
    page.wait_for_selector('#askDialog[open]')
    page.click('#askOk')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    local, page, errors = open_page(browser, configured=False)
    assert page.locator('#onlineLogin').is_hidden()
    page.get_by_role('button', name='Aumentar Eloquência', exact=True).click()
    page.reload()
    assert page.evaluate("JSON.parse(localStorage.getItem('atsu.jogadores.v1')).characters.bispo.skills.eloquencia") == 1
    assert not errors
    local.close()

    first, a, errors_a = open_page(browser)
    login(a)
    a.click('#onlineUpload')
    confirm(a)
    a.wait_for_selector('#onlineSheets button')
    a.get_by_role('button', name='Aumentar Eloquência', exact=True).click()
    a.wait_for_function("document.getElementById('onlineStatus').textContent === '● Ficha salva online'")
    # Wait for the debounced update, not the preceding upload success message.
    a.wait_for_timeout(1000)
    saved = next(iter(rows.values()))
    assert saved['character']['skills']['eloquencia'] == 1

    second, b, errors_b = open_page(browser)
    login(b)
    b.locator('#onlineSheets button').click()
    confirm(b)
    b.wait_for_function("document.getElementById('onlineStatus').textContent.startsWith('Ficha online aberta')")
    assert b.evaluate("JSON.parse(localStorage.getItem('atsu.jogadores.v1')).characters[JSON.parse(localStorage.getItem('atsu.jogadores.v1')).selected].skills.eloquencia") == 1
    b.get_by_role('button', name='Aumentar Eloquência', exact=True).click()
    b.wait_for_timeout(1000)
    assert saved['character']['skills']['eloquencia'] == 2

    a.get_by_role('button', name='Aumentar Força', exact=True).click()
    a.wait_for_function("document.getElementById('onlineStatus').textContent.includes('outro aparelho')")
    assert saved['character']['skills']['forca'] == 0
    # Offline writes retain the local change and can be retried.
    failure = True
    b.get_by_role('button', name='Aumentar Força', exact=True).click()
    b.wait_for_function("document.getElementById('onlineStatus').textContent.includes('cópia local')")
    assert saved['character']['skills']['forca'] == 0
    failure = False
    b.click('#onlineRetry')
    b.wait_for_function("document.getElementById('onlineStatus').textContent === '● Ficha salva online'")
    assert saved['character']['skills']['forca'] == 1
    b.click('#onlineLogout')
    b.wait_for_selector('#sendCode')
    count = len([call for call in calls if call[0] == 'PATCH'])
    b.get_by_role('button', name='Aumentar Força', exact=True).click()
    b.wait_for_timeout(1000)
    assert len([call for call in calls if call[0] == 'PATCH']) == count
    b.set_viewport_size({'width': 390, 'height': 844})
    assert b.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors_a + errors_b, errors_a + errors_b
    browser.close()
print('PASS: offline, email login, upload, second browser load, autosave, conflicts, network retry, logout, mobile')
