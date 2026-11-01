"""Fluxos de salas/mural com API simulada. Não acessa o projeto real."""
import json,re,copy,base64
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=re.sub(r'window\.ATSU_ONLINE = .*?;', "window.ATSU_ONLINE = {url:'https://example.supabase.co',key:'public-test'};", (ROOT/'site/index.html').read_text(),count=1,flags=re.S)
ROOM='10000000-0000-0000-0000-000000000001'
USERS={'master@example.com':'00000000-0000-0000-0000-000000000001','player@example.com':'00000000-0000-0000-0000-000000000002'}
room=None;members={};cards={};rolls=[];sheets={};files={};sent=[]
def api(route):
 global room
 r=route.request;p=urlsplit(r.url);q=parse_qs(p.query);path=p.path
 user=r.headers.get('authorization','').replace('Bearer ','')
 body=r.post_data_json if 'application/json' in r.headers.get('content-type','') and r.post_data_buffer else None
 sent.append((r.method,path,copy.deepcopy(body)))
 if path=='/auth/v1/token':
  uid=USERS[body['email']];route.fulfill(json={'access_token':uid,'refresh_token':'test','expires_in':3600,'user':{'id':uid,'email':body['email']}})
 elif path=='/auth/v1/logout':route.fulfill(status=204)
 elif path=='/rest/v1/fichas':
  if r.method=='GET':route.fulfill(json=copy.deepcopy(list(sheets.values())))
  elif r.method=='DELETE':sheets.pop(q['id'][0][3:],None);route.fulfill(status=204)
 elif path=='/rest/v1/salas':
  if r.method=='POST':room={'id':ROOM,'codigo':'ABCDEF123456','nome':body['nome'],'mestre_id':user};route.fulfill(json=[room])
  else:route.fulfill(json=[room] if room and (user in members or user==room['mestre_id']) else [])
 elif path=='/rest/v1/rpc/entrar_sala':
  if not room or body['p_codigo']!=room['codigo']:route.fulfill(status=400,json={'msg':'Sala não encontrada'});return
  members.setdefault(user,{'user_id':user,'apelido':body['p_apelido'],'ficha':None});route.fulfill(json=room)
 elif path=='/rest/v1/sala_membros':
  if r.method=='GET':route.fulfill(json=copy.deepcopy(list(members.values())))
  elif r.method=='PATCH':members[user].update(body);route.fulfill(status=204)
  elif r.method=='DELETE':members.pop(user,None);route.fulfill(status=204)
 elif path=='/rest/v1/sala_rolagens':
  if r.method=='POST':rolls.append({**body,'user_id':user,'total':body['a']+body['b']+body['nivel']+body['modificador']});route.fulfill(status=201,json={})
  else:route.fulfill(json=copy.deepcopy(rolls))
 elif path=='/rest/v1/sala_documentos':
  if r.method=='POST':card={**body,'autor_id':user,'revisao':1,'x':body.get('x',20),'y':body.get('y',20),'texto':body.get('texto','')};cards[card['id']]=card;route.fulfill(json=[card])
  elif r.method=='GET':route.fulfill(json=copy.deepcopy(list(cards.values())))
  elif r.method=='DELETE':cards.pop(q['id'][0][3:],None);route.fulfill(status=204)
  elif r.method=='PATCH':
   card=cards[q['id'][0][3:]]
   if card['revisao']!=int(q['revisao'][0][3:]):route.fulfill(json=[])
   else:card.update(body);route.fulfill(json=[copy.deepcopy(card)])
 elif '/storage/v1/object/' in path:
  if r.method=='POST':files[path.split('mesa-documentos/')[1]]=r.post_data_buffer;route.fulfill(json={'Key':path})
  elif r.method=='DELETE':
   for key in body['prefixes']:files.pop(key,None)
   route.fulfill(json=[])
  else:route.fulfill(content_type='application/pdf' if path.endswith('.pdf') else 'image/png',body=files[path.split('mesa-documentos/')[1]])
 else:raise AssertionError((r.method,path))
def page(browser,email):
 c=browser.new_context(accept_downloads=True);c.route('https://example.supabase.co/**',api);c.route('https://atsu.test/**',lambda r:r.fulfill(content_type='text/html',body=HTML));p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.goto('https://atsu.test/');p.fill('#onlineEmail',email);p.fill('#onlinePassword','test-password-123');p.click('#authSubmit');p.wait_for_selector('#appScreen:not([hidden])');return c,p
