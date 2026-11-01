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
confirmation_required = False
auth_error = None


def api(route):
    request = route.request
    calls.append((request.method, request.url))
    if failure:
        route.fulfill(status=503, json={'message': 'offline'})
        return
    if '/auth/v1/signup' in request.url or '/auth/v1/token' in request.url:
        if auth_error:
            route.fulfill(status=auth_error[0], json=auth_error[1])
            return
        if 'grant_type=refresh_token' not in request.url:
            assert request.post_data_json['email'] in ['a@example.com','b@example.com']
            if request.post_data_json['password'] != 'test-password-123':
                route.fulfill(status=400, json={'code': 400, 'error_code': 'invalid_credentials', 'msg': 'Invalid login credentials'})
                return
        if '/signup' in request.url and confirmation_required:
            route.fulfill(json={'user': {'id': 'unconfirmed'}})
            return
        other=request.post_data_json.get('email') == 'b@example.com'
        route.fulfill(json={'access_token': 'test-session-b' if other else 'test-session', 'refresh_token': 'test-refresh',
                            'expires_in': 3600, 'user': {'id': 'owner-b' if other else 'owner-a', 'email': 'b@example.com' if other else 'a@example.com'}})
    elif '/auth/v1/user' in request.url:
        if request.headers.get('authorization') in ['Bearer test-session','Bearer test-session-b']:
            other=request.headers['authorization'].endswith('-b')
            route.fulfill(json={'id': 'owner-b' if other else 'owner-a', 'email': 'b@example.com' if other else 'a@example.com'})
        else:
            route.fulfill(status=401, json={'code': 'bad_jwt'})
    elif '/auth/v1/logout' in request.url:
        route.fulfill(status=204)
    elif '/rest/v1/salas' in request.url:
        route.fulfill(json=[])
    elif '/rest/v1/fichas' in request.url:
        from urllib.parse import parse_qs, urlsplit
        query = parse_qs(urlsplit(request.url).query)
        if request.method == 'DELETE':
            rows.pop(query['id'][0][3:], None)
            route.fulfill(status=204)
        elif request.method == 'POST':
            row = {**request.post_data_json, 'revision': 1, 'owner_id':'owner-b' if request.headers['authorization'].endswith('-b') else 'owner-a'}
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
            owner='owner-b' if request.headers['authorization'].endswith('-b') else 'owner-a'
            route.fulfill(json=copy.deepcopy([row for row in selected if row['owner_id']==owner]))
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
    page.wait_for_selector('#authScreen')
    assert page.locator('#appScreen').is_hidden()
    return context, page, errors


def login(page, signup=False, email='a@example.com'):
    page.fill('#onlineEmail', email)
    page.fill('#onlinePassword', 'test-password-123')
    page.click('#authModeSignup' if signup else '#authModeLogin')
    if signup:
        page.fill('#authConfirmPassword', 'test-password-123')
    page.click('#authSubmit')
    page.wait_for_selector('#view-inicio:not([hidden])')
    assert page.locator('#view-ficha').is_hidden()
    assert page.locator('#homeTitle').inner_text() == 'O desconhecido\ndeixa marcas.'
    page.set_viewport_size({'width':1440,'height':1000})
    page.screenshot(path='/tmp/atsu-home-desktop.png',full_page=True)
    for width in [390,360]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path='/tmp/atsu-home-mobile.png',full_page=True)
    for section in ['ficha','dados','mesa','diario','regras','inicio']:
        page.locator(f'.app-nav [data-tab={section}]').click()
        assert page.locator(f'#view-{section}').is_visible()
        assert page.locator('.tabview:visible').count()==1
        assert page.locator(f'.app-nav [data-tab={section}]').get_attribute('aria-current')=='page'
    page.locator('#view-inicio .home-actions [data-tab=ficha]').click()
    page.wait_for_selector('#onlineUpload')
    page.set_viewport_size({'width':1280,'height':900})
    if not page.locator('#charName').count():
        assert page.locator('#picker button').count()==0
        page.click('#addChar')
        page.fill('#askInput','Investigador de teste')
        page.click('#askOk')
        page.wait_for_selector('#charName')
    assert page.locator('#onlinePassword').input_value() == ''
    assert 'test-password-123' not in page.evaluate('JSON.stringify(sessionStorage)')


