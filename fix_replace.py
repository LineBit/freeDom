path = 'C:/Users/Administrator/Desktop/抖音文案助手/index.html'
content = open(path, 'r', encoding='utf-8').read()

# 3. Remove key check - with correct single quotes
old1 = "var key=document.getElementById('apiKey').value.trim();if(!key||!key.startsWith('sk-')){tst('\u8bf7\u586b\u5199\u6709\u6548\u7684API Key');return;}"
content = content.replace(old1, '')
print('3:', 'OK' if old1 in content else 'NOT FOUND')

# 4. Remove localStorage check
old2 = "var uk='use_'+new Date().toISOString().slice(0,10);var uc=parseInt(localStorage.getItem(uk)||'0');if(uc>=DAILY_LIMIT){tst('\u4eca\u65e5\u514d\u8d39\u6b21\u6570\u5df2\u7528\u5b8c\uff0c\u52a0\u5fae\u4fe1 Zhanzhang091645 \u89e3\u9501\u65e0\u9650\u4f7f\u7528');return;}"
found = old2 in content
content = content.replace(old2, '')
print('4:', 'OK' if found else 'NOT FOUND')

# 7. Change error handling
old3 = "if(!r.ok){var e=await r.text();throw new Error('API\u9519\u8bef('+r.status+'): '+e);}"
new3 = "if(!r.ok){var e=await r.json();throw new Error(e.error||'\u8bf7\u6c42\u5931\u8d25('+r.status+')');}"
found3 = old3 in content
content = content.replace(old3, new3)
print('7:', 'OK' if found3 else 'NOT FOUND')

open(path, 'w', encoding='utf-8').write(content)
print('DONE')