errors=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 cm,m=page(browser,'master@example.com');m.locator('.app-nav [data-tab=mesa]').click();m.fill('#mesaName','Sala de teste');m.locator('#mesaCreate button').click();m.wait_for_selector('#mesaInside:not([hidden])');assert m.locator('#mesaPrivate').is_visible()
 cp,p=page(browser,'player@example.com');p.locator('.app-nav [data-tab=ficha]').click();assert p.locator('#picker button').count()==0
 p.click('#addChar');p.fill('#askInput','Jogador de teste');p.click('#askOk');p.wait_for_selector('#charName');p.locator('.app-nav [data-tab=mesa]').click();p.fill('#mesaCode','ABCDEF123456');p.locator('#mesaJoin button').click();p.wait_for_selector('#mesaInside:not([hidden])');assert p.locator('#mesaPrivate').is_hidden()
 p.click('#mesaShare');m.wait_for_function("document.getElementById('mesaMembers').textContent.includes('Jogador de teste')")
 p.locator('.app-nav [data-tab=dados]').click();p.click('#rollBtn');m.wait_for_function("document.getElementById('mesaRolls').textContent.includes('Jogador de teste')");assert len(rolls)==1
 before=len(rolls);m.locator('#privateRollForm button[type=submit]').click();m.wait_for_selector('#privateHistory .hist');assert len(rolls)==before
 assert not any('privada' in path or 'segredo' in json.dumps(body) for _,path,body in sent if body)
 m.locator('[data-room-view=documentos]').click();m.fill('#boardTitle','Pista compartilhada');m.fill('#boardText','Texto que todos da sala podem editar');m.locator('#boardNote button').click();m.wait_for_selector('.board-card')
 p.locator('.app-nav [data-tab=mesa]').click();p.locator('[data-room-view=documentos]').click();p.wait_for_selector('.board-card');handle=p.locator('.board-handle');handle.focus();handle.press('ArrowRight');p.wait_for_timeout(500);assert next(iter(cards.values()))['x']==40
 m.click('#boardRefresh');m.wait_for_function("document.querySelector('.board-card').style.left==='40px'")
 # Arrastar pelo mouse também persiste a posição.
 handle=p.locator('.board-handle');box=handle.bounding_box();p.mouse.move(box['x']+30,box['y']+20);p.mouse.down();p.mouse.move(box['x']+110,box['y']+80);p.mouse.up();p.wait_for_timeout(500);assert next(iter(cards.values()))['x']==120
 p.locator('.board-card button',has_text='Editar').click();p.fill('#askInput','Título editado');p.click('#askOk');p.wait_for_selector('#askDialog[open]');p.fill('#askInput','Nota editada por outro participante');p.click('#askOk');p.wait_for_timeout(500);assert next(iter(cards.values()))['texto']=='Nota editada por outro participante'
 p.locator('#boardFile').set_input_files({'name':'documento.pdf','mimeType':'application/pdf','buffer':b'%PDF-1.4\nmock document'});p.wait_for_function("document.querySelectorAll('.board-card').length===2");assert len(files)==1
 with p.expect_download() as download:p.locator('.board-card button',has_text='Baixar arquivo').click()
 assert download.value.suggested_filename
 png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC')
 p.locator('#boardFile').set_input_files({'name':'imagem.png','mimeType':'image/png','buffer':png});p.wait_for_function("document.querySelector('.board-card img')?.naturalWidth===1");assert len(files)==2
 assert p.locator('.board-card',has_text='Título editado').locator('button',has_text='Remover').count()==0
 p.locator('.board-card',has_text='documento.pdf').locator('button',has_text='Remover').click();p.wait_for_selector('#askDialog[open]');p.click('#askOk');p.wait_for_timeout(500);assert len(files)==1
 # Limpeza de fichas exige backup antes da exclusão e deixa a conta vazia.
 sheets['40000000-0000-0000-0000-000000000001']={'id':'40000000-0000-0000-0000-000000000001','character':{'name':'Antiga','skills':{}},'revision':1}
 p.locator('.app-nav [data-tab=ficha]').click();p.click('#clearAllSheets');p.wait_for_selector('#askDialog[open]')
 with p.expect_download() as backup:p.click('#askOk')
 backup_data=json.loads(Path(backup.value.path()).read_text());assert backup_data['format']=='ATSU-backup-1' and len(backup_data['online'])==1
 p.wait_for_function("document.getElementById('onlineStatus').textContent.includes('removidas')");assert not sheets and p.locator('#picker button').count()==0;assert p.locator('#rollBtn').is_disabled();p.wait_for_timeout(500);assert members[USERS['player@example.com']]['ficha'] is None
 p.locator('#importFile').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(backup_data).encode()});p.wait_for_selector('#charName');assert p.locator('#picker button').count()>=1
 m.locator('[data-room-view=painel]').click();m.set_viewport_size({'width':390,'height':844});assert m.evaluate('document.documentElement.scrollWidth<=innerWidth');m.screenshot(path='/tmp/atsu-room-mobile.png',full_page=True)
 p.locator('.app-nav [data-tab=mesa]').click();p.locator('[data-room-view=documentos]').click();p.set_viewport_size({'width':390,'height':844});assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');p.screenshot(path='/tmp/atsu-board-mobile.png',full_page=True)
 assert not errors,errors
 browser.close()
print('PASS: criar/entrar, fichas e dados públicos, dados privados sem publicação, notas compartilhadas, teclado/arraste, upload/download PDF, limpeza com backup/restauração, mobile')