def confirm(page):
    page.wait_for_selector('#askDialog[open]')
    page.click('#askOk')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    local, page, errors = open_page(browser, configured=False)
    assert page.locator('#authSubmit').is_disabled()
    assert page.locator('#appScreen').is_hidden()
    assert not errors
    local.close()

    first, a, errors_a = open_page(browser)
    # Both invalid credentials and unconfirmed signup must leave the visitor signed out.
    a.fill('#onlineEmail', 'a@example.com')
    a.fill('#onlinePassword', 'wrong-password')
    a.click('#authSubmit')
    a.wait_for_function("document.getElementById('authStatus').textContent.includes('incorretos')")
    assert a.locator('#appScreen').is_hidden()
    confirmation_required = True
    a.fill('#onlinePassword', 'test-password-123')
    a.click('#authModeSignup')
    a.fill('#authConfirmPassword', 'test-password-123')
    a.click('#authSubmit')
    a.wait_for_function("document.getElementById('authStatus').textContent.includes('Confirm email')")
    assert a.locator('#appScreen').is_hidden()
    assert not a.evaluate("sessionStorage.getItem('atsu.auth')")
    confirmation_required = False
    for http_status, payload, expected in [
        (400, {'code':400,'error_code':'signup_disabled','msg':'Signups not allowed for this instance'}, 'cadastro está desativado'),
        (400, {'code':400,'error_code':'email_provider_disabled','msg':'Email signups are disabled'}, 'acesso por e-mail está desativado'),
        (500, {'code':500,'error_code':'unexpected_failure','msg':'Error sending confirmation email'}, 'desative Confirm email'),
        (401, {'message':'Invalid API key'}, 'chave pública'),
        (500, {'code':'unexpected_failure'}, 'HTTP 500 / unexpected_failure'),
        (400, {'code':400,'msg':'Unsupported provider: email provider disabled'}, 'Unsupported provider: email provider disabled'),
        (400, {'code':400,'error_code':'validation_failed','msg':'A specific backend reason'}, 'A specific backend reason'),
        (400, {'code':400,'msg':'<img src=x onerror=alert(1)>'}, '<img src=x onerror=alert(1)>'),
    ]:
        auth_error=(http_status,payload)
        a.click('#authSubmit')
        a.wait_for_function("expected => document.getElementById('authStatus').textContent.includes(expected)",arg=expected)
        assert a.locator('#appScreen').is_hidden()
        assert a.locator('#authSubmit').is_enabled()
        assert a.locator('#authStatus img').count()==0
    auth_error=None
    login(a, signup=True)
    a.click('#onlineUpload')
    confirm(a)
    a.wait_for_selector('#onlineSheets button')
    a.get_by_role('button', name='Aumentar Eloquência', exact=True).click()
    a.wait_for_function("document.getElementById('onlineStatus').textContent === '● Ficha salva online'")
    # Wait for the debounced update, not the preceding upload success message.
    a.wait_for_timeout(1000)
    saved = next(iter(rows.values()))
    assert saved['character']['skills']['eloquencia'] == 1
    a.locator('.app-nav [data-tab=diario]').click()
    a.fill('#clues', 'Pista de teste preservada entre categorias')
    a.locator('.app-nav [data-tab=ficha]').click()
    a.locator('.app-nav [data-tab=diario]').click()
    assert a.locator('#clues').input_value()=='Pista de teste preservada entre categorias'
    a.locator('.app-nav [data-tab=ficha]').click()
    a.wait_for_timeout(1000)
    assert saved['character']['clues']=='Pista de teste preservada entre categorias'

    second, b, errors_b = open_page(browser)
    login(b)
    b.locator('#onlineSheets button').click()
    confirm(b)
    b.wait_for_function("document.getElementById('onlineStatus').textContent.startsWith('Ficha online aberta')")
    assert b.evaluate("JSON.parse(localStorage.getItem('atsu.jogadores.v1.owner-a')).characters[JSON.parse(localStorage.getItem('atsu.jogadores.v1.owner-a')).selected].skills.eloquencia") == 1
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
    b.wait_for_selector('#authSubmit')
    assert b.locator('#appScreen').is_hidden()
    count = len([call for call in calls if call[0] == 'PATCH'])
    b.wait_for_timeout(1000)
    assert len([call for call in calls if call[0] == 'PATCH']) == count
    login(b, email='b@example.com')
    b.wait_for_timeout(200)
    assert b.locator('#onlineSheets button').count()==0
    assert b.evaluate("JSON.parse(localStorage.getItem('atsu.jogadores.v1.owner-b')).characters[JSON.parse(localStorage.getItem('atsu.jogadores.v1.owner-b')).selected].skills.eloquencia")==0
    assert b.evaluate("JSON.parse(localStorage.getItem('atsu.jogadores.v1.owner-a')).characters[JSON.parse(localStorage.getItem('atsu.jogadores.v1.owner-a')).selected].skills.eloquencia")==2
    b.click('#onlineLogout')
    b.wait_for_selector('#authSubmit')
    b.set_viewport_size({'width': 390, 'height': 844})
    assert b.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors_a + errors_b, errors_a + errors_b
    # Valid session restoration, refresh and rejection of a forged stored session.
    a.reload()
    a.wait_for_selector('#appScreen:not([hidden])')
    assert a.locator('#authScreen').is_hidden()
    a.evaluate("const s=JSON.parse(sessionStorage.getItem('atsu.auth'));s.expires_at=0;sessionStorage.setItem('atsu.auth',JSON.stringify(s))")
    a.reload()
    a.wait_for_selector('#appScreen:not([hidden])')
    assert any('grant_type=refresh_token' in call[1] for call in calls)
    a.evaluate("const s=JSON.parse(sessionStorage.getItem('atsu.auth'));s.access_token='forged';sessionStorage.setItem('atsu.auth',JSON.stringify(s))")
    a.reload()
    a.wait_for_function("document.getElementById('authStatus').textContent.includes('sessão') && !sessionStorage.getItem('atsu.auth')")
    assert a.locator('#appScreen').is_hidden()
    # A new account's local namespace cannot read the preceding account's sheet.
    assert a.evaluate("localStorage.getItem('atsu.jogadores.v1.owner-a')")
    # Signup password mismatch never reaches the backend.
    a.click('#authModeSignup')
    a.fill('#onlineEmail', 'a@example.com')
    a.fill('#onlinePassword', 'test-password-123')
    a.fill('#authConfirmPassword', 'different-password')
    before=len(calls)
    a.click('#authSubmit')
    a.wait_for_function("document.getElementById('authStatus').textContent.includes('não coincidem')")
    assert len(calls)==before
    a.click('#authModeLogin')
    a.fill('#onlineEmail', '')
    a.fill('#onlinePassword', '')
    a.set_viewport_size({'width':390,'height':844})
    a.screenshot(path='/tmp/atsu-auth-mobile.png', full_page=True)
    a.set_viewport_size({'width':1440,'height':1000})
    a.screenshot(path='/tmp/atsu-auth-desktop.png', full_page=True)
    assert not errors_a + errors_b, errors_a + errors_b
    browser.close()
print('PASS: home, top navigation, category data preservation, login gate, session validation/refresh, account isolation, password signup/login, invalid password, confirmation required, upload, second browser load, autosave, conflicts, network retry, logout, mobile')
